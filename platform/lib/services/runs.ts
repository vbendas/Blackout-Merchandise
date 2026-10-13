import { and, asc, count, eq, lt, lte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '@/lib/db';
import { runLabel } from '@/lib/format/runs';
import type { BulkOrderStatus } from '@/lib/services/bulk';

// Runs, as artists see them: a run is one bulk_orders row. No number is
// stored; a run's number is its position in its own shop's history (oldest
// is Run 1), ordered by created_at and then id. Cancelled runs keep their
// place, so numbers never shift. Ordering stays in SQL: created_at has
// microsecond precision that a JS Date would round away.

export { runLabel };

export interface RunSummary {
  id: string;
  /** 1-based position in the shop's run history */
  number: number;
  /** 'Run 3' */
  label: string;
  status: BulkOrderStatus;
  createdAt: Date;
  /** the quoted total (bulk_orders.quote.totalCents, as billing reads it); null before a quote exists */
  totalCents: number | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function quoteTotalCents(quote: unknown): number | null {
  const total = (quote as { totalCents?: unknown } | null)?.totalCents;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

/** Every run of a store, newest first. */
export async function listRunsForStore(storeId: string): Promise<RunSummary[]> {
  const rows = await db
    .select({
      id: schema.bulkOrders.id,
      status: schema.bulkOrders.status,
      createdAt: schema.bulkOrders.createdAt,
      quote: schema.bulkOrders.quote,
    })
    .from(schema.bulkOrders)
    .where(eq(schema.bulkOrders.storeId, storeId))
    .orderBy(asc(schema.bulkOrders.createdAt), asc(schema.bulkOrders.id));

  return rows
    .map((row, index) => ({
      id: row.id,
      number: index + 1,
      label: runLabel(index + 1),
      status: row.status,
      createdAt: row.createdAt,
      totalCents: quoteTotalCents(row.quote),
    }))
    .reverse();
}

/** The run number of one bulk order, or null when there is no such order. */
export async function runNumberFor(bulkOrderId: string): Promise<number | null> {
  if (!UUID.test(bulkOrderId)) return null;
  const target = alias(schema.bulkOrders, 'target');
  // Count the shop's runs that sort at or before this one.
  const [row] = await db
    .select({ n: count() })
    .from(schema.bulkOrders)
    .innerJoin(target, eq(target.id, bulkOrderId))
    .where(
      and(
        eq(schema.bulkOrders.storeId, target.storeId),
        or(
          lt(schema.bulkOrders.createdAt, target.createdAt),
          and(eq(schema.bulkOrders.createdAt, target.createdAt), lte(schema.bulkOrders.id, target.id)),
        ),
      ),
    );
  const n = Number(row?.n ?? 0);
  return n > 0 ? n : null;
}
