import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ServiceResult } from '@/lib/services/products';
import { titleFromContent, type StoredMessageContent } from '@/lib/services/conversations';
import type { StudioCollection, StudioSession, StudioSidebarData } from '@/lib/studio/types';

// Studio sidebar: the user's sessions (conversations with messages) and the
// store collections they can be filed under. Every operation checks that the
// conversation belongs to the user and the collection to the user's store.

export const SESSION_TITLE_MAX = 80;
export const COLLECTION_NAME_MAX = 60;
const SESSION_LIMIT = 200;
const UNTITLED = 'Untitled session';

type SessionRow = typeof schema.conversations.$inferSelect;

function toSession(row: SessionRow): StudioSession {
  const activity = row.lastMessageAt ?? row.createdAt;
  return {
    id: row.id,
    title: row.title?.trim() || UNTITLED,
    collectionId: row.collectionId ?? null,
    lastActivityAt: activity.toISOString(),
  };
}

async function productCount(collectionId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.collectionId, collectionId));
  return row?.n ?? 0;
}

async function ownedSession(userId: string, sessionId: string): Promise<SessionRow | null> {
  const rows = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, sessionId), eq(schema.conversations.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function ownedCollection(storeId: string, collectionId: string) {
  const rows = await db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.storeId, storeId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSidebar(userId: string, storeId: string | null): Promise<StudioSidebarData> {
  const sessionRows = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.userId, userId),
        sql`exists (select 1 from ${schema.messages} where ${schema.messages.conversationId} = ${schema.conversations.id})`,
      ),
    )
    .orderBy(desc(sql`coalesce(${schema.conversations.lastMessageAt}, ${schema.conversations.createdAt})`))
    .limit(SESSION_LIMIT);

  let collections: StudioCollection[] = [];
  if (storeId) {
    const rows = await db
      .select({
        id: schema.collections.id,
        name: schema.collections.name,
        productCount: sql<number>`count(${schema.products.id})::int`,
      })
      .from(schema.collections)
      .leftJoin(schema.products, eq(schema.products.collectionId, schema.collections.id))
      .where(eq(schema.collections.storeId, storeId))
      .groupBy(schema.collections.id)
      .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name));
    collections = rows.map((r) => ({ id: r.id, name: r.name, productCount: r.productCount }));
  }

  return { collections, sessions: (await backfillTitles(sessionRows)).map(toSession) };
}

/** Conversations from before auto-titling have no title: derive one from
 * their first user message and store it, so the sidebar never lists a run
 * of "Untitled session" rows. */
async function backfillTitles(rows: SessionRow[]): Promise<SessionRow[]> {
  const untitled = rows.filter((row) => !row.title?.trim()).map((row) => row.id);
  if (untitled.length === 0) return rows;

  const firstMessages = await db
    .selectDistinctOn([schema.messages.conversationId], {
      conversationId: schema.messages.conversationId,
      content: schema.messages.content,
    })
    .from(schema.messages)
    .where(and(inArray(schema.messages.conversationId, untitled), eq(schema.messages.role, 'user')))
    .orderBy(schema.messages.conversationId, asc(schema.messages.createdAt));

  const titles = new Map<string, string>();
  for (const message of firstMessages) {
    const title = titleFromContent(message.content as unknown as StoredMessageContent);
    if (title) titles.set(message.conversationId, title);
  }

  await Promise.all(
    [...titles].map(([id, title]) =>
      db
        .update(schema.conversations)
        .set({ title })
        .where(and(eq(schema.conversations.id, id), isNull(schema.conversations.title))),
    ),
  );

  return rows.map((row) => (titles.has(row.id) ? { ...row, title: titles.get(row.id)! } : row));
}

export async function renameSession(userId: string, sessionId: string, title: string): Promise<ServiceResult<StudioSession>> {
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > SESSION_TITLE_MAX) {
    return { ok: false, error: `Title must be 1 to ${SESSION_TITLE_MAX} characters.` };
  }
  if (!(await ownedSession(userId, sessionId))) return { ok: false, error: 'Session not found.' };
  const [row] = await db
    .update(schema.conversations)
    .set({ title: trimmed })
    .where(and(eq(schema.conversations.id, sessionId), eq(schema.conversations.userId, userId)))
    .returning();
  return { ok: true, value: toSession(row) };
}

/** `collectionId` null ungroups the session. */
export async function setSessionCollection(
  userId: string,
  storeId: string | null,
  sessionId: string,
  collectionId: string | null,
): Promise<ServiceResult<StudioSession>> {
  if (!(await ownedSession(userId, sessionId))) return { ok: false, error: 'Session not found.' };
  if (collectionId) {
    if (!storeId || !(await ownedCollection(storeId, collectionId))) {
      return { ok: false, error: 'Drop not found.' };
    }
  }
  const [row] = await db
    .update(schema.conversations)
    .set({ collectionId })
    .where(and(eq(schema.conversations.id, sessionId), eq(schema.conversations.userId, userId)))
    .returning();
  return { ok: true, value: toSession(row) };
}

/** Deletes the session; its messages, tool calls and project card go with it (ON DELETE CASCADE). */
export async function deleteSession(userId: string, sessionId: string): Promise<ServiceResult<null>> {
  if (!(await ownedSession(userId, sessionId))) return { ok: false, error: 'Session not found.' };
  await db
    .delete(schema.conversations)
    .where(and(eq(schema.conversations.id, sessionId), eq(schema.conversations.userId, userId)));
  return { ok: true, value: null };
}

export async function renameCollection(storeId: string, collectionId: string, name: string): Promise<ServiceResult<StudioCollection>> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > COLLECTION_NAME_MAX) {
    return { ok: false, error: `Name must be 1 to ${COLLECTION_NAME_MAX} characters.` };
  }
  if (!(await ownedCollection(storeId, collectionId))) return { ok: false, error: 'Drop not found.' };
  const [row] = await db
    .update(schema.collections)
    .set({ name: trimmed })
    .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.storeId, storeId)))
    .returning();
  return { ok: true, value: { id: row.id, name: row.name, productCount: await productCount(row.id) } };
}

export async function deleteCollection(storeId: string, collectionId: string): Promise<ServiceResult<null>> {
  if (!(await ownedCollection(storeId, collectionId))) return { ok: false, error: 'Drop not found.' };
  if ((await productCount(collectionId)) > 0) {
    return { ok: false, error: 'This drop still has products. Move or remove them first.' };
  }
  await db.update(schema.conversations).set({ collectionId: null }).where(eq(schema.conversations.collectionId, collectionId));
  await db
    .delete(schema.collections)
    .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.storeId, storeId)));
  return { ok: true, value: null };
}
