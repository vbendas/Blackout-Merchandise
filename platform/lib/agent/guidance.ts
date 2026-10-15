import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { SessionInfo } from '@/lib/auth';
import { can, isTeamRole, type AccessHolder, type Actor, type Area, type Level } from '@/lib/auth/permissions';
import type { ChecklistStep } from '@/lib/agent/protocol';
import type { Chip } from '@/lib/ui-cards/schemas';
import { getProjectCard } from '@/lib/services/conversations';
import { getSalesThisMonth } from '@/lib/services/studio-home';
import { storeSummary } from '@/lib/services/stores';
import { humanStatus } from '@/lib/format/status';
import { runLabel } from '@/lib/format/runs';

// Drives the guided-chat empty state: a headline + status line, state-keyed
// quick-action chips, the onboarding checklist, and the top-bar project
// pill. Everything here is read-only and safe to call on every history/
// suggest request. The owner and staff share the 'admin' state; what it
// offers an employee follows their access (lib/auth/permissions.ts).

export type GuidanceState = 'no_store' | 'no_products' | 'draft_products' | 'live' | 'admin';

/** What guidance reads of a session. `actor` carries an employee's access;
 * without it a staff session is offered nothing from the admin. */
export type GuidanceSession = Pick<SessionInfo, 'user' | 'store' | 'role'> & { actor?: Actor };

function accessOf(session: GuidanceSession): AccessHolder {
  return session.actor ?? { role: session.role };
}

export interface GuidanceCounts {
  liveProducts: number;
  draftProducts: number;
  stripeReady: boolean;
  unreadInbox: number;
  salesThisMonth: number;
  /** owner and staff: pending waitlist entries + open support tickets, each
   * counted only for those who can see that area */
  adminWaiting: number;
}

async function countUnreadInbox(userId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return rows.length;
}

async function countAdminWaiting(access: AccessHolder): Promise<number> {
  const [waitlistRows, ticketRows] = await Promise.all([
    can(access, 'applications', 'view')
      ? db.select({ id: schema.waitlistSignups.id }).from(schema.waitlistSignups).where(eq(schema.waitlistSignups.status, 'pending'))
      : Promise.resolve([]),
    can(access, 'support', 'view')
      ? db.select({ id: schema.supportTickets.id }).from(schema.supportTickets).where(eq(schema.supportTickets.status, 'pending'))
      : Promise.resolve([]),
  ]);
  return waitlistRows.length + ticketRows.length;
}

export async function loadGuidanceCounts(session: GuidanceSession): Promise<GuidanceCounts> {
  const storeId = session.store?.id ?? null;

  const [summary, unreadInbox, salesThisMonth, adminWaiting] = await Promise.all([
    storeId ? storeSummary(storeId) : Promise.resolve(null),
    countUnreadInbox(session.user.id),
    storeId ? getSalesThisMonth(storeId).then((sales) => sales.count) : Promise.resolve(0),
    isTeamRole(session.role) ? countAdminWaiting(accessOf(session)) : Promise.resolve(0),
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

export function guidanceStateFor(session: GuidanceSession, counts: GuidanceCounts): GuidanceState {
  if (isTeamRole(session.role)) return 'admin';
  if (!session.store) return 'no_store';
  if (counts.liveProducts === 0 && counts.draftProducts === 0) return 'no_products';
  if (counts.liveProducts === 0) return 'draft_products';
  return 'live';
}

/** Convenience for callers that just need the state (loads counts once). */
export async function resolveGuidance(session: GuidanceSession): Promise<{ state: GuidanceState; counts: GuidanceCounts }> {
  const counts = await loadGuidanceCounts(session);
  return { state: guidanceStateFor(session, counts), counts };
}

/** The artist's first name, or null when the account has no usable name
 * (the greeting then drops it instead of calling them something else). */
function firstNameFor(session: GuidanceSession): string | null {
  const name = session.user.displayName?.trim() ?? '';
  if (!name || name.includes('@')) return null;
  return name.split(/\s+/)[0] || null;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

async function lineFor(session: GuidanceSession, state: GuidanceState, counts: GuidanceCounts): Promise<string> {
  switch (state) {
    case 'no_store':
      return "You don't have a shop yet. Let's start one.";
    case 'no_products': {
      const steps = await checklistFor(session);
      const remaining = steps ? steps.filter((s) => !s.done).length : 0;
      return `Your shop is a draft. ${plural(remaining, 'step')} to live.`;
    }
    case 'draft_products':
      return `${plural(counts.draftProducts, 'draft')} waiting to go live.`;
    case 'live': {
      const shopName = session.store?.name?.trim() || 'Your shop';
      // Products can be live before the shop is published.
      if (!session.store?.isPublished) {
        const n = counts.liveProducts;
        return `${plural(n, 'product')} ${n === 1 ? 'is' : 'are'} live. ${shopName} is not published yet.`;
      }
      const sales =
        counts.salesThisMonth === 0
          ? 'No sales yet this month. Share your shop link.'
          : `${plural(counts.salesThisMonth, 'sale')} this month.`;
      return `${shopName} is live. ${sales}`;
    }
    case 'admin':
      return counts.adminWaiting === 0 ? 'Nothing is waiting on you.' : `${plural(counts.adminWaiting, 'thing')} waiting on you.`;
  }
}

export async function greetingFor(
  session: GuidanceSession,
  state: GuidanceState,
  counts?: GuidanceCounts,
): Promise<{ headline: string; line: string }> {
  const resolvedCounts = counts ?? (await loadGuidanceCounts(session));
  const firstName = firstNameFor(session);
  return {
    headline: firstName ? `What are we making, ${firstName}?` : 'What are we making?',
    line: await lineFor(session, state, resolvedCounts),
  };
}

/** The owner's and staff home chips, each with the area and level its tool
 * needs; quickActionsFor keeps the ones the caller may use. */
const TEAM_QUICK_ACTIONS: { chip: Chip; area: Area; level: Level }[] = [
  { chip: { label: "What's waiting", prompt: "What's waiting on me?", primary: true }, area: 'production', level: 'view' },
  { chip: { label: 'Production queue', prompt: 'Show the production queue' }, area: 'production', level: 'view' },
  { chip: { label: 'Waitlist', prompt: 'List the waitlist' }, area: 'applications', level: 'view' },
  { chip: { label: 'Open tickets', prompt: 'Show open support tickets' }, area: 'support', level: 'view' },
  { chip: { label: 'Payout anomalies', prompt: 'Show payout anomalies' }, area: 'money', level: 'view' },
];

/** `access` matters only in the 'admin' state: an employee sees the chips of
 * their own areas (none without it). The owner keeps the original four. */
export function quickActionsFor(state: GuidanceState, access?: AccessHolder): Chip[] {
  if (state === 'admin') {
    const holder = access ?? { role: 'staff' as const };
    if (holder.role === 'admin') return TEAM_QUICK_ACTIONS.filter((a) => a.chip.label !== 'Open tickets').map((a) => a.chip);
    const chips = TEAM_QUICK_ACTIONS.filter((a) => can(holder, a.area, a.level)).map((a) => a.chip);
    // The first chip an employee sees leads, whichever it is.
    return chips.map((chip, i) => ({ ...chip, primary: i === 0 ? true : undefined }));
  }
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
        { label: 'Publish a draft', prompt: 'Publish my draft' },
        { label: 'Browse blanks', prompt: 'Show me blanks' },
        { label: 'Shop status', prompt: 'Show my shop' },
      ];
    case 'live':
      return [
        { label: 'Add a product', prompt: 'Add a new product', primary: true },
        { label: 'Orders', prompt: 'Show my orders' },
        { label: 'Payouts', prompt: 'Payout status' },
        { label: 'Sales this month', prompt: 'Show my sales this month' },
        { label: 'Bulk order', prompt: 'Start a bulk order' },
        { label: 'Inbox', prompt: 'Check my inbox' },
      ];
  }
}

export async function checklistFor(session: GuidanceSession): Promise<ChecklistStep[] | null> {
  if (isTeamRole(session.role)) return null;
  if (session.store?.isPublished) return null;

  const summary = session.store ? await storeSummary(session.store.id) : null;
  const nameSet = (session.store?.name ?? '').trim().length > 0;

  return [
    { key: 'name', label: 'Name your shop', done: nameSet, prompt: 'Help me name my shop' },
    { key: 'product', label: 'First product', done: summary?.hasAnyProduct ?? false, prompt: 'Show me blanks' },
    { key: 'stripe', label: 'Payouts', done: summary?.stripeReady ?? false, prompt: 'Set up payouts' },
    { key: 'publish', label: 'Publish my shop', done: session.store?.isPublished ?? false, prompt: 'Publish my shop' },
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
    const runNumber = typeof state.runNumber === 'number' ? state.runNumber : null;
    const pieces = qty !== undefined && blank ? `${qty} × ${blank}` : blank;
    const run = runNumber !== null ? runLabel(runNumber) : 'Run';
    return {
      label: pieces ? `${run} · ${pieces}` : run,
      status: statusLabel(state.status, 'Draft'),
    };
  }

  return null;
}
