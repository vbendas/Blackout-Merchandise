import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type Anthropic from '@anthropic-ai/sdk';
import type { ToolUi } from '@/lib/ui-cards/schemas';

export type Conversation = typeof schema.conversations.$inferSelect;
export type MessageRow = typeof schema.messages.$inferSelect;
export type MessageRole = 'user' | 'assistant' | 'tool';

/** Shape stored in `messages.content` — Anthropic blocks the model sees, plus
 * the parallel ui the client renders. `blocks` is what history.ts replays to
 * the API; `ui` is never sent to the model. */
export interface StoredMessageContent {
  blocks: Anthropic.ContentBlockParam[];
  ui: ToolUi | null;
  /** model that wrote an assistant message (for cost and quality review) */
  model?: string;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const rows = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId)).limit(1);
  return rows[0] ?? null;
}

export async function getMessageById(messageId: string): Promise<MessageRow | null> {
  const rows = await db.select().from(schema.messages).where(eq(schema.messages.id, messageId)).limit(1);
  return rows[0] ?? null;
}

async function hasMessages(conversationId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .limit(1);
  return rows.length > 0;
}

/** A blank conversation for a new Studio session. Reuses the user's latest
 * conversation when nothing was ever said in it, so reloading the Studio
 * doesn't pile up empty rows. */
export async function startFreshConversation(userId: string, role: 'artist' | 'admin'): Promise<Conversation> {
  const rows = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, userId))
    .orderBy(desc(schema.conversations.createdAt))
    .limit(1);
  if (rows[0] && !(await hasMessages(rows[0].id))) return rows[0];

  const [created] = await db
    .insert(schema.conversations)
    .values({ userId, roleAtTime: role, title: null, summary: null })
    .returning();
  return created;
}

/** The user's most recent conversation that has messages, other than
 * `excludeId` — what the Studio home offers to continue. */
export async function latestConversationWithMessages(userId: string, excludeId: string): Promise<Conversation | null> {
  const rows = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.userId, userId), ne(schema.conversations.id, excludeId)))
    .orderBy(desc(schema.conversations.createdAt))
    .limit(5);
  for (const row of rows) {
    if (await hasMessages(row.id)) return row;
  }
  return null;
}

/** The user's most recent conversation, or a freshly created one. */
export async function getOrCreateConversation(userId: string, role: 'artist' | 'admin'): Promise<Conversation> {
  const rows = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, userId))
    .orderBy(desc(schema.conversations.createdAt))
    .limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db
    .insert(schema.conversations)
    .values({ userId, roleAtTime: role, title: null, summary: null })
    .returning();
  return created;
}

export async function appendMessage(
  conversationId: string,
  role: MessageRole,
  content: StoredMessageContent,
  tokens?: { in?: number; out?: number },
): Promise<MessageRow> {
  const [row] = await db
    .insert(schema.messages)
    .values({
      conversationId,
      role,
      content: content as unknown as object,
      tokensIn: tokens?.in ?? null,
      tokensOut: tokens?.out ?? null,
    })
    .returning();

  await db
    .update(schema.conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.conversations.id, conversationId));

  if (role === 'user') {
    const title = titleFromContent(content);
    if (title) {
      await db
        .update(schema.conversations)
        .set({ title })
        .where(and(eq(schema.conversations.id, conversationId), isNull(schema.conversations.title)));
    }
  }

  return row;
}

/** First 60 characters of the first text block, cut at a word boundary,
 * without trailing punctuation. Null when there is no usable text. */
export function titleFromContent(content: StoredMessageContent): string | null {
  const text = (content.blocks ?? [])
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  let out = text;
  if (out.length > 60) {
    const cut = out.slice(0, 60);
    const space = cut.lastIndexOf(' ');
    // Mid-word cut only when the text is a single long token.
    out = out[60] === ' ' ? cut : space > 0 ? cut.slice(0, space) : cut;
  }
  out = out.replace(/[\s.,;:!?\-–—…'"]+$/u, '').trim();
  return out || null;
}

/** Replaces the ui stored with a message (what the client renders); the
 * model's blocks stay exactly as they were. */
export async function setMessageUi(row: MessageRow, ui: ToolUi | null): Promise<void> {
  const content: StoredMessageContent = { ...(row.content as unknown as StoredMessageContent), ui };
  await db
    .update(schema.messages)
    .set({ content: content as unknown as object })
    .where(eq(schema.messages.id, row.id));
}

export interface MessagePage {
  /** oldest first */
  rows: MessageRow[];
  /** older messages exist before the first row */
  hasMore: boolean;
}

/** Up to `limit` messages, oldest first: the latest ones, or with `beforeId`
 * the ones just before that message. Keyset on (created_at, id) compared in
 * Postgres, so pages never repeat or skip a message, even two written in the
 * same millisecond. A cursor from another conversation yields nothing. */
export async function loadHistoryPage(
  conversationId: string,
  { limit = 40, beforeId }: { limit?: number; beforeId?: string } = {},
): Promise<MessagePage> {
  const m = schema.messages;
  const where = beforeId
    ? and(
        eq(m.conversationId, conversationId),
        sql`(${m.createdAt}, ${m.id}) < (select ${m.createdAt}, ${m.id} from ${m} where ${m.id} = ${beforeId} and ${m.conversationId} = ${conversationId})`,
      )
    : eq(m.conversationId, conversationId);
  const rows = await db
    .select()
    .from(m)
    .where(where)
    .orderBy(desc(m.createdAt), desc(m.id))
    .limit(limit + 1);
  return { rows: rows.slice(0, limit).reverse(), hasMore: rows.length > limit };
}

/** Most recent `limit` messages for this conversation, oldest first. */
export async function loadHistory(conversationId: string, limit = 40): Promise<MessageRow[]> {
  return (await loadHistoryPage(conversationId, { limit })).rows;
}

/** The conversation's newest message, or null when nothing was said yet. */
export async function latestMessage(conversationId: string): Promise<MessageRow | null> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(desc(schema.messages.createdAt), desc(schema.messages.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function setSummary(conversationId: string, summary: string): Promise<void> {
  await db.update(schema.conversations).set({ summary }).where(eq(schema.conversations.id, conversationId));
}

export type ProjectCard = typeof schema.projectCards.$inferSelect;

export async function getProjectCard(conversationId: string): Promise<ProjectCard | null> {
  const rows = await db
    .select()
    .from(schema.projectCards)
    .where(eq(schema.projectCards.conversationId, conversationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function setProjectCard(
  conversationId: string,
  kind: 'onboarding' | 'product' | 'bulk_order',
  refId: string | null,
  state: Record<string, unknown>,
): Promise<ProjectCard> {
  const [row] = await db
    .insert(schema.projectCards)
    .values({ conversationId, kind, refId, state })
    .onConflictDoUpdate({
      target: schema.projectCards.conversationId,
      set: { kind, refId, state, updatedAt: new Date() },
    })
    .returning();
  return row;
}
