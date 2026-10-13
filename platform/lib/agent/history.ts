import type Anthropic from '@anthropic-ai/sdk';
import { getConversation, loadHistory, type MessagePage, type MessageRow } from '@/lib/services/conversations';
import type { StoredMessageContent } from '@/lib/services/conversations';
import type { HistoryMessage } from '@/lib/agent/protocol';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import { storedPick } from '@/lib/agent/pick-server';

function toMessageParam(row: MessageRow): Anthropic.MessageParam | null {
  const content = row.content as unknown as StoredMessageContent;
  if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) return null;

  // Tool results are stored as their own 'tool' rows but must be replayed to
  // the API as a `user` turn (tool_result blocks only exist in user content).
  // Only `blocks` go to the model: a stored `pick` reaches it as the note among
  // them, and the API never sees the pick object itself.
  const role = row.role === 'tool' ? 'user' : row.role;
  return { role, content: content.blocks };
}

function toolUseIds(message: Anthropic.MessageParam): string[] {
  if (!Array.isArray(message.content)) return [];
  return message.content.filter((block): block is Anthropic.ToolUseBlockParam => block.type === 'tool_use').map((block) => block.id);
}

function isToolResult(block: Anthropic.ContentBlockParam): block is Anthropic.ToolResultBlockParam {
  return block.type === 'tool_result';
}

function unfinished(toolUseId: string): Anthropic.ToolResultBlockParam {
  return { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify({ error: 'This step did not finish.' }), is_error: true };
}

/**
 * Keeps a replayed history valid for the API whatever state a turn was left
 * in (a reply stopped part way, a dropped connection, a crash between a tool
 * call and its result, a step still waiting when the window was cut): every
 * tool call is answered in the message right after it, a tool result only
 * answers a call in the message right before it, tool results come first in
 * their message, and the history opens on a user message. A whole history
 * passes through unchanged; consecutive user messages are fine (the API
 * joins them into one turn).
 */
export function pairToolCalls(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  let open: string[] = [];
  for (const message of messages) {
    if (message.role === 'assistant') {
      if (open.length > 0) out.push({ role: 'user', content: open.map(unfinished) });
      out.push(message);
      open = toolUseIds(message);
      continue;
    }
    if (!Array.isArray(message.content)) {
      if (open.length > 0) out.push({ role: 'user', content: open.map(unfinished) });
      open = [];
      out.push(message);
      continue;
    }
    const waiting = new Set(open);
    const answers = message.content.filter((block) => isToolResult(block) && waiting.has(block.tool_use_id));
    const answered = new Set(answers.map((block) => (block as Anthropic.ToolResultBlockParam).tool_use_id));
    const rest = message.content.filter((block) => !isToolResult(block));
    const content = [...answers, ...open.filter((id) => !answered.has(id)).map(unfinished), ...rest];
    open = [];
    if (content.length > 0) out.push({ role: 'user', content });
  }
  // Never end on unanswered calls (an assistant-last history reads as a prefill).
  if (open.length > 0) out.push({ role: 'user', content: open.map(unfinished) });
  const firstUser = out.findIndex((message) => message.role === 'user');
  if (firstUser <= 0) return firstUser === 0 ? out : [];
  // Drop what comes before it and pair again: results that answered a
  // dropped call have nothing to answer any more.
  return pairToolCalls(out.slice(firstUser));
}

/**
 * Builds the `Anthropic.MessageParam[]` for a turn: the rolling summary (if
 * any) as a leading synthetic user/assistant pair, then the last `limit`
 * stored messages replayed as API content blocks. The window opens on a
 * message from the artist, so it never starts on a tool result whose call
 * fell outside it.
 */
export async function buildApiMessages(conversationId: string, limit = 40): Promise<Anthropic.MessageParam[]> {
  const [conversation, rows] = await Promise.all([getConversation(conversationId), loadHistory(conversationId, limit)]);

  const messages: Anthropic.MessageParam[] = [];

  if (conversation?.summary) {
    messages.push({
      role: 'user',
      content: `<data>Summary of this conversation so far:\n${conversation.summary}</data>`,
    });
    messages.push({ role: 'assistant', content: 'Understood — I have the earlier context.' });
  }

  const firstFromArtist = rows.findIndex((row) => row.role === 'user');
  const window = firstFromArtist > 0 ? rows.slice(firstFromArtist) : rows;
  const replayed: Anthropic.MessageParam[] = [];
  for (const row of window) {
    const param = toMessageParam(row);
    if (param) replayed.push(param);
  }

  return pairToolCalls([...messages, ...replayed]);
}

// --- The transcript the chat shows (GET /api/agent/history) ---

type TranscriptBlock = { type?: string; text?: string; source?: { type?: string; url?: string } };

function blocksOf(blocks: unknown): TranscriptBlock[] {
  return Array.isArray(blocks) ? (blocks as TranscriptBlock[]) : [];
}

function extractText(blocks: unknown): string {
  return blocksOf(blocks)
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
    .trim();
}

/** The text the artist typed, as stored (untrimmed). A message sent with a pick
 * has the pick's note for the model after it, so the artist's words are the
 * text block before that note. An earlier text block is the Studio's note about
 * an attached design, which is for the model only. The retry check reads it too. */
export function storedArtistText(content: { blocks?: unknown; pick?: unknown } | null | undefined): string | undefined {
  const texts = blocksOf(content?.blocks).filter((b) => b.type === 'text' && typeof b.text === 'string');
  const own = content?.pick ? texts[texts.length - 2] : texts[texts.length - 1];
  return own?.text;
}

function attachmentsOf(blocks: unknown): NonNullable<HistoryMessage['attachments']> {
  return blocksOf(blocks)
    .filter((b) => b.type === 'image' && b.source?.type === 'url' && typeof b.source.url === 'string')
    .map((b) => ({ url: b.source?.url as string, kind: 'image' as const }));
}

function hasToolUse(blocks: unknown): boolean {
  return blocksOf(blocks).some((b) => b.type === 'tool_use');
}

/** A page opens on a message from the artist (unless it reaches the start of
 * the conversation), so a turn is never split across two pages. */
export function openOnArtist(page: MessagePage): { rows: MessageRow[]; earlierCursor: string | null } {
  let rows = page.rows;
  if (page.hasMore) {
    const first = rows.findIndex((row) => row.role === 'user');
    if (first > 0) rows = rows.slice(first);
  }
  return { rows, earlierCursor: page.hasMore && rows.length > 0 ? rows[0].id : null };
}

/** Stored rows as the transcript the client shows: the artist's messages, and
 * the assistant turns that say something, each with the cards produced since
 * the previous one shown. Cards no shown turn picked up (a turn that stopped
 * or still waits on a step) show on their own. */
export function transcriptOf(rows: MessageRow[]): { messages: HistoryMessage[]; chips: Chip[] } {
  const messages: HistoryMessage[] = [];
  let pendingCards: Card[] = [];
  let pendingId: string | null = null;
  let latestChips: Chip[] = [];

  const flushCards = () => {
    if (pendingCards.length > 0 && pendingId) messages.push({ id: pendingId, role: 'assistant', text: '', cards: pendingCards });
    pendingCards = [];
    pendingId = null;
  };
  const holdCards = (row: MessageRow, cards: Card[] | undefined) => {
    if (!cards?.length) return;
    pendingCards.push(...cards);
    if (!pendingId) pendingId = row.id;
  };

  for (const row of rows) {
    const content = row.content as unknown as { blocks?: unknown; ui?: ToolUi | null; pick?: unknown } | null;
    const ui = content?.ui ?? null;
    if (ui?.next) latestChips = ui.next;

    if (row.role === 'tool') {
      holdCards(row, ui?.cards);
      continue;
    }

    if (row.role === 'user') {
      flushCards();
      const attachments = attachmentsOf(content?.blocks);
      messages.push({
        id: row.id,
        role: 'user',
        text: (storedArtistText(content) ?? '').trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        pick: storedPick(content?.pick),
      });
      continue;
    }

    // Assistant turn: its own cards (a confirm card waiting on the artist)
    // join the ones from tool results. Only turns that carry visible text
    // show (a pure tool_use turn has nothing for the transcript to say).
    holdCards(row, ui?.cards);
    const text = extractText(content?.blocks);
    if (text || !hasToolUse(content?.blocks)) {
      messages.push({ id: row.id, role: 'assistant', text, cards: pendingCards.length ? pendingCards : undefined });
      pendingCards = [];
      pendingId = null;
    }
  }
  flushCards();

  return { messages, chips: latestChips };
}
