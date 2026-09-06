import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export type NotificationRow = typeof schema.notifications.$inferSelect;

/** Inbox is the in-app channel only — email/discord rows are delivery receipts, not inbox items. */
export async function listNotifications(userId: string, unreadOnly = false, limit = 20): Promise<NotificationRow[]> {
  const conditions = [eq(schema.notifications.userId, userId), eq(schema.notifications.channel, 'inapp')];
  if (unreadOnly) conditions.push(isNull(schema.notifications.readAt));

  return db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(sql`${schema.notifications.readAt} is null`), desc(schema.notifications.createdAt))
    .limit(limit);
}

/** Marks the given inapp notifications read, or every inapp notification for the user when ids is 'all'. */
export async function markRead(userId: string, ids: string[] | 'all'): Promise<number> {
  if (ids !== 'all' && ids.length === 0) return 0;

  const conditions = [eq(schema.notifications.userId, userId), eq(schema.notifications.channel, 'inapp')];
  if (ids !== 'all') conditions.push(inArray(schema.notifications.id, ids));

  const rows = await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions))
    .returning({ id: schema.notifications.id });
  return rows.length;
}

/** Human-readable summary for a notification's inbox card row. */
export function describeNotification(row: NotificationRow): string {
  const payload = (row.payload as Record<string, unknown> | null) ?? {};
  const message = typeof payload.message === 'string' ? payload.message : null;
  return message ?? row.event.replace(/[._]/g, ' ');
}

/** Chat prompt attached to the row's payload, if the event carries one. */
export function notificationPrompt(row: NotificationRow): string | undefined {
  const payload = (row.payload as Record<string, unknown> | null) ?? {};
  return typeof payload.prompt === 'string' ? payload.prompt : undefined;
}
