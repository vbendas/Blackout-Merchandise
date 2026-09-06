import { desc, eq } from 'drizzle-orm';
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
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const rows = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId)).limit(1);
  return rows[0] ?? null;
}

export async function getMessageById(messageId: string): Promise<MessageRow | null> {
  const rows = await db.select().from(schema.messages).where(eq(schema.messages.id, messageId)).limit(1);
  return rows[0] ?? null;
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

  return row;
}

/** Most recent `limit` messages for this conversation, oldest first. */
export async function loadHistory(conversationId: string, limit = 40): Promise<MessageRow[]> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);
  return rows.reverse();
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
