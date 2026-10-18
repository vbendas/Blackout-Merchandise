import { randomUUID } from 'crypto';
import { z } from 'zod';
import { can, type AccessHolder } from '@/lib/auth/permissions';
import { defineTool, type Tool, type ToolResult } from '@/lib/tools/types';
import {
  getTicket,
  listTickets,
  openTicket,
  replyTicket,
  resolveTicket,
  type SupportTicket,
  type TicketMessage,
} from '@/lib/services/support';
import type { Card } from '@/lib/ui-cards/schemas';

// Support tickets in chat. contact_support/get_ticket/reply_ticket are
// 'both'-scoped: anyone may open and follow their own tickets, and only the
// owner or an employee with Support access may read (View) or answer (Work)
// someone else's — enforced here, not just by what the model is told to do.
// The queue tools (list_tickets, resolve_ticket) are staff tools.

function noticeCard(id: string, tone: 'info' | 'success' | 'warning' | 'error', text: string): Card {
  return { id, kind: 'notice', tone, text };
}

function ticketMessageAuthor(message: TicketMessage): 'artist' | 'admin' | 'system' {
  if (message.senderType === 'human') return 'admin';
  if (message.senderType === 'ai' || message.senderType === 'system') return 'system';
  return 'artist';
}

function ticketCard(ticket: SupportTicket, messages: TicketMessage[]): Card {
  return {
    id: `ticket_${ticket.id}`,
    kind: 'ticket',
    ticketId: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    from: ticket.contactEmail ?? undefined,
    messages: messages.slice(-20).map((m) => ({ author: ticketMessageAuthor(m), text: m.content, at: m.createdAt.toISOString() })),
  };
}

function ticketsInboxCard(tickets: SupportTicket[]): Card {
  return {
    id: `tickets_${randomUUID()}`,
    kind: 'inbox',
    items: tickets.map((t) => ({
      id: t.id,
      at: t.createdAt.toISOString(),
      text: `${t.subject} — ${t.status}`,
      unread: t.status === 'pending',
      prompt: `Open ticket ${t.id}`,
    })),
  };
}

function ownTicket(ticket: SupportTicket, ctx: { userId: string }): boolean {
  return ticket.userId !== null && ticket.userId === ctx.userId;
}

/** Reading a ticket: your own, or anyone's with Support View. */
function mayRead(ticket: SupportTicket, ctx: AccessHolder & { userId: string }): boolean {
  return ownTicket(ticket, ctx) || can(ctx, 'support', 'view');
}

/** Answering a ticket: your own, or anyone's with Support Work. */
function mayReply(ticket: SupportTicket, ctx: AccessHolder & { userId: string }): boolean {
  return ownTicket(ticket, ctx) || can(ctx, 'support', 'work');
}

interface ContactSupportData {
  ticketId: string;
}

export const contactSupportTool = defineTool({
  name: 'contact_support',
  description:
    "Open a support ticket for the signed-in user, notifying an admin. Call this when the artist wants help beyond what you can resolve, reports an issue, or explicitly asks to contact support. Keep subject short (a few words) and message as the full detail of their request.",
  input: z.object({ subject: z.string().min(1).max(120), message: z.string().min(1).max(2000), orderId: z.string().uuid().optional() }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult<ContactSupportData>> => {
    const { ticket, messages } = await openTicket({
      userId: ctx.userId,
      storeId: ctx.storeId ?? undefined,
      subject: input.subject,
      message: input.message,
      orderId: input.orderId,
    });
    return {
      data: { ticketId: ticket.id },
      ui: { cards: [ticketCard(ticket, messages)], next: [{ label: 'Anything else?', prompt: 'What can I do?' }] },
    };
  },
});

interface ListTicketsData {
  count: number;
}

export const listTicketsTool = defineTool({
  name: 'list_tickets',
  description:
    "Show the support ticket queue. Filter by status ('pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed'); omit for everything, most recent first. Call this when the user asks to see open tickets or the support queue.",
  input: z.object({ status: z.enum(['pending', 'assigned', 'in_progress', 'resolved', 'closed']).optional() }).strict(),
  scope: 'staff',
  access: { area: 'support', level: 'view' },
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListTicketsData>> => {
    const tickets = await listTickets({ status: input.status });
    return { data: { count: tickets.length }, ui: { cards: [ticketsInboxCard(tickets)] } };
  },
});

interface GetTicketData {
  ok: boolean;
  error?: string;
}

export const getTicketTool = defineTool({
  name: 'get_ticket',
  description: "Open a specific support ticket by id and show its full message thread. Only the person who opened it, or staff with Support access, may open it.",
  input: z.object({ id: z.string().uuid() }).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetTicketData>> => {
    const found = await getTicket(input.id);
    if (!found) return { data: { ok: false, error: 'not_found' }, ui: { cards: [noticeCard(`ticket_404_${randomUUID()}`, 'warning', 'Ticket not found.')] } };
    if (!mayRead(found.ticket, ctx)) {
      return { data: { ok: false, error: 'forbidden' }, ui: { cards: [noticeCard(`ticket_403_${randomUUID()}`, 'warning', "That ticket isn't yours.")] } };
    }
    return { data: { ok: true }, ui: { cards: [ticketCard(found.ticket, found.messages)] } };
  },
});

interface ReplyTicketData {
  ok: boolean;
  error?: string;
}

export const replyTicketTool = defineTool({
  name: 'reply_ticket',
  description: "Post a reply into a support ticket's thread, notifying the other side. Only the person who opened it, or staff who handle Support, may reply.",
  input: z.object({ id: z.string().uuid(), text: z.string().min(1).max(2000) }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult<ReplyTicketData>> => {
    const found = await getTicket(input.id);
    if (!found) return { data: { ok: false, error: 'not_found' }, ui: { cards: [noticeCard(`reply_404_${randomUUID()}`, 'warning', 'Ticket not found.')] } };
    if (!mayReply(found.ticket, ctx)) {
      return { data: { ok: false, error: 'forbidden' }, ui: { cards: [noticeCard(`reply_403_${randomUUID()}`, 'warning', "That ticket isn't yours.")] } };
    }

    // Someone else's ticket is answered from the Blackout Merchandise side.
    const side = ownTicket(found.ticket, ctx) ? 'artist' : 'admin';
    const updated = await replyTicket(input.id, ctx.userId, input.text, side);
    if (!updated) return { data: { ok: false, error: 'not_found' }, ui: { cards: [noticeCard(`reply_err_${randomUUID()}`, 'warning', 'Ticket not found.')] } };

    return { data: { ok: true }, ui: { cards: [ticketCard(updated.ticket, updated.messages)] } };
  },
});

interface ResolveTicketData {
  ok: boolean;
  error?: string;
}

export const resolveTicketTool = defineTool({
  name: 'resolve_ticket',
  description: 'Mark a support ticket resolved, closing out the queue item.',
  input: z.object({ id: z.string().uuid() }).strict(),
  scope: 'staff',
  access: { area: 'support', level: 'work' },
  run: async (_ctx, input): Promise<ToolResult<ResolveTicketData>> => {
    const updated = await resolveTicket(input.id);
    if (!updated) return { data: { ok: false, error: 'not_found' }, ui: { cards: [noticeCard(`resolve_err_${randomUUID()}`, 'warning', 'Ticket not found.')] } };
    const messages = (await getTicket(input.id))?.messages ?? [];
    return { data: { ok: true }, ui: { cards: [ticketCard(updated, messages)] } };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SUPPORT_TOOLS: Tool<any, any>[] = [contactSupportTool, listTicketsTool, getTicketTool, replyTicketTool, resolveTicketTool];
