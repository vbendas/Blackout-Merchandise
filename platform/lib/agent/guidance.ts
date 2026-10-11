import { and, eq, gte, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { SessionInfo } from '@/lib/auth';
import type { ChecklistStep } from '@/lib/agent/protocol';
import type { Chip } from '@/lib/ui-cards/schemas';
import { getProjectCard } from '@/lib/services/conversations';
import { storeSummary } from '@/lib/services/stores';
import { humanStatus } from '@/lib/format/status';

// Drives the guided-chat empty state: a headline + status line, state-keyed
// quick-action chips, the onboarding checklist, and the top-bar project
// pill. Everything here is read-only and safe to call on every history/
// suggest request.

export type GuidanceState = 'no_store' | 'no_products' | 'draft_products' | 'live' | 'admin';

export interface GuidanceCounts {
  liveProducts: number;
  draftProducts: number;
  stripeReady: boolean;
  unreadInbox: number;
  salesThisMonth: number;
  /** admin only: pending waitlist entries + open support tickets */
  adminWaiting: number;
}

async function countUnreadInbox(userId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return rows.length;
}

function startOfMonthUtc(): Date {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function countSalesThisMonth(storeId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.storeId, storeId), gte(schema.orders.createdAt, startOfMonthUtc())));
  return rows.length;
}

async function countAdminWaiting(): Promise<number> {
  const [waitlistRows, ticketRows] = await Promise.all([
    db.select({ id: schema.waitlistSignups.id }).from(schema.waitlistSignups).where(eq(schema.waitlistSignups.status, 'pending')),
    db.select({ id: schema.supportTickets.id }).from(schema.supportTickets).where(eq(schema.supportTickets.status, 'pending')),
  ]);
  return waitlistRows.length + ticketRows.length;
}

export async function loadGuidanceCounts(session: SessionInfo): Promise<GuidanceCounts> {
  const storeId = session.store?.id ?? null;

  const [summary, unreadInbox, salesThisMonth, adminWaiting] = await Promise.all([
    storeId ? storeSummary(storeId) : Promise.resolve(null),
    countUnreadInbox(session.user.id),
    storeId ? countSalesThisMonth(storeId) : Promise.resolve(0),
    session.role === 'admin' ? countAdminWaiting() : Promise.resolve(0),
  ]);

  return {
    liveProducts: summary?.liveProducts ?? 0,
    draftProducts: summary ? Math.max(summary.totalProducts - summary.liveProducts, 0) : 0,
    stripeReady: summary?.stripeReady ?? false,
    unreadInbox,
    salesThisMonth,
    adminWaiting,
  };
}

export function guidanceStateFor(session: SessionInfo, counts: GuidanceCounts): GuidanceState {
  if (session.role === 'admin') return 'admin';
  if (!session.store) return 'no_store';
  if (counts.liveProducts === 0 && counts.draftProducts === 0) return 'no_products';
  if (counts.liveProducts === 0) return 'draft_products';
  return 'live';
}

/** Convenience for callers that just need the state (loads counts once). */
export async function resolveGuidance(session: SessionInfo): Promise<{ state: GuidanceState; counts: GuidanceCounts }> {
  const counts = await loadGuidanceCounts(session);
  return { state: guidanceStateFor(session, counts), counts };
}

function firstNameFor(session: SessionInfo): string {
  const source = session.user.displayName?.trim() || session.store?.name?.trim() || '';
  const first = source.split(/\s+/)[0];
  return first || 'today';
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

async function lineFor(session: SessionInfo, state: GuidanceState, counts: GuidanceCounts): Promise<string> {
  switch (state) {
    case 'no_store':
      return "You don't have a shop yet. Let's start one.";
    case 'no_products': {
      const steps = await checklistFor(session);
      const remaining = steps ? steps.filter((s) => !s.done).length : 0;
      return `Your shop is a draft. ${plural(remaining, 'step')} to live.`;
    }
    case 'draft_products':
      return `${plural(counts.draftProducts, 'draft')} waiting for a proof.`;
    case 'live': {
      const shopName = session.store?.name?.trim() || 'Your shop';
      return `${shopName} is live. ${plural(counts.salesThisMonth, 'sale')} this month.`;
    }
    case 'admin':
      return `${plural(counts.adminWaiting, 'thing')} waiting on you.`;
  }
}

export async function greetingFor(
  session: SessionInfo,
  state: GuidanceState,
  counts?: GuidanceCounts,
): Promise<{ headline: string; line: string }> {
  const resolvedCounts = counts ?? (await loadGuidanceCounts(session));
  return {
    headline: `What are we making, ${firstNameFor(session)}?`,
    line: await lineFor(session, state, resolvedCounts),
  };
}

export function quickActionsFor(state: GuidanceState): Chip[] {
  switch (state) {
    case 'no_store':
      return [
        { label: 'Name my shop', prompt: 'Help me name my shop', primary: true },
        { label: 'Browse blanks', prompt: 'Show me blanks' },
        { label: 'What can I do?', prompt: 'What can I do?' },
      ];
    case 'no_products':
      return [
        { label: 'Start a product', prompt: 'Start a product', primary: true },
        { label: 'Upload artwork', prompt: 'I want to upload artwork' },
        { label: 'Browse blanks', prompt: 'Show me blanks' },
        { label: 'Shop status', prompt: 'Show my shop' },
        { label: 'Bulk order', prompt: 'Start a bulk order' },
      ];
    case 'draft_products':
      return [
        { label: 'Continue my draft', prompt: 'Continue my draft', primary: true },
        { label: 'Send a proof', prompt: 'Send a proof' },
        { label: 'Browse blanks', prompt: 'Show me blanks' },
        { label: 'Shop status', prompt: 'Show my shop' },
      ];
    case 'live':
      return [
        { label: 'Add a product', prompt: 'Add a new product', primary: true },
        { label: 'Sales this month', prompt: 'Show my sales this month' },
        { label: 'Bulk order', prompt: 'Start a bulk order' },
        { label: 'Inbox', prompt: 'Check my inbox' },
      ];
    case 'admin':
      return [
        { label: "What's waiting", prompt: "What's waiting on me?", primary: true },
        { label: 'Production queue', prompt: 'Show the production queue' },
        { label: 'Waitlist', prompt: 'List the waitlist' },
        { label: 'Payout anomalies', prompt: 'Show payout anomalies' },
      ];
  }
}

export async function checklistFor(session: SessionInfo): Promise<ChecklistStep[] | null> {
  if (session.role === 'admin') return null;
  if (session.store?.isPublished) return null;

  const summary = session.store ? await storeSummary(session.store.id) : null;
  const nameSet = (session.store?.name ?? '').trim().length > 0;

  return [
    { key: 'name', label: 'Name your shop', done: nameSet, prompt: 'Help me name my shop' },
    { key: 'product', label: 'First product', done: summary?.hasAnyProduct ?? false, prompt: 'Show me blanks' },
    { key: 'stripe', label: 'Stripe payouts', done: summary?.stripeReady ?? false, prompt: 'Connect Stripe payouts' },
    { key: 'publish', label: 'Publish', done: session.store?.isPublished ?? false, prompt: 'Publish my store' },
  ];
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function statusLabel(raw: unknown, fallback: 'Draft' | 'Proof' | 'Live'): string {
  const s = str(raw)?.toLowerCase();
  if (!s) return fallback;
  if (s.includes('live')) return 'Live';
  if (s.includes('proof')) return 'Proof';
  if (s.includes('draft')) return 'Draft';
  return humanStatus(str(raw)) || fallback;
}

export async function projectPillFor(conversationId: string): Promise<{ label: string; status: string; colourHex?: string } | null> {
  const card = await getProjectCard(conversationId);
  if (!card) return null;

  const state = (card.state ?? {}) as Record<string, unknown>;

  if (card.kind === 'product') {
    const name = str(state.name) ?? 'Product';
    const colours = Array.isArray(state.colours) ? (state.colours as Record<string, unknown>[]) : [];
    const first = colours[0];
    const colourName = str(first?.name);
    const colourHex = str(first?.hex);
    return {
      label: colourName ? `${name} · ${colourName}` : name,
      status: statusLabel(state.status, 'Draft'),
      colourHex,
    };
  }

  if (card.kind === 'bulk_order') {
    const lines = Array.isArray(state.lines) ? (state.lines as { qty?: unknown }[]) : null;
    const linesQty = lines?.reduce((sum, l) => sum + (typeof l.qty === 'number' ? l.qty : 0), 0) ?? 0;
    const qty = typeof state.qty === 'number' ? state.qty : linesQty || undefined;
    const blank = str(state.blank) ?? str(state.blankName);
    return {
      label: qty !== undefined && blank ? `${qty} × ${blank}` : (blank ?? 'Bulk order'),
      status: statusLabel(state.status, 'Draft'),
    };
  }

  return null;
}
