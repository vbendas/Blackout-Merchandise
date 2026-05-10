import { db } from './index';
import { supportTickets, ticketMessages, staff } from './schema';
import { eq, and, desc, count } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type SupportTicket = InferSelectModel<typeof supportTickets>;
export type TicketMessage = InferSelectModel<typeof ticketMessages>;

export async function createTicket(data: {
  sessionId?: string;
  userId?: string;
  visitorToken?: string;
  agentId: SupportTicket['agentId'];
  subject: string;
  description?: string;
  contactEmail?: string;
  visitorName?: string;
  estimatedWaitMinutes?: number;
  metadata?: Record<string, unknown>;
  source?: string;
}): Promise<SupportTicket> {
  const [result] = await db
    .insert(supportTickets)
    .values({
      ...data,
      status: 'pending' as SupportTicket['status'],
      priority: 'medium' as SupportTicket['priority'],
      source: data.source || 'chat',
    })
    .returning();
  return result;
}

export async function getTicketById(id: string): Promise<SupportTicket | null> {
  const [result] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, id))
    .limit(1);
  return result || null;
}

export async function getTicketWithDetails(
  id: string
): Promise<
  | (SupportTicket & {
      assignedStaff: typeof staff.$inferSelect | null;
      messages: TicketMessage[];
    })
  | null
> {
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, id))
    .limit(1);

  if (!ticket) return null;

  const [assignedStaff] = ticket.assignedStaffId
    ? await db
        .select()
        .from(staff)
        .where(eq(staff.id, ticket.assignedStaffId))
        .limit(1)
    : [null];

  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(ticketMessages.createdAt);

  return {
    ...ticket,
    assignedStaff: assignedStaff || null,
    messages,
  };
}

export async function getTicketsByStatus(
  status: string,
  limit = 50,
  offset = 0
): Promise<SupportTicket[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.status, status as SupportTicket['status']))
    .orderBy(desc(supportTickets.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getTicketsByAgent(agentId: string): Promise<SupportTicket[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.agentId, agentId as SupportTicket['agentId']))
    .orderBy(desc(supportTickets.createdAt));
}

export async function getTicketsByStaff(staffId: string): Promise<SupportTicket[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.assignedStaffId, staffId))
    .orderBy(desc(supportTickets.createdAt));
}

export async function getTicketsByUser(userId: string): Promise<SupportTicket[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.createdAt));
}

export async function getTicketByVisitorToken(
  visitorToken: string
): Promise<SupportTicket | null> {
  const [result] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.visitorToken, visitorToken))
    .orderBy(desc(supportTickets.createdAt))
    .limit(1);
  return result || null;
}

export async function getPendingTicketCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(supportTickets)
    .where(eq(supportTickets.status, 'pending'));
  return result?.count || 0;
}

export async function assignTicket(
  ticketId: string,
  staffId: string
): Promise<SupportTicket | null> {
  const [result] = await db
    .update(supportTickets)
    .set({
      assignedStaffId: staffId,
      status: 'assigned',
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId))
    .returning();
  return result || null;
}

export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<SupportTicket | null> {
  const [result] = await db
    .update(supportTickets)
    .set({
      status: status as SupportTicket['status'],
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId))
    .returning();
  return result || null;
}

export async function resolveTicket(
  ticketId: string,
  resolution?: string
): Promise<SupportTicket | null> {
  const [result] = await db
    .update(supportTickets)
    .set({
      status: 'resolved',
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId))
    .returning();

  if (result && resolution) {
    await addTicketMessage({
      ticketId,
      senderType: 'system',
      content: `Ticket resolved: ${resolution}`,
    });
  }

  return result || null;
}

export async function addTicketMessage(data: {
  ticketId: string;
  senderType: TicketMessage['senderType'];
  senderId?: string;
  content: string;
  isInternal?: boolean;
}): Promise<TicketMessage> {
  const [result] = await db
    .insert(ticketMessages)
    .values({
      ...data,
      isInternal: data.isInternal || false,
    })
    .returning();

  // If a human sends a message and ticket is assigned, update to in_progress
  if (data.senderType === 'human') {
    await db
      .update(supportTickets)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supportTickets.id, data.ticketId),
          eq(supportTickets.status, 'assigned')
        )
      );
  }

  return result;
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  return db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(ticketMessages.createdAt);
}

export async function getRecentTickets(
  limit = 20,
  offset = 0
): Promise<SupportTicket[]> {
  return db
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.createdAt))
    .limit(limit)
    .offset(offset);
}