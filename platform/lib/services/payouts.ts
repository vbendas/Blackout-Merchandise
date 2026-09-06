import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Anomaly rules over the payout_ledger audit trail (Platform-Plan.md §6).
// These never block a sale — they flag a ledger row for admin review after
// the fact (list_payout_anomalies / review_payout land in wave 3).

export type AnomalyFlag = 'fee_below_cost' | 'transfer_mismatch' | 'account_payouts_disabled' | 'refund_after_ship';

export interface AnomalyInput {
  storeId: string;
  grossCents: number;
  applicationFeeCents: number;
  transferCents: number;
  taxCents: number;
  /** Σ(qty × unitBaseCostCents) across the order's line items */
  baseCostTotalCents: number;
}

/** Structural checks run at markPaid time. 'refund_after_ship' is added
 * separately, at refund time, by orders.ts. */
export async function anomalyFlags(input: AnomalyInput): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  if (input.applicationFeeCents < input.baseCostTotalCents) flags.push('fee_below_cost');

  // transfer should equal what's left after MerchFrom's fee and the tax
  // Stripe collected — see stripe.ts's transferAmountCents doc. 1-cent slack
  // for rounding.
  const expectedTransfer = input.grossCents - input.applicationFeeCents - input.taxCents;
  if (Math.abs(expectedTransfer - input.transferCents) > 1) flags.push('transfer_mismatch');

  const stripeRows = await db
    .select({ payoutsEnabled: schema.stripeAccounts.payoutsEnabled })
    .from(schema.stripeAccounts)
    .where(eq(schema.stripeAccounts.storeId, input.storeId))
    .limit(1);
  if (!stripeRows[0]?.payoutsEnabled) flags.push('account_payouts_disabled');

  return flags;
}

export type PayoutLedgerRow = typeof schema.payoutLedger.$inferSelect;

/** Ledger rows carrying at least one anomaly flag, newest first. */
export async function listAnomalies(storeId?: string): Promise<PayoutLedgerRow[]> {
  const rows = await db
    .select()
    .from(schema.payoutLedger)
    .where(storeId ? eq(schema.payoutLedger.storeId, storeId) : undefined)
    .orderBy(desc(schema.payoutLedger.createdAt));

  return rows.filter((r) => Array.isArray(r.anomalyFlags) && (r.anomalyFlags as string[]).length > 0);
}

/** Appends a flag (deduped) to the most recent ledger row for an order and
 * marks it reviewed-pending again — used by refundOrder / the charge.refunded
 * webhook to record 'refund_after_ship' after the fact. */
export async function flagLedgerForOrder(orderId: string, flag: AnomalyFlag, status?: string): Promise<void> {
  const rows = await db
    .select()
    .from(schema.payoutLedger)
    .where(and(eq(schema.payoutLedger.orderId, orderId)))
    .orderBy(desc(schema.payoutLedger.createdAt))
    .limit(1);
  const ledger = rows[0];
  if (!ledger) return;

  const flags = new Set(Array.isArray(ledger.anomalyFlags) ? (ledger.anomalyFlags as string[]) : []);
  flags.add(flag);

  await db
    .update(schema.payoutLedger)
    .set({ anomalyFlags: [...flags], ...(status ? { status } : {}), reviewedAt: new Date() })
    .where(eq(schema.payoutLedger.id, ledger.id));
}

/** Updates the most recent ledger row's status without touching its anomaly
 * flags — used when a refund applies but 'refund_after_ship' doesn't. */
export async function setLedgerStatus(orderId: string, status: string): Promise<void> {
  const rows = await db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.orderId, orderId)).orderBy(desc(schema.payoutLedger.createdAt)).limit(1);
  const ledger = rows[0];
  if (!ledger) return;
  await db.update(schema.payoutLedger).set({ status, reviewedAt: new Date() }).where(eq(schema.payoutLedger.id, ledger.id));
}

type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Admin verdict on one flagged ledger row (wave 3 — lib/tools/admin.ts's
 * review_payout). 'ok' clears the row from listAnomalies' unreviewed view by
 * setting reviewedAt; 'hold' marks it for follow-up without clearing it, so
 * it keeps showing up in the admin queue. The tool's optional note isn't
 * persisted here — it's captured in the tool_invocations audit trail
 * (recorded automatically for every tool call) rather than overloading
 * anomaly_flags with free text.
 */
export async function reviewPayout(ledgerId: string, verdict: 'ok' | 'hold'): Promise<ServiceResult<PayoutLedgerRow>> {
  const rows = await db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.id, ledgerId)).limit(1);
  if (!rows[0]) return { ok: false, error: 'Payout ledger row not found.' };

  const [updated] = await db
    .update(schema.payoutLedger)
    .set(verdict === 'ok' ? { status: 'reviewed', reviewedAt: new Date() } : { status: 'held' })
    .where(eq(schema.payoutLedger.id, ledgerId))
    .returning();
  return updated ? { ok: true, value: updated } : { ok: false, error: 'Failed to update the payout ledger row.' };
}
