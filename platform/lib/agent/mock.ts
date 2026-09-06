import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { RunModelTurnParams, RunModelTurnResult } from '@/lib/agent/model-types';

// Scripted responder used when AGENT_MOCK=1 or no ANTHROPIC_API_KEY is set, so
// the whole pipeline (tools, DB writes, SSE events, confirm gate) can be
// exercised without calling the real API. Keyed off the loop's message shape
// rather than a hand-rolled state machine: what matters is (a) the human's
// original text and (b) which tool the previous assistant turn called.

type LooseBlock = { type?: string; text?: string; name?: string };

function blocksOf(content: Anthropic.MessageParam['content']): LooseBlock[] {
  return Array.isArray(content) ? (content as unknown as LooseBlock[]) : [];
}

function isToolResultTurn(message: Anthropic.MessageParam): boolean {
  const blocks = blocksOf(message.content);
  return message.role === 'user' && blocks.length > 0 && blocks.every((b) => b.type === 'tool_result');
}

/** The human's own words for this turn — skips over tool_result carrier messages. */
function lastHumanText(messages: Anthropic.MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user' || isToolResultTurn(message)) continue;
    if (typeof message.content === 'string') return message.content;
    const text = blocksOf(message.content).find((b) => b.type === 'text');
    if (text?.text) return text.text;
  }
  return '';
}

/** Tool names the most recent assistant turn called, so we know what just resolved. */
function lastAssistantToolNames(messages: Anthropic.MessageParam[]): string[] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === 'assistant') {
      return blocksOf(message.content)
        .filter((b) => b.type === 'tool_use' && typeof b.name === 'string')
        .map((b) => b.name as string);
    }
  }
  return [];
}

function hasTrailingToolResult(messages: Anthropic.MessageParam[]): boolean {
  const last = messages[messages.length - 1];
  return !!last && isToolResultTurn(last);
}

interface PrimaryToolCall {
  name: string;
  input: unknown;
  /** overrides the default 'One moment.' lead-in text for this call */
  text?: string;
}

function pickPrimaryTool(text: string): PrimaryToolCall | null {
  const t = text.toLowerCase();
  if (t.includes('start a product') || t.includes('upload artwork')) {
    return {
      name: 'suggest_next',
      input: { chips: [{ label: 'Browse blanks', prompt: 'Show me blanks' }, { label: 'What can I do?', prompt: 'What can I do?' }] },
      text: 'The design flow lands next wave. For now you can browse blanks to see what you could print on.',
    };
  }
  if (t.includes('show my shop')) return { name: 'get_my_store', input: {} };
  if (t.includes('bulk order')) {
    return {
      name: 'suggest_next',
      input: { chips: [{ label: 'Browse blanks', prompt: 'Show me blanks' }, { label: 'Shop status', prompt: 'Show my shop' }] },
      text: "Bulk ordering isn't wired up yet. Here's what you can do in the meantime.",
    };
  }
  if (t.includes('inbox')) return { name: 'get_inbox', input: {} };
  if (t.includes('hoodie')) return { name: 'list_blanks', input: { type: 'Sweats & Hoodies' } };
  if (t.includes('sttu169')) return { name: 'get_blank', input: { code: 'STTU169' } };
  if (t.includes('publish')) return { name: 'publish_store', input: {} };
  if (t.includes('what can i do')) return { name: 'what_can_i_do', input: {} };
  if (t.includes('blank')) return { name: 'list_blanks', input: {} };
  return null;
}

function textBlock(text: string): Anthropic.TextBlock {
  return { type: 'text', text, citations: null };
}

function toolUseBlock(name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: 'tool_use', id: `mock_${randomUUID()}`, name, input, caller: { type: 'direct' } };
}

function usage(outputTokens: number): RunModelTurnResult['usage'] {
  return { inputTokens: 8, outputTokens };
}

const NEXT_CHIPS_AFTER_TOOL = [
  { label: 'Show me blanks', prompt: 'Show me blanks' },
  { label: 'What can I do?', prompt: 'What can I do?' },
];

export async function mockRunModelTurn(params: RunModelTurnParams): Promise<RunModelTurnResult> {
  const emit = (text: string) => params.onTextDelta?.(text);

  if (!hasTrailingToolResult(params.messages)) {
    const primary = pickPrimaryTool(lastHumanText(params.messages));
    if (!primary) {
      const text = "Here's a quick menu to get you moving.";
      emit(text);
      return {
        content: [
          textBlock(text),
          toolUseBlock('suggest_next', { chips: [{ label: 'What can I do?', prompt: 'What can I do?' }, { label: 'Browse blanks', prompt: 'Show me blanks' }] }),
        ],
        stopReason: 'tool_use',
        usage: usage(24),
      };
    }
    const text = primary.text ?? 'One moment.';
    emit(text);
    return { content: [textBlock(text), toolUseBlock(primary.name, primary.input)], stopReason: 'tool_use', usage: usage(16) };
  }

  const priorTools = lastAssistantToolNames(params.messages);
  if (priorTools.includes('suggest_next')) {
    const text = 'Anything else I can help with?';
    emit(text);
    return { content: [textBlock(text)], stopReason: 'end_turn', usage: usage(8) };
  }

  const text = 'Here you go.';
  emit(text);
  return {
    content: [textBlock(text), toolUseBlock('suggest_next', { chips: NEXT_CHIPS_AFTER_TOOL })],
    stopReason: 'tool_use',
    usage: usage(20),
  };
}
