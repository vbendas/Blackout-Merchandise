import type Anthropic from '@anthropic-ai/sdk';
import { getConversation, loadHistory, type MessageRow } from '@/lib/services/conversations';
import type { StoredMessageContent } from '@/lib/services/conversations';

function toMessageParam(row: MessageRow): Anthropic.MessageParam | null {
  const content = row.content as unknown as StoredMessageContent;
  if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) return null;

  // Tool results are stored as their own 'tool' rows but must be replayed to
  // the API as a `user` turn (tool_result blocks only exist in user content).
  const role = row.role === 'tool' ? 'user' : row.role;
  return { role, content: content.blocks };
}

/**
 * Builds the `Anthropic.MessageParam[]` for a turn: the rolling summary (if
 * any) as a leading synthetic user/assistant pair, then the last `limit`
 * stored messages replayed as API content blocks.
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

  for (const row of rows) {
    const param = toMessageParam(row);
    if (param) messages.push(param);
  }

  return messages;
}
