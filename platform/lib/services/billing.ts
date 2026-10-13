import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { RunSummary } from '@/lib/services/runs';

// What the Billing page reads. Read-only: the ledger is written by
// orders.markPaid, runs are bulk_orders rows (lib/services/runs.ts).
//
// A payout_ledger row exists once per paid fan sale (bulk orders are the
// artist's own purchases and never get one), and its numbers tie out like
// this (see checkout.ts buildCheckout and orders.markPaid):
//   gross_cents    what the fan paid, tax included
//   fee_cents      what MerchFrom keeps: blank + print (base cost) + shipping
//   transfer_cents what is sent to the artist: retail price - base cost
//   orders.tax_cents the tax collected on top, which also stays with MerchFrom
// so gross = fee + transfer + tax, to the cent.

export interface PayoutRow {
  id: string;
  createdAt: Date;
  /** what the fan paid, tax included (payout_ledger.gross_cents) */
  grossCents: number;
  /** kept for the blank, the print and shipping (payout_ledger.fee_cents) */
  feeCents: number;
  /** tax collected on the sale (orders.tax_cents) */
  taxCents: number;
  /** sent to the artist (payout_ledger.transfer_cents) */
  transferCents: number;
  /** raw ledger status ('recorded', 'refunded', ...); words live in the UI */
  status: string;
}

/** Last 20 payout ledger rows for a store, newest first. Read-only. */
export async function listRecentPayouts(storeId: string, limit = 20): Promise<PayoutRow[]> {
  return db
    .select({
      id: schema.payoutLedger.id,
      createdAt: schema.payoutLedger.createdAt,
      grossCents: schema.payoutLedger.grossCents,
      feeCents: schema.payoutLedger.feeCents,
      taxCents: schema.orders.taxCents,
      transferCents: schema.payoutLedger.transferCents,
      status: schema.payoutLedger.status,
    })
    .from(schema.payoutLedger)
    .innerJoin(schema.orders, eq(schema.payoutLedger.orderId, schema.orders.id))
    .where(eq(schema.payoutLedger.storeId, storeId))
    .orderBy(desc(schema.payoutLedger.createdAt))
    .limit(limit);
}

export interface MonthFigures {
  /** first day of the month the figures cover */
  monthStart: Date;
  /** fan sales paid this month */
  sales: number;
  /** what those sales cost the fans, tax included */
  grossCents: number;
  /** what was sent to the artist for them */
  earnedCents: number;
}

/**
 * "Earned this month" and "Sales this month": the store's payout ledger rows
 * created this month. Refunded rows are left out of both, because a refund
 * reverses the artist's transfer (stripe.ts refund uses reverse_transfer);
 * the ledger keeps no refunded amount, so a partly refunded sale drops out
 * whole. Held rows stay in: a hold only flags the row for follow-up, the
 * transfer itself already happened at checkout.
 *
 * The month starts at server-local midnight on the 1st, the same boundary
 * orders.salesSummary uses. `now` is a parameter so tests can ask about
 * another month.
 */
export async function getMonthFigures(storeId: string, now: Date = new Date()): Promise<MonthFigures> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [row] = await db
    .select({
      sales: sql<number>`count(*)`.mapWith(Number),
      grossCents: sql<number>`coalesce(sum(${schema.payoutLedger.grossCents}), 0)`.mapWith(Number),
      transferCents: sql<number>`coalesce(sum(${schema.payoutLedger.transferCents}), 0)`.mapWith(Number),
    })
    .from(schema.payoutLedger)
    .where(
      and(
        eq(schema.payoutLedger.storeId, storeId),
        gte(schema.payoutLedger.createdAt, monthStart),
        lt(schema.payoutLedger.createdAt, nextMonthStart),
        ne(schema.payoutLedger.status, 'refunded'),
      ),
    );

  return {
    monthStart,
    sales: row?.sales ?? 0,
    grossCents: row?.grossCents ?? 0,
    earnedCents: row?.transferCents ?? 0,
  };
}

export interface WaitingOnYou {
  /** quoted total of every run that is awaiting payment */
  totalCents: number;
  /** those runs, in the order given (newest first from listRunsForStore) */
  runs: RunSummary[];
}

/** "Waiting on you": the runs the artist has approved and still has to pay. */
export function waitingOnYou(runs: RunSummary[]): WaitingOnYou {
  const waiting = runs.filter((run) => run.status === 'awaiting_payment');
  return { totalCents: waiting.reduce((sum, run) => sum + (run.totalCents ?? 0), 0), runs: waiting };
}
