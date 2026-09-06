import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export type NotificationRow = typeof schema.notifications.$inferSelect;

export async function listNotifications(userId: string, unreadOnly = false, limit = 20): Promise<NotificationRow[]> {
  const conditions = [eq(schema.notifications.userId, userId)];
  if (unreadOnly) conditions.push(isNull(schema.notifications.readAt));

  return db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
}

/** Marks one notification read, or every notification for the user when id is 'all'. */
export async function markRead(userId: string, id: string | 'all'): Promise<number> {
  const conditions =
    id === 'all'
      ? [eq(schema.notifications.userId, userId)]
      : [eq(schema.notifications.userId, userId), eq(schema.notifications.id, id)];

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
