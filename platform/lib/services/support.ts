// Support tickets in chat (Platform-Plan §3 wave). Both roles read/write
// through here; tools in lib/tools/support.ts are thin wrappers.
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { notify } from '@/lib/services/notifications';

export type SupportTicket = typeof schema.supportTickets.$inferSelect;
export type TicketMessage = typeof schema.ticketMessages.$inferSelect;
export type TicketStatus = SupportTicket['status'];
/** Which side a reply comes from: the person who opened the ticket, or
 * Blackout Merchandise (the owner or a staff member who handles support). */
export type ReplyRole = 'artist' | 'admin';

export interface TicketWithMessages {
  ticket: SupportTicket;
  messages: TicketMessage[];
}

/** Cat-Suite is retired (Sep 2026 decision), but `support_tickets.agent_id`
 * is a legacy NOT NULL enum column with no default — filled with the
 * retired persona that owned support rather than widening the schema here. */
const LEGACY_AGENT_ID = 'Antônia' as const;

function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** The admin who should hear about queue items. More than one `role =
 * 'admin'` row can exist in practice (Clerk role promotions, dev-bypass
 * overrides); picking one with no ordering would make "who gets notified"
 * arbitrary, so this prefers whichever admin matches ADMIN_EMAILS (the
 * platform's actual configured admin — same list notifications.ts's
 * adminRecipients() and users.ts's resolveRole() key off), falling back to
 * the longest-standing admin account when that env var is unset. */
async function firstAdminUserId(): Promise<string | null> {
  const admins = await db.select({ id: schema.users.id, email: schema.users.email, createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.role, 'admin'));
  if (admins.length === 0) return null;

  const emails = adminEmailList();
  const preferred = emails.length > 0 ? admins.find((a) => emails.includes(a.email.toLowerCase())) : undefined;
  if (preferred) return preferred.id;

  const [oldest] = [...admins].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return oldest?.id ?? null;
}

/** Employees who answer tickets (Support, Work or Manage) and aren't paused:
 * they hear about tickets alongside the owner. */
async function supportStaffIds(): Promise<string[]> {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.staffPermissions, eq(schema.staffPermissions.userId, schema.users.id))
    .where(
      and(
        eq(schema.users.role, 'staff'),
        isNull(schema.users.suspendedAt),
        eq(schema.staffPermissions.area, 'support'),
        inArray(schema.staffPermissions.level, ['work', 'manage']),
      ),
    );
  return rows.map((row) => row.id);
}

async function notifyAdmin(text: string, ticketId: string, summary: string): Promise<void> {
  const adminId = await firstAdminUserId();
  const recipients = new Set<string>(adminId ? [adminId] : []);
  try {
    for (const id of await supportStaffIds()) recipients.add(id);
  } catch (err) {
    console.error('[support] support staff lookup failed:', err instanceof Error ? err.message : err);
  }
  for (const userId of recipients) {
    try {
      await notify({
        userId,
        event: 'admin.queue_item',
        text,
        payload: { kind: 'support_ticket', summary, ticketId },
        prompt: `Open ticket ${ticketId}`,
      });
    } catch (err) {
      console.error('[support] notify(admin.queue_item) failed:', err instanceof Error ? err.message : err);
    }
  }
}

async function loadTicketWithMessages(ticketId: string): Promise<TicketWithMessages | null> {
  const [ticket] = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, ticketId)).limit(1);
  if (!ticket) return null;
  const messages = await db
    .select()
    .from(schema.ticketMessages)
    .where(eq(schema.ticketMessages.ticketId, ticketId))
    .orderBy(asc(schema.ticketMessages.createdAt));
  return { ticket, messages };
}

export interface OpenTicketInput {
  userId: string;
  storeId?: string;
  subject: string;
  message: string;
  orderId?: string;
}

export async function openTicket(input: OpenTicketInput): Promise<TicketWithMessages> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, input.userId)).limit(1);

  const [ticket] = await db
    .insert(schema.supportTickets)
    .values({
      userId: input.userId,
      agentId: LEGACY_AGENT_ID,
      status: 'pending',
      priority: 'medium',
      subject: input.subject,
      contactEmail: user?.email ?? null,
      visitorName: user?.displayName ?? null,
      // storeId/orderId have no dedicated columns on this legacy table.
      metadata: { storeId: input.storeId ?? null, orderId: input.orderId ?? null },
    })
    .returning();

  const [message] = await db
    .insert(schema.ticketMessages)
    .values({ ticketId: ticket.id, senderType: 'user', senderId: input.userId, content: input.message })
    .returning();

  await notifyAdmin(`New ticket: ${input.subject}`, ticket.id, input.subject);

  return { ticket, messages: [message] };
}

export interface ListTicketsInput {
  status?: TicketStatus;
  userId?: string;
}

export async function listTickets(input: ListTicketsInput = {}): Promise<SupportTicket[]> {
  const conditions = [];
  if (input.status) conditions.push(eq(schema.supportTickets.status, input.status));
  if (input.userId) conditions.push(eq(schema.supportTickets.userId, input.userId));

  const query = db.select().from(schema.supportTickets);
  return conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(schema.supportTickets.createdAt)).limit(50)
    : query.orderBy(desc(schema.supportTickets.createdAt)).limit(50);
}

export async function getTicket(id: string): Promise<TicketWithMessages | null> {
  return loadTicketWithMessages(id);
}

export async function replyTicket(id: string, authorUserId: string, text: string, role: ReplyRole): Promise<TicketWithMessages | null> {
  const existing = await loadTicketWithMessages(id);
  if (!existing) return null;

  await db.insert(schema.ticketMessages).values({
    ticketId: id,
    senderType: role === 'admin' ? 'human' : 'user',
    senderId: authorUserId,
    content: text,
  });

  await db
    .update(schema.supportTickets)
    .set({ status: role === 'admin' && existing.ticket.status === 'pending' ? 'in_progress' : existing.ticket.status, updatedAt: new Date() })
    .where(eq(schema.supportTickets.id, id));

  if (role === 'admin') {
    if (existing.ticket.userId) {
      try {
        await notify({
          userId: existing.ticket.userId,
          event: 'support.reply',
          text: `New reply on "${existing.ticket.subject}"`,
          payload: { subject: existing.ticket.subject, preview: text.slice(0, 140) },
          prompt: `Open ticket ${id}`,
        });
      } catch (err) {
        console.error('[replyTicket] notify(support.reply) failed:', err instanceof Error ? err.message : err);
      }
    }
  } else {
    await notifyAdmin(`New reply on ticket: ${existing.ticket.subject}`, id, existing.ticket.subject);
  }

  return loadTicketWithMessages(id);
}

export async function resolveTicket(id: string): Promise<SupportTicket | null> {
  const [updated] = await db
    .update(schema.supportTickets)
    .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.supportTickets.id, id))
    .returning();
  return updated ?? null;
}
