import type Anthropic from '@anthropic-ai/sdk';
import type { AgentEvent } from '@/lib/agent/protocol';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import type { ToolContext } from '@/lib/tools/types';
import { AGENT_MAX_TOKENS, AGENT_MODEL, MAX_LOOP_ITERATIONS, runModelTurn } from '@/lib/agent/model';
import { buildSystemBlocks } from '@/lib/agent/system-prompt';
import { buildApiMessages } from '@/lib/agent/history';
import { toolsForRole } from '@/lib/tools/registry';
import { toAnthropicTools } from '@/lib/tools/to-anthropic';
import {
  appendMessage,
  getMessageById,
  getProjectCard,
  setProjectCard,
} from '@/lib/services/conversations';
import { storeSummary } from '@/lib/services/stores';
import { completeInvocationByIdempotencyKey, findByIdempotencyKey, recordInvocation } from '@/lib/services/tools-audit';
import { getTool } from '@/lib/tools/registry';

export type BaseAgentContext = Omit<ToolContext, 'idempotencyKey'>;
export type Emit = (event: AgentEvent) => void;

type LooseBlock = { type?: string; id?: string };

function blockList(content: unknown): LooseBlock[] {
  return Array.isArray(content) ? (content as LooseBlock[]) : [];
}

function toolLabel(description: string): string {
  const firstSentence = description.split(/(?<=\.)\s/)[0] ?? description;
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
}

interface MergedUi {
  cards: Card[];
  next: Chip[];
  project: ToolUi['project'] | undefined;
}

function mergeUi(acc: MergedUi, ui: ToolUi | undefined): void {
  if (!ui) return;
  if (ui.cards) acc.cards.push(...ui.cards);
  if (ui.next) acc.next.push(...ui.next);
  if (ui.project) acc.project = ui.project;
}

/** Collapses the accumulated ui back into the ToolUi shape for storage (or
 * null when nothing was produced), so the history endpoint can replay cards. */
function toToolUi(ui: MergedUi): ToolUi | null {
  if (ui.cards.length === 0 && ui.next.length === 0 && !ui.project) return null;
  return {
    cards: ui.cards.length ? ui.cards : undefined,
    next: ui.next.length ? ui.next : undefined,
    project: ui.project,
  };
}

async function flushUi(base: BaseAgentContext, ui: MergedUi, emit: Emit): Promise<void> {
  if (ui.cards.length) emit({ type: 'cards', cards: ui.cards });
  if (ui.next.length) emit({ type: 'chips', chips: ui.next });
  if (ui.project) {
    await setProjectCard(base.conversationId, ui.project.kind, ui.project.refId ?? null, ui.project.state as Record<string, unknown>);
    emit({ type: 'project', project: ui.project });
  }
}

type ExecOutcome =
  | { kind: 'done'; result: Anthropic.ToolResultBlockParam; ui?: ToolUi }
  | { kind: 'confirm'; pending: { toolCallId: string; toolName: string; card: Extract<Card, { kind: 'confirm' }> } };

async function executeToolCall(block: Anthropic.ToolUseBlock, base: BaseAgentContext, messageId: string, emit: Emit): Promise<ExecOutcome> {
  const idempotencyKey = block.id;
  const tool = getTool(block.name);

  if (!tool) {
    emit({ type: 'tool_start', toolCallId: block.id, name: block.name, label: block.name });
    emit({ type: 'tool_end', toolCallId: block.id, name: block.name, ok: false });
    return {
      kind: 'done',
      result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: `Unknown tool: ${block.name}` }), is_error: true },
    };
  }

  emit({ type: 'tool_start', toolCallId: block.id, name: tool.name, label: toolLabel(tool.description) });

  const parsed = tool.input.safeParse(block.input);
  if (!parsed.success) {
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: block.input,
      idempotencyKey,
      status: 'error',
      error: 'invalid_input',
    });
    emit({ type: 'tool_end', toolCallId: block.id, name: tool.name, ok: false });
    return {
      kind: 'done',
      result: {
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify({ error: 'Invalid tool input', issues: parsed.error.issues.map((i) => i.message) }),
        is_error: true,
      },
    };
  }

  if (tool.confirm) {
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: parsed.data,
      idempotencyKey,
      status: 'pending_confirm',
    });
    const summary = tool.summarize ? tool.summarize(parsed.data) : `Run ${tool.name}`;
    const card: Extract<Card, { kind: 'confirm' }> = {
      id: `confirm_${idempotencyKey}`,
      kind: 'confirm',
      toolCallId: idempotencyKey,
      toolName: tool.name,
      summary,
    };
    return { kind: 'confirm', pending: { toolCallId: idempotencyKey, toolName: tool.name, card } };
  }

  const startedAt = Date.now();
  try {
    const ctx: ToolContext = { ...base, idempotencyKey };
    const result = await tool.run(ctx, parsed.data);
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: parsed.data,
      idempotencyKey,
      status: 'ok',
      output: result.data,
      durationMs: Date.now() - startedAt,
    });
    emit({ type: 'tool_end', toolCallId: block.id, name: tool.name, ok: true, ui: result.ui });
    return {
      kind: 'done',
      result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result.data ?? null) },
      ui: result.ui,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool failed';
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: parsed.data,
      idempotencyKey,
      status: 'error',
      error: message,
      durationMs: Date.now() - startedAt,
    });
    emit({ type: 'tool_end', toolCallId: block.id, name: tool.name, ok: false });
    return {
      kind: 'done',
      result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: message }), is_error: true },
    };
  }
}

async function currentSystemBlocks(base: BaseAgentContext): Promise<Anthropic.TextBlockParam[]> {
  const [store, projectCard] = await Promise.all([
    base.storeId ? storeSummary(base.storeId) : Promise.resolve(null),
    getProjectCard(base.conversationId),
  ]);
  return buildSystemBlocks({
    role: base.role,
    store,
    project: projectCard ? { kind: projectCard.kind, refId: projectCard.refId, state: projectCard.state } : null,
    locale: base.locale,
  });
}

/** The core model<->tools loop, shared by a fresh turn and a confirm-resume. */
async function runIterations(base: BaseAgentContext, initialMessages: Anthropic.MessageParam[], emit: Emit): Promise<void> {
  let messages = initialMessages;
  const tools = toolsForRole(base.role);
  const anthropicTools = toAnthropicTools(tools);

  let turnHadText = false;
  let iterationHadText = false;
  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration += 1) {
    iterationHadText = false;
    const system = await currentSystemBlocks(base);

    const turn = await runModelTurn({
      model: AGENT_MODEL,
      system,
      messages,
      tools: anthropicTools,
      maxTokens: AGENT_MAX_TOKENS,
      onTextDelta: (text) => {
        // Text from a later iteration (after tool results) starts a new
        // paragraph instead of gluing onto the previous sentence.
        if (turnHadText && !iterationHadText) emit({ type: 'text_delta', text: '\n\n' });
        iterationHadText = true;
        turnHadText = true;
        emit({ type: 'text_delta', text });
      },
    });

    const blocks = turn.content as unknown as Anthropic.ContentBlockParam[];
    const tokens = { in: turn.usage.inputTokens, out: turn.usage.outputTokens };

    if (turn.stopReason === 'refusal') {
      const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null }, tokens);
      emit({ type: 'cards', cards: [{ id: `refusal_${assistantRow.id}`, kind: 'notice', tone: 'error', text: "I can't help with that request." }] });
      emit({ type: 'message_end', messageId: assistantRow.id, stopReason: 'refusal' });
      return;
    }

    const toolUseBlocks = turn.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null }, tokens);
      if (turn.stopReason === 'max_tokens') {
        emit({
          type: 'cards',
          cards: [{ id: `maxtok_${assistantRow.id}`, kind: 'notice', tone: 'warning', text: 'That answer ran long and got cut off — ask me to continue if you need more.' }],
        });
      }
      emit({ type: 'message_end', messageId: assistantRow.id, stopReason: turn.stopReason ?? 'end_turn' });
      return;
    }

    // Persist the assistant turn first so tool_invocations can reference its id.
    const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null }, tokens);

    const readOnlyBlocks = toolUseBlocks.filter((b) => getTool(b.name)?.readOnly);
    const otherBlocks = toolUseBlocks.filter((b) => !getTool(b.name)?.readOnly);

    const results = new Map<string, Anthropic.ToolResultBlockParam>();
    const mergedUi: MergedUi = { cards: [], next: [], project: undefined };
    let pendingConfirm: Extract<ExecOutcome, { kind: 'confirm' }>['pending'] | null = null;

    const handleOutcome = (block: Anthropic.ToolUseBlock, outcome: ExecOutcome) => {
      if (outcome.kind === 'confirm') {
        pendingConfirm = outcome.pending;
      } else {
        results.set(block.id, outcome.result);
        mergeUi(mergedUi, outcome.ui);
      }
    };

    await Promise.all(
      readOnlyBlocks.map(async (block) => {
        const outcome = await executeToolCall(block, base, assistantRow.id, emit);
        handleOutcome(block, outcome);
      }),
    );
    for (const block of otherBlocks) {
      // eslint-disable-next-line no-await-in-loop
      const outcome = await executeToolCall(block, base, assistantRow.id, emit);
      handleOutcome(block, outcome);
    }

    await flushUi(base, mergedUi, emit);

    if (pendingConfirm) {
      const confirmPending = pendingConfirm as Extract<ExecOutcome, { kind: 'confirm' }>['pending'];
      emit({ type: 'confirm_required', toolCallId: confirmPending.toolCallId, name: confirmPending.toolName, card: confirmPending.card });
      emit({ type: 'message_end', messageId: assistantRow.id, stopReason: 'tool_use' });
      return;
    }

    const orderedResults = toolUseBlocks.map((b) => results.get(b.id)).filter((r): r is Anthropic.ToolResultBlockParam => !!r);
    await appendMessage(base.conversationId, 'tool', { blocks: orderedResults, ui: toToolUi(mergedUi) });

    messages = await buildApiMessages(base.conversationId);
  }

  emit({ type: 'error', message: 'The assistant needed too many steps to finish this turn.' });
}

export interface StartAgentTurnParams {
  base: BaseAgentContext;
  userText: string;
  attachments?: { url: string; kind: 'image' | 'file'; name?: string }[];
  emit: Emit;
}

export async function startAgentTurn(params: StartAgentTurnParams): Promise<void> {
  const { base, emit } = params;
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const attachment of params.attachments ?? []) {
    if (attachment.kind === 'image') blocks.push({ type: 'image', source: { type: 'url', url: attachment.url } });
  }
  blocks.push({ type: 'text', text: params.userText });

  const userMessage = await appendMessage(base.conversationId, 'user', { blocks, ui: null });
  emit({ type: 'message_start', messageId: userMessage.id, conversationId: base.conversationId });

  const messages = await buildApiMessages(base.conversationId);
  await runIterations(base, messages, emit);
}

export interface ResumeAgentTurnParams {
  base: BaseAgentContext;
  toolCallId: string;
  approve: boolean;
  emit: Emit;
}

export async function resumeAgentTurn(params: ResumeAgentTurnParams): Promise<void> {
  const { base, toolCallId, approve, emit } = params;

  const invocation = await findByIdempotencyKey(toolCallId);
  if (!invocation || invocation.conversationId !== base.conversationId || invocation.status !== 'pending_confirm' || !invocation.messageId) {
    emit({ type: 'error', message: 'This confirmation is no longer pending.' });
    return;
  }
  const tool = getTool(invocation.toolName);
  if (!tool) {
    emit({ type: 'error', message: `Unknown tool ${invocation.toolName}.` });
    return;
  }

  emit({ type: 'message_start', messageId: invocation.messageId, conversationId: base.conversationId });
  emit({ type: 'tool_start', toolCallId, name: tool.name, label: toolLabel(tool.description) });

  let resultBlock: Anthropic.ToolResultBlockParam;
  const mergedUi: MergedUi = { cards: [], next: [], project: undefined };
  const startedAt = Date.now();

  if (!approve) {
    await completeInvocationByIdempotencyKey(toolCallId, {
      status: 'cancelled',
      output: { declined: true },
      confirmedBy: base.userId,
      confirmedAt: new Date(),
      durationMs: Date.now() - startedAt,
    });
    emit({ type: 'tool_end', toolCallId, name: tool.name, ok: false });
    resultBlock = { type: 'tool_result', tool_use_id: toolCallId, content: JSON.stringify({ declined: true, message: 'User declined.' }) };
  } else {
    try {
      const ctx: ToolContext = { ...base, idempotencyKey: toolCallId };
      const result = await tool.run(ctx, invocation.input);
      await completeInvocationByIdempotencyKey(toolCallId, {
        status: 'ok',
        output: result.data,
        confirmedBy: base.userId,
        confirmedAt: new Date(),
        durationMs: Date.now() - startedAt,
      });
      mergeUi(mergedUi, result.ui);
      emit({ type: 'tool_end', toolCallId, name: tool.name, ok: true, ui: result.ui });
      resultBlock = { type: 'tool_result', tool_use_id: toolCallId, content: JSON.stringify(result.data ?? null) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool failed';
      await completeInvocationByIdempotencyKey(toolCallId, {
        status: 'error',
        error: message,
        confirmedBy: base.userId,
        confirmedAt: new Date(),
        durationMs: Date.now() - startedAt,
      });
      emit({ type: 'tool_end', toolCallId, name: tool.name, ok: false });
      resultBlock = { type: 'tool_result', tool_use_id: toolCallId, content: JSON.stringify({ error: message }), is_error: true };
    }
  }

  await flushUi(base, mergedUi, emit);

  // Every other tool_use in that same assistant turn (parallel read-only
  // calls alongside the confirm-gated one) already ran and was held back —
  // rebuild the full tool_result set in the original block order.
  const assistantMessage = await getMessageById(invocation.messageId);
  const storedContent = assistantMessage?.content as unknown as { blocks?: LooseBlock[] } | undefined;
  const assistantBlocks = blockList(storedContent?.blocks);
  const toolUseIdsInOrder = assistantBlocks.filter((b) => b.type === 'tool_use' && typeof b.id === 'string').map((b) => b.id as string);

  const resultsById = new Map<string, Anthropic.ToolResultBlockParam>();
  resultsById.set(toolCallId, resultBlock);
  const siblingIds = toolUseIdsInOrder.filter((id) => id !== toolCallId);
  const siblings = await Promise.all(siblingIds.map((id) => findByIdempotencyKey(id)));
  for (const sibling of siblings) {
    if (!sibling || !sibling.idempotencyKey) continue;
    resultsById.set(sibling.idempotencyKey, {
      type: 'tool_result',
      tool_use_id: sibling.idempotencyKey,
      content: JSON.stringify(sibling.output ?? null),
      is_error: sibling.status === 'error' ? true : undefined,
    });
  }

  const orderedResults = toolUseIdsInOrder.map((id) => resultsById.get(id)).filter((r): r is Anthropic.ToolResultBlockParam => !!r);
  await appendMessage(base.conversationId, 'tool', { blocks: orderedResults, ui: toToolUi(mergedUi) });

  const messages = await buildApiMessages(base.conversationId);
  await runIterations(base, messages, emit);
}
