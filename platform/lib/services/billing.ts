import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export interface PayoutRow {
  id: string;
  createdAt: Date;
  grossCents: number;
  transferCents: number;
  status: string;
}

/** Last 20 payout ledger rows for a store, newest first. Read-only. */
export async function listRecentPayouts(storeId: string, limit = 20): Promise<PayoutRow[]> {
  return db
    .select({
      id: schema.payoutLedger.id,
      createdAt: schema.payoutLedger.createdAt,
      grossCents: schema.payoutLedger.grossCents,
      transferCents: schema.payoutLedger.transferCents,
      status: schema.payoutLedger.status,
    })
    .from(schema.payoutLedger)
    .where(eq(schema.payoutLedger.storeId, storeId))
    .orderBy(desc(schema.payoutLedger.createdAt))
    .limit(limit);
}
