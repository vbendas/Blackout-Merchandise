import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { RunModelTurnParams, RunModelTurnResult } from '@/lib/agent/model-types';
import { EXTRA_MOCK_RULES, type MockRule } from '@/lib/agent/mock-extra';

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

/** The human's own words for this turn — skips over tool_result carrier messages.
 * Joins every text block (not just the first): loop.ts prepends an 'Attached
 * design <id> (...)' note ahead of the user's own typed text when the turn
 * carries an attachment, and rules need to see both. */
function lastHumanText(messages: Anthropic.MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user' || isToolResultTurn(message)) continue;
    if (typeof message.content === 'string') return message.content;
    const texts = blocksOf(message.content)
      .filter((b) => b.type === 'text' && !!b.text)
      .map((b) => b.text as string);
    if (texts.length > 0) return texts.join(' ');
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

/** Pulls a design id out of the loop's own attachment note — loop.ts appends
 * 'Attached design <id> (<width>x<height>, <readiness>)' to the user turn
 * whenever the request carries an attachment, which is the only place a
 * design id can come from in free text (the mock has no UI state to read). */
function resolveContextDesignId(text: string): string {
  return text.match(/Attached design\s+(\S+)/i)?.[1] ?? '';
}

/** Design-tool rules (upload/analyze/generate/clean) merged after
 * EXTRA_MOCK_RULES — 'use design ...' is deliberately left to EXTRA's
 * create_product rule rather than duplicated here. */
const DESIGN_MOCK_RULES: MockRule[] = [
  {
    match: /upload/i,
    text: 'Opening the upload picker...',
    tool: 'upload_design',
    input: {},
  },
  {
    match: /analyze\s+(\S+)/i,
    text: 'Checking print readiness...',
    tool: 'analyze_design',
    buildInput: (match, text) => {
      const captured = match?.[1]?.replace(/[.,!?]+$/, '') ?? '';
      const generic = new Set(['it', 'this', 'that', 'design', 'the']);
      return { designId: generic.has(captured.toLowerCase()) ? resolveContextDesignId(text) : captured };
    },
  },
  {
    match: /remove (the )?background/i,
    text: 'Removing the background...',
    tool: 'clean_design',
    buildInput: (_match, text) => ({ designId: resolveContextDesignId(text), ops: ['remove_bg'] }),
  },
  {
    match: /generate|from scratch/i,
    text: 'Generating a design...',
    tool: 'generate_design',
    buildInput: (_match, text) => ({ brief: text }),
  },
];

/** Checks rules in order; a string `match` is a case-insensitive substring
 * test (no capture group), a RegExp `match` is tested against the raw text
 * and its groups handed to `buildInput`. Rules with no `tool` (text-only) are
 * skipped here — nothing currently needs a tool-less rule mid-table. */
function matchMockRules(rules: MockRule[], text: string): PrimaryToolCall | null {
  for (const rule of rules) {
    if (!rule.tool) continue;
    if (typeof rule.match === 'string') {
      if (!text.toLowerCase().includes(rule.match.toLowerCase())) continue;
      const input = rule.buildInput ? rule.buildInput(null, text) : (rule.input ?? {});
      return { name: rule.tool, input, text: rule.text };
    }
    const match = text.match(rule.match);
    if (!match) continue;
    const input = rule.buildInput ? rule.buildInput(match, text) : (rule.input ?? {});
    return { name: rule.tool, input, text: rule.text };
  }
  return null;
}

function pickPrimaryTool(text: string): PrimaryToolCall | null {
  const t = text.toLowerCase();
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
    const humanText = lastHumanText(params.messages);
    const primary = matchMockRules(EXTRA_MOCK_RULES, humanText) ?? matchMockRules(DESIGN_MOCK_RULES, humanText) ?? pickPrimaryTool(humanText);
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
