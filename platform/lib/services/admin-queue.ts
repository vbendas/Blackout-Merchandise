import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { listAnomalies } from '@/lib/services/payouts';
import { listProduction } from '@/lib/services/production';
import { listSupplierOrders } from '@/lib/services/supplier';

// The admin morning queue: everything waiting on a human, grouped into fixed
// sections. Every section is read-only and capped at 8 items — this is a
// summary, not a full table (list_production / list_supplier_orders /
// list_payout_anomalies give the full lists).

export interface QueueItem {
  id: string;
  text: string;
  meta?: string;
  prompt?: string;
}

export interface QueueSection {
  key: string;
  title: string;
  count: number;
  items: QueueItem[];
}

export interface AdminQueue {
  sections: QueueSection[];
  generatedAt: string;
}

const CAP = 8;

function cap<T>(items: T[]): T[] {
  return items.slice(0, CAP);
}

function eur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

async function payoutAnomaliesSection(): Promise<QueueSection> {
  const rows = (await listAnomalies()).filter((r) => !r.reviewedAt);
  const items = cap(rows).map((r) => ({
    id: r.id,
    text: `${eur(r.grossCents)} — ${(r.anomalyFlags as string[] | null)?.join(', ') || 'flagged'}`,
    meta: r.status,
    prompt: `Review payout ${r.id}`,
  }));
  return { key: 'payout_anomalies', title: 'Payout anomalies', count: rows.length, items };
}

async function productionSection(): Promise<QueueSection> {
  const rows = await listProduction({});
  const active = rows.filter((r) => r.productionStatus === 'queued' || r.productionStatus === 'printing');
  const items = cap(active).map((r) => ({
    id: r.orderId,
    text: `${r.reference} — ${r.storeName}`,
    meta: `${r.productionStatus} · ${r.itemsSummary}`,
    prompt: `Open order ${r.orderId}`,
  }));
  return { key: 'production', title: 'Production', count: active.length, items };
}

async function bulkAwaitingPaymentSection(): Promise<QueueSection> {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: schema.bulkOrders.id, storeName: schema.artistStores.name, createdAt: schema.bulkOrders.createdAt })
    .from(schema.bulkOrders)
    .innerJoin(schema.artistStores, eq(schema.bulkOrders.storeId, schema.artistStores.id))
    .where(and(eq(schema.bulkOrders.status, 'awaiting_payment'), lt(schema.bulkOrders.createdAt, cutoff)))
    .orderBy(asc(schema.bulkOrders.createdAt));
  const items = cap(rows).map((r) => ({
    id: r.id,
    text: `${r.storeName} — bulk order awaiting payment`,
    meta: r.createdAt.toISOString().slice(0, 10),
    prompt: `Open bulk order ${r.id}`,
  }));
  return { key: 'bulk_awaiting_payment', title: 'Bulk awaiting payment', count: rows.length, items };
}

async function supplierDraftsSection(): Promise<QueueSection> {
  const rows = await listSupplierOrders('draft');
  const items = cap(rows).map((r) => ({
    id: r.id,
    text: `${r.poNumber} — ${r.totalUnits} units`,
    meta: r.supplier,
    prompt: `Open supplier order ${r.id}`,
  }));
  return { key: 'supplier_drafts', title: 'Supplier drafts', count: rows.length, items };
}

async function domainsStuckSection(): Promise<QueueSection> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: schema.customDomains.id, hostname: schema.customDomains.hostname, createdAt: schema.customDomains.createdAt })
    .from(schema.customDomains)
    .where(and(eq(schema.customDomains.status, 'verifying'), lt(schema.customDomains.createdAt, cutoff)))
    .orderBy(asc(schema.customDomains.createdAt));
  const items = cap(rows).map((r) => ({
    id: r.id,
    text: `${r.hostname} — still verifying`,
    meta: r.createdAt.toISOString().slice(0, 10),
    prompt: `Check domain ${r.hostname}`,
  }));
  return { key: 'domains_stuck', title: 'Domains stuck', count: rows.length, items };
}

/** Guarded: another agent is migrating the waitlist table shape (renamed to
 * waitlist_signups, numeric id, no name column), so a schema mismatch here
 * degrades to an empty section instead of breaking the queue. */
async function waitlistSection(): Promise<QueueSection> {
  try {
    const rows = await db
      .select({ id: schema.waitlistSignups.id, email: schema.waitlistSignups.email, createdAt: schema.waitlistSignups.createdAt })
      .from(schema.waitlistSignups)
      .where(eq(schema.waitlistSignups.status, 'pending'))
      .orderBy(asc(schema.waitlistSignups.createdAt));
    const items = cap(rows).map((r) => ({ id: String(r.id), text: r.email, prompt: `Review waitlist ${r.id}` }));
    return { key: 'waitlist', title: 'Waitlist', count: rows.length, items };
  } catch (err) {
    console.error('[admin-queue] waitlist section failed:', err instanceof Error ? err.message : err);
    return { key: 'waitlist', title: 'Waitlist', count: 0, items: [] };
  }
}

/** Guarded: support tickets are owned by another agent's wave. */
async function supportSection(): Promise<QueueSection> {
  try {
    const rows = await db
      .select({ id: schema.supportTickets.id, subject: schema.supportTickets.subject, status: schema.supportTickets.status })
      .from(schema.supportTickets)
      .where(inArray(schema.supportTickets.status, ['pending', 'assigned', 'in_progress']))
      .orderBy(asc(schema.supportTickets.createdAt));
    const items = cap(rows).map((r) => ({ id: r.id, text: r.subject, meta: r.status, prompt: `Open ticket ${r.id}` }));
    return { key: 'support', title: 'Support', count: rows.length, items };
  } catch (err) {
    console.error('[admin-queue] support section failed:', err instanceof Error ? err.message : err);
    return { key: 'support', title: 'Support', count: 0, items: [] };
  }
}

export async function buildQueue(): Promise<AdminQueue> {
  const sections = await Promise.all([
    payoutAnomaliesSection(),
    productionSection(),
    bulkAwaitingPaymentSection(),
    supplierDraftsSection(),
    domainsStuckSection(),
    waitlistSection(),
    supportSection(),
  ]);
  return { sections, generatedAt: new Date().toISOString() };
}
