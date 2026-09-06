import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolResult } from '@/lib/tools/types';
import { approveWaitlist, listWaitlist, rejectWaitlist, type WaitlistSignup } from '@/lib/services/waitlist';
import type { Card } from '@/lib/ui-cards/schemas';

// Admin-only: waitlist approval -> invite (Platform-Plan §7). Every write
// here is confirm-gated — approving/rejecting someone's application is
// sensitive enough to need a human click, not just a model's say-so.

function noticeCard(id: string, tone: 'info' | 'success' | 'warning' | 'error', text: string): Card {
  return { id, kind: 'notice', tone, text };
}

function waitlistTableCard(rows: WaitlistSignup[]): Card {
  return {
    id: `waitlist_${randomUUID()}`,
    kind: 'waitlist_table',
    rows: rows.map((row) => ({
      id: String(row.id),
      email: row.email,
      role: row.role ?? undefined,
      project: row.product ?? undefined,
      at: (row.createdAt ?? new Date()).toISOString(),
      status: row.status,
      prompt: row.status === 'pending' ? `Approve waitlist ${row.id}` : undefined,
    })),
    total: rows.length,
  };
}

interface ListWaitlistData {
  count: number;
}

export const listWaitlistTool = defineTool({
  name: 'list_waitlist',
  description:
    "Show the platform waitlist (people who signed up on the public waitlist page, source of truth for who can register a shop). Filter by status ('pending' | 'approved' | 'rejected' | 'registered'); omit for everything, most recent first. Call this when the admin asks to see, check, or review the waitlist.",
  input: z.object({ status: z.enum(['pending', 'approved', 'rejected', 'registered']).optional() }).strict(),
  scope: 'admin',
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListWaitlistData>> => {
    const rows = await listWaitlist({ status: input.status });
    return { data: { count: rows.length }, ui: { cards: [waitlistTableCard(rows)] } };
  },
});

interface ApproveWaitlistData {
  ok: boolean;
  error?: string;
}

export const approveWaitlistTool = defineTool({
  name: 'approve_waitlist',
  description:
    "Approve a pending waitlist signup, generating (or reusing) their invite link and emailing it to them so they can register a shop. Sensitive action: shows a confirm card and only executes once the human clicks confirm. Always pass email (read it off the waitlist row) so the confirmation reads clearly, e.g. 'Approve waitlist someone@example.com'.",
  input: z.object({ id: z.coerce.number().int().positive(), email: z.string().max(200).optional() }).strict(),
  scope: 'admin',
  confirm: true,
  summarize: (input) => `Approve waitlist signup ${input.email ?? `#${input.id}`}.`,
  run: async (ctx, input): Promise<ToolResult<ApproveWaitlistData>> => {
    const result = await approveWaitlist(input.id, ctx.userId);
    if (!result.ok) {
      const message = result.error === 'already_registered' ? 'That signup already has an account.' : 'Waitlist signup not found.';
      return { data: { ok: false, error: result.error }, ui: { cards: [noticeCard(`approve_err_${randomUUID()}`, 'warning', message)] } };
    }
    return {
      data: { ok: true },
      ui: {
        cards: [noticeCard(`approved_${result.signup.id}`, 'success', `Approved ${result.signup.email} — invite email sent.`)],
        next: [{ label: 'List the waitlist', prompt: 'List the waitlist' }],
      },
    };
  },
});

interface RejectWaitlistData {
  ok: boolean;
  error?: string;
}

export const rejectWaitlistTool = defineTool({
  name: 'reject_waitlist',
  description:
    "Reject a waitlist signup, closing it out with an optional internal note (never emailed to them). Sensitive action: shows a confirm card and only executes once the human clicks confirm. Always pass email (read it off the waitlist row) so the confirmation reads clearly.",
  input: z.object({ id: z.coerce.number().int().positive(), note: z.string().max(500).optional(), email: z.string().max(200).optional() }).strict(),
  scope: 'admin',
  confirm: true,
  summarize: (input) => `Reject waitlist signup ${input.email ?? `#${input.id}`}.`,
  run: async (_ctx, input): Promise<ToolResult<RejectWaitlistData>> => {
    const result = await rejectWaitlist(input.id, input.note);
    if (!result.ok) {
      const message = result.error === 'already_registered' ? 'That signup already has an account.' : 'Waitlist signup not found.';
      return { data: { ok: false, error: result.error }, ui: { cards: [noticeCard(`reject_err_${randomUUID()}`, 'warning', message)] } };
    }
    return {
      data: { ok: true },
      ui: {
        cards: [noticeCard(`rejected_${result.signup.id}`, 'info', `Rejected ${result.signup.email}.`)],
        next: [{ label: 'List the waitlist', prompt: 'List the waitlist' }],
      },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WAITLIST_TOOLS: Tool<any, any>[] = [listWaitlistTool, approveWaitlistTool, rejectWaitlistTool];
