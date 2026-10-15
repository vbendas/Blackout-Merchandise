import type Anthropic from '@anthropic-ai/sdk';
import { STUDIO_PROBLEM, type AgentEvent } from '@/lib/agent/protocol';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import type { ToolContext, ToolResult } from '@/lib/tools/types';
import { AGENT_MAX_TOKENS, AGENT_MODEL, MAX_LOOP_ITERATIONS, runModelTurn } from '@/lib/agent/model';
import { routeTurn, type RouteDecision } from '@/lib/agent/model-router';
import { buildSystemBlocks } from '@/lib/agent/system-prompt';
import { buildApiMessages, storedArtistText } from '@/lib/agent/history';
import { pickModelText } from '@/lib/agent/pick-server';
import type { ChatPick } from '@/lib/agent/pick';
import { canUseTool, getTool, toolsFor } from '@/lib/tools/registry';
import { toAnthropicTools } from '@/lib/tools/to-anthropic';
import { confirmLabels, toolProgressLabel } from '@/lib/tools/labels';
import {
  appendMessage,
  getMessageById,
  getProjectCard,
  latestMessage,
  setMessageUi,
  setProjectCard,
  type MessageRow,
  type StoredMessageContent,
} from '@/lib/services/conversations';
import { storeSummary } from '@/lib/services/stores';
import {
  claimPendingInvocation,
  completeInvocationByIdempotencyKey,
  declinePendingInvocation,
  findByIdempotencyKey,
  findByIdempotencyKeys,
  recordInvocation,
  type ToolInvocationRow,
} from '@/lib/services/tools-audit';
import { getDesignSummary, listDesignsForStore } from '@/lib/services/designs';

export type BaseAgentContext = Omit<ToolContext, 'idempotencyKey'>;
export type Emit = (event: AgentEvent) => void;

type LooseBlock = { type?: string; id?: string; text?: string };

function blockList(content: unknown): LooseBlock[] {
  return Array.isArray(content) ? (content as LooseBlock[]) : [];
}

/** tool_use ids of a stored assistant message, in block order. */
function toolUseIdsOf(row: MessageRow): string[] {
  const stored = row.content as unknown as { blocks?: unknown } | undefined;
  return blockList(stored?.blocks)
    .filter((b) => b.type === 'tool_use' && typeof b.id === 'string')
    .map((b) => b.id as string);
}

/** The tool_result a stored call gives the model when its turn is rebuilt
 * from the audit log (a confirm resumed, or a waiting step moved past). */
function storedResult(toolUseId: string, row: ToolInvocationRow | undefined): Anthropic.ToolResultBlockParam {
  if (!row) {
    return { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify({ error: 'This step did not run.' }), is_error: true };
  }
  if (row.status === 'error') {
    return { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify({ error: row.error ?? 'Tool failed' }), is_error: true };
  }
  if (row.status === 'pending_confirm') {
    return { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify({ declined: true, message: 'Not confirmed.' }) };
  }
  return { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify(row.output ?? null) };
}

const ALREADY_HANDLED = 'This step was already handled.';
/** a call outside the caller's tools: the model only ever sees its own list,
 * so this is a made-up or injected call, refused like an unknown one */
const NOT_AVAILABLE = 'That tool is not available to you.';
/** a waiting step whose tool the caller's access no longer covers */
const NO_ACCESS = "You don't have access to this step any more, so it did not run.";
const TOO_MANY_STEPS = 'That needed too many steps at once. Try a smaller request.';
/** what the model is told about a confirm-gated call it made alongside another */
const ONE_STEP_AT_A_TIME = 'Only one step can wait for approval at a time. Ask again after this one.';
/** what the model is told when the artist sent a new message instead of deciding */
const MOVED_ON = 'The artist sent a new message instead of confirming, so this step did not run.';

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

type PendingConfirm = { toolCallId: string; toolName: string; card: Extract<Card, { kind: 'confirm' }> };

type ExecOutcome =
  | { kind: 'done'; result: Anthropic.ToolResultBlockParam; ui?: ToolUi }
  | { kind: 'confirm'; pending: PendingConfirm };

/** Runs (or holds for confirmation) one tool call of the model's. Exported
 * for lib/agent/loop.test.ts. */
export async function executeToolCall(block: Anthropic.ToolUseBlock, base: BaseAgentContext, messageId: string, emit: Emit): Promise<ExecOutcome> {
  const idempotencyKey = block.id;
  const tool = getTool(block.name);

  if (tool && !canUseTool(base, tool)) {
    // Checked again here, not only when the tool list was built: nothing the
    // model sends runs past the caller's access. Recorded, so the owner can
    // see the attempt in the audit log.
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: block.input,
      idempotencyKey,
      status: 'error',
      error: 'forbidden',
    });
    emit({ type: 'tool_start', toolCallId: block.id, name: block.name, label: toolProgressLabel(block.name) });
    emit({ type: 'tool_end', toolCallId: block.id, name: block.name, ok: false });
    return {
      kind: 'done',
      result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: NOT_AVAILABLE }), is_error: true },
    };
  }

  if (!tool) {
    emit({ type: 'tool_start', toolCallId: block.id, name: block.name, label: toolProgressLabel(block.name) });
    emit({ type: 'tool_end', toolCallId: block.id, name: block.name, ok: false });
    return {
      kind: 'done',
      result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: `Unknown tool: ${block.name}` }), is_error: true },
    };
  }

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

  if (tool.confirm || tool.confirmWhen?.(parsed.data)) {
    // A step that would be refused whatever the artist says never asks them to confirm: the refusal is its
    // outcome, shown like a tool that ran. A look that fails changes nothing: the confirm card shows as usual,
    // and the tool decides again when it is confirmed.
    let refused: ToolResult | null = null;
    try {
      refused = tool.preflight ? await tool.preflight({ ...base, idempotencyKey }, parsed.data) : null;
    } catch {
      refused = null;
    }
    if (refused) {
      await recordInvocation({
        conversationId: base.conversationId,
        messageId,
        toolName: tool.name,
        input: parsed.data,
        idempotencyKey,
        status: 'ok',
        output: refused.data,
        durationMs: 0,
      });
      emit({ type: 'tool_end', toolCallId: block.id, name: tool.name, ok: true, ui: refused.ui });
      return {
        kind: 'done',
        result: { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(refused.data ?? null) },
        ui: refused.ui,
      };
    }
    await recordInvocation({
      conversationId: base.conversationId,
      messageId,
      toolName: tool.name,
      input: parsed.data,
      idempotencyKey,
      status: 'pending_confirm',
    });
    const summary = tool.summarize ? tool.summarize(parsed.data) : 'Confirm this step.';
    const labels = confirmLabels(tool.name);
    const card: Extract<Card, { kind: 'confirm' }> = {
      id: `confirm_${idempotencyKey}`,
      kind: 'confirm',
      toolCallId: idempotencyKey,
      toolName: tool.name,
      summary,
      approveLabel: labels.approve,
      cancelLabel: labels.cancel,
    };
    return { kind: 'confirm', pending: { toolCallId: idempotencyKey, toolName: tool.name, card } };
  }

  // The progress line shows only for a call that runs now: a confirm-gated
  // one waits for the artist (its card says so), an invalid one never starts.
  emit({ type: 'tool_start', toolCallId: block.id, name: tool.name, label: toolProgressLabel(tool.name) });
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
  const [store, projectCard, recentDesigns] = await Promise.all([
    base.storeId ? storeSummary(base.storeId) : Promise.resolve(null),
    getProjectCard(base.conversationId),
    base.storeId ? listDesignsForStore(base.storeId, 1) : Promise.resolve([]),
  ]);
  return buildSystemBlocks({
    role: base.role,
    permissions: base.permissions ?? null,
    store,
    project: projectCard ? { kind: projectCard.kind, refId: projectCard.refId, state: projectCard.state } : null,
    locale: base.locale,
    recentDesignId: recentDesigns[0]?.designId ?? null,
  });
}

/** The core model<->tools loop, shared by a fresh turn and a confirm-resume.
 * One model serves the whole turn so its prompt cache stays warm across
 * iterations. When the client goes away (`signal`: Stop, a closed tab, a
 * dropped connection) the turn ends at its next safe point: a reply being
 * written keeps the words the artist saw and runs none of its tool calls,
 * tools already running finish and are stored, and no further model call
 * starts. Either way the stored history stays whole. */
async function runIterations(
  base: BaseAgentContext,
  initialMessages: Anthropic.MessageParam[],
  emit: Emit,
  model: string,
  signal?: AbortSignal,
): Promise<void> {
  let messages = initialMessages;
  // Only the tools this caller's role and access allow (lib/tools/registry.ts).
  const tools = toolsFor(base);
  const anthropicTools = toAnthropicTools(tools);

  let turnHadText = false;
  let iterationHadText = false;
  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration += 1) {
    if (signal?.aborted) return;
    iterationHadText = false;
    // What the artist has seen of this iteration's reply, kept if they stop it.
    let seenText = '';
    const system = await currentSystemBlocks(base);

    const turn = await runModelTurn({
      model,
      system,
      messages,
      tools: anthropicTools,
      maxTokens: AGENT_MAX_TOKENS,
      signal,
      onTextDelta: (text) => {
        if (!signal?.aborted) seenText += text;
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

    if (signal?.aborted) {
      // Stopped while the model was writing: keep only the words already
      // shown (no thinking, no tool calls, so nothing is left unanswered).
      const kept = seenText.trim();
      if (kept) await appendMessage(base.conversationId, 'assistant', { blocks: [{ type: 'text', text: kept }], ui: null, model }, tokens);
      return;
    }

    if (turn.stopReason === 'refusal') {
      const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null, model }, tokens);
      emit({ type: 'cards', cards: [{ id: `refusal_${assistantRow.id}`, kind: 'notice', tone: 'error', text: "I can't help with that request." }] });
      emit({ type: 'message_end', messageId: assistantRow.id, stopReason: 'refusal' });
      return;
    }

    const toolUseBlocks = turn.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null, model }, tokens);
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
    const assistantRow = await appendMessage(base.conversationId, 'assistant', { blocks, ui: null, model }, tokens);

    const readOnlyBlocks = toolUseBlocks.filter((b) => getTool(b.name)?.readOnly);
    const otherBlocks = toolUseBlocks.filter((b) => !getTool(b.name)?.readOnly);

    const results = new Map<string, Anthropic.ToolResultBlockParam>();
    const mergedUi: MergedUi = { cards: [], next: [], project: undefined };
    const confirms: PendingConfirm[] = [];

    const handleOutcome = (block: Anthropic.ToolUseBlock, outcome: ExecOutcome) => {
      if (outcome.kind === 'confirm') {
        confirms.push(outcome.pending);
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
      const outcome = await executeToolCall(block, base, assistantRow.id, emit);
      handleOutcome(block, outcome);
    }

    await flushUi(base, mergedUi, emit);

    if (confirms.length > 0) {
      // One step waits for the artist; any other gated call in the same turn
      // is declined so the resumed turn can answer every call.
      const [waiting, ...others] = confirms;
      for (const other of others) {
        await declinePendingInvocation(other.toolCallId, base.conversationId, { output: { declined: true, message: ONE_STEP_AT_A_TIME } });
      }
      // Stored with the turn, so a reload shows the card (and its buttons)
      // until the step is decided; the history derives its outcome.
      await setMessageUi(assistantRow, toToolUi({ ...mergedUi, cards: [...mergedUi.cards, waiting.card] }));
      emit({ type: 'confirm_required', toolCallId: waiting.toolCallId, name: waiting.toolName, card: waiting.card });
      emit({ type: 'message_end', messageId: assistantRow.id, stopReason: 'tool_use' });
      return;
    }

    const orderedResults = toolUseBlocks.map((b) => results.get(b.id)).filter((r): r is Anthropic.ToolResultBlockParam => !!r);
    await appendMessage(base.conversationId, 'tool', { blocks: orderedResults, ui: toToolUi(mergedUi) });

    messages = await buildApiMessages(base.conversationId);
  }

  emit({ type: 'error', message: TOO_MANY_STEPS });
}

/** Rebuilds the tool results of a stored assistant turn from the audit log,
 * in block order, with `overrides` for calls decided just now. */
async function storedResultsFor(
  row: MessageRow,
  overrides: Map<string, Anthropic.ToolResultBlockParam> = new Map(),
): Promise<Anthropic.ToolResultBlockParam[]> {
  const ids = toolUseIdsOf(row);
  const invocations = await findByIdempotencyKeys(ids.filter((id) => !overrides.has(id)));
  const byKey = new Map(invocations.map((inv) => [inv.idempotencyKey, inv]));
  return ids.map((id) => overrides.get(id) ?? storedResult(id, byKey.get(id)));
}

/** A new message moves past a step still waiting for approval: the waiting
 * call is declined and its turn gets its tool results before the message is
 * stored, so the model's history stays whole. Only the newest turn can be
 * waiting; an older one was settled when the message after it came in. */
async function settleWaitingStep(base: BaseAgentContext): Promise<void> {
  const last = await latestMessage(base.conversationId);
  if (!last || last.role !== 'assistant') return;
  const ids = toolUseIdsOf(last);
  if (ids.length === 0) return;
  const invocations = await findByIdempotencyKeys(ids);
  const waiting = invocations.filter((inv) => inv.status === 'pending_confirm' && !inv.confirmedAt && inv.idempotencyKey);
  if (waiting.length === 0) return;
  for (const inv of waiting) {
    await declinePendingInvocation(inv.idempotencyKey as string, base.conversationId, { output: { declined: true, message: MOVED_ON } });
  }
  await appendMessage(base.conversationId, 'tool', { blocks: await storedResultsFor(last), ui: null });
}

/** Try again: the artist's last stored message, when it is this same text
 * and nothing was stored after it, so the retry answers it instead of
 * storing it twice. */
async function retriedMessage(conversationId: string, text: string): Promise<MessageRow | null> {
  const last = await latestMessage(conversationId);
  if (!last || last.role !== 'user') return null;
  const stored = last.content as unknown as StoredMessageContent | undefined;
  return storedArtistText(stored) === text ? last : null;
}

export interface StartAgentTurnParams {
  base: BaseAgentContext;
  userText: string;
  attachments?: { url: string; kind: 'image' | 'file'; name?: string; designId?: string }[];
  /** Try again after a failed reply (see AgentRequest.retry) */
  retry?: boolean;
  /** a catalogue pick sent with the message, already checked by the route (lib/agent/pick-server.ts) */
  pick?: ChatPick;
  emit: Emit;
  /** fires when the client goes away; the turn ends at its next safe point */
  signal?: AbortSignal;
}

export async function startAgentTurn(params: StartAgentTurnParams): Promise<void> {
  const { base, emit, signal } = params;

  await settleWaitingStep(base);

  let userMessage = params.retry ? await retriedMessage(base.conversationId, params.userText) : null;
  if (!userMessage) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    for (const attachment of params.attachments ?? []) {
      if (attachment.kind === 'image') blocks.push({ type: 'image', source: { type: 'url', url: attachment.url } });
      if (attachment.designId) {
        const summary = await getDesignSummary(attachment.designId);
        // The id comes from the request, so only the caller's own shop's
        // design is described: another shop's would leak its size and state.
        if (summary && base.storeId && summary.storeId === base.storeId) {
          const dims = summary.widthPx && summary.heightPx ? `${summary.widthPx}×${summary.heightPx}` : 'unknown size';
          blocks.push({ type: 'text', text: `Attached design ${attachment.designId} (${dims}, ${summary.readiness}).` });
        }
      }
    }
    blocks.push({ type: 'text', text: params.userText });
    // The pick's note follows the artist's own words: exact codes for the model, while the transcript shows the words (history.ts).
    if (params.pick) blocks.push({ type: 'text', text: pickModelText(params.pick) });
    userMessage = await appendMessage(base.conversationId, 'user', {
      blocks,
      ui: null,
      ...(params.pick ? { pick: params.pick } : {}),
    });
  }
  emit({ type: 'message_start', messageId: userMessage.id, conversationId: base.conversationId });

  const projectCard = await getProjectCard(base.conversationId);
  // A pick starts a consequential flow (products or a quote), so it always gets the main model, as a confirmed action does.
  const route: RouteDecision = params.pick
    ? { model: AGENT_MODEL, tier: 'main', reason: 'catalogue pick' }
    : routeTurn({
        userText: params.userText,
        hasAttachments: (params.attachments?.length ?? 0) > 0,
        projectKind: projectCard?.kind ?? null,
      });

  const messages = await buildApiMessages(base.conversationId);
  await runIterations(base, messages, emit, route.model, signal);
}

/** A waiting step the caller may no longer run (access changed after the
 * card was shown): declined as theirs, its turn's tool results stored so the
 * history stays whole, and the turn ends there without another model call. */
async function refuseWaitingStep(base: BaseAgentContext, messageId: string, toolCallId: string, toolName: string, emit: Emit): Promise<void> {
  const output = { declined: true, message: NO_ACCESS };
  const declined = await declinePendingInvocation(toolCallId, base.conversationId, { output, confirmedBy: base.userId });
  if (!declined) {
    emit({ type: 'error', message: ALREADY_HANDLED });
    return;
  }
  const resultBlock: Anthropic.ToolResultBlockParam = { type: 'tool_result', tool_use_id: toolCallId, content: JSON.stringify(output) };
  const assistantMessage = await getMessageById(messageId);
  const orderedResults = assistantMessage
    ? await storedResultsFor(assistantMessage, new Map([[toolCallId, resultBlock]]))
    : [resultBlock];
  await appendMessage(base.conversationId, 'tool', { blocks: orderedResults, ui: null });
  emit({ type: 'tool_end', toolCallId, name: toolName, ok: false });
  emit({ type: 'error', message: NO_ACCESS });
}

export interface ResumeAgentTurnParams {
  base: BaseAgentContext;
  toolCallId: string;
  approve: boolean;
  emit: Emit;
  /** fires when the client goes away; the turn ends at its next safe point */
  signal?: AbortSignal;
}

export async function resumeAgentTurn(params: ResumeAgentTurnParams): Promise<void> {
  const { base, toolCallId, approve, emit, signal } = params;

  const invocation = await findByIdempotencyKey(toolCallId);
  if (!invocation || invocation.conversationId !== base.conversationId || !invocation.messageId) {
    emit({ type: 'error', message: ALREADY_HANDLED });
    return;
  }
  const tool = getTool(invocation.toolName);
  if (!tool) {
    console.error(`[agent] confirm for unknown tool ${invocation.toolName}`);
    emit({ type: 'error', message: STUDIO_PROBLEM });
    return;
  }

  if (approve && !canUseTool(base, tool)) {
    await refuseWaitingStep(base, invocation.messageId, toolCallId, tool.name, emit);
    return;
  }

  const startedAt = Date.now();
  // Taking the decision is one guarded update, so the step runs at most once
  // however many times it is clicked.
  const claimed = approve
    ? await claimPendingInvocation(toolCallId, base.conversationId, base.userId)
    : await declinePendingInvocation(toolCallId, base.conversationId, { output: { declined: true }, confirmedBy: base.userId });
  if (!claimed) {
    emit({ type: 'error', message: ALREADY_HANDLED });
    return;
  }

  emit({ type: 'message_start', messageId: invocation.messageId, conversationId: base.conversationId });

  let resultBlock: Anthropic.ToolResultBlockParam;
  const mergedUi: MergedUi = { cards: [], next: [], project: undefined };

  if (!approve) {
    emit({ type: 'tool_end', toolCallId, name: tool.name, ok: false });
    resultBlock = { type: 'tool_result', tool_use_id: toolCallId, content: JSON.stringify({ declined: true, message: 'User declined.' }) };
  } else {
    emit({ type: 'tool_start', toolCallId, name: tool.name, label: toolProgressLabel(tool.name) });
    try {
      const ctx: ToolContext = { ...base, idempotencyKey: toolCallId };
      const result = await tool.run(ctx, invocation.input);
      await completeInvocationByIdempotencyKey(toolCallId, {
        status: 'ok',
        output: result.data,
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
  const orderedResults = assistantMessage
    ? await storedResultsFor(assistantMessage, new Map([[toolCallId, resultBlock]]))
    : [resultBlock];
  await appendMessage(base.conversationId, 'tool', { blocks: orderedResults, ui: toToolUi(mergedUi) });

  // A confirmed action continues a consequential flow: always the main model.
  const messages = await buildApiMessages(base.conversationId);
  await runIterations(base, messages, emit, AGENT_MODEL, signal);
}
