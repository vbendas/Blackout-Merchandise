import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ServiceResult } from '@/lib/services/products';

// Proofs are the mockup-approval step for a bulk order, a run (see bulk_order_id
// on the table). A shop product has no proof of its own any more: one approval
// of its design replaces it (Print-Prep-Plan section 7; print-prep.ts
// approvalCoverage), and a product goes from draft straight to live. Proof rows
// that products already have stay in the table and stay readable
// (getLatestProof), but nothing writes them and nothing asks for them. The
// bulk-order functions below (createBulkProof / setBulkProofStatus /
// getLatestBulkProof) touch only this table; bulk.ts owns the bulk_orders state
// machine that wraps them (submitBulkProof / approveBulkProof /
// requestBulkChanges).

export type ProofStatus = 'pending' | 'approved' | 'changes_requested';

export interface ProofSpecLine {
  label: string;
  value: string;
}

export interface ProofDetail {
  id: string;
  /** null for a bulk-order proof */
  productId: string | null;
  /** null for a product proof */
  bulkOrderId: string | null;
  version: number;
  mockupUrls: string[];
  spec: ProofSpecLine[];
  status: ProofStatus;
  notes: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
}

type ProofRow = typeof schema.proofs.$inferSelect;

function toProofDetail(row: ProofRow): ProofDetail {
  return {
    id: row.id,
    productId: (row.productId as string | null) ?? null,
    bulkOrderId: (row.bulkOrderId as string | null) ?? null,
    version: row.version,
    mockupUrls: Array.isArray(row.mockupUrls) ? (row.mockupUrls as string[]) : [],
    spec: Array.isArray(row.spec) ? (row.spec as ProofSpecLine[]) : [],
    status: row.status,
    notes: row.notes,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt,
  };
}

/** Latest proof (any status) for a product, scoped to the owning store. Read only: it shows the proof a product
 * had from before shop products stopped needing one. */
export async function getLatestProof(storeId: string, productId: string): Promise<ProofDetail | null> {
  const rows = await db
    .select({ proof: schema.proofs })
    .from(schema.proofs)
    .innerJoin(schema.products, eq(schema.proofs.productId, schema.products.id))
    .where(and(eq(schema.proofs.productId, productId), eq(schema.products.storeId, storeId)))
    .orderBy(desc(schema.proofs.version))
    .limit(1);
  return rows[0] ? toProofDetail(rows[0].proof) : null;
}

// -- bulk-order proofs -------------------------------------------------
//
// These only touch the proofs table; bulk.ts's submitBulkProof /
// approveBulkProof / requestBulkChanges wrap them with the bulk_orders
// status transition (proofs.ts has no notion of bulk_order_status).

/** Inserts the next version for a bulk order's proof. Caller (bulk.ts)
 * already validated the bulk order is in a state that allows a new proof. */
export async function createBulkProof(bulkOrderId: string, mockupUrls: string[], spec: ProofSpecLine[]): Promise<ProofDetail> {
  const lastVersionRows = await db
    .select({ version: schema.proofs.version })
    .from(schema.proofs)
    .where(eq(schema.proofs.bulkOrderId, bulkOrderId))
    .orderBy(desc(schema.proofs.version))
    .limit(1);
  const version = (lastVersionRows[0]?.version ?? 0) + 1;

  const [proof] = await db.insert(schema.proofs).values({ bulkOrderId, version, mockupUrls, spec, status: 'pending' }).returning();
  return toProofDetail(proof);
}

async function getOwnedBulkProof(storeId: string, proofId: string): Promise<ProofRow | null> {
  const rows = await db
    .select({ proof: schema.proofs })
    .from(schema.proofs)
    .innerJoin(schema.bulkOrders, eq(schema.proofs.bulkOrderId, schema.bulkOrders.id))
    .where(and(eq(schema.proofs.id, proofId), eq(schema.bulkOrders.storeId, storeId)))
    .limit(1);
  return rows[0]?.proof ?? null;
}

/** Approve or send-back a bulk order's proof row. Mirrors approveProof /
 * requestChanges but scoped by bulk_orders instead of products, and without
 * a state-machine side effect (bulk.ts applies that after this succeeds). */
export async function setBulkProofStatus(
  storeId: string,
  proofId: string,
  status: 'approved' | 'changes_requested',
  opts: { userId?: string; notes?: string } = {},
): Promise<ServiceResult<ProofDetail>> {
  const proof = await getOwnedBulkProof(storeId, proofId);
  if (!proof) return { ok: false, error: 'Proof not found for this bulk order.' };
  if (proof.status !== 'pending') {
    const verb = status === 'approved' ? 'approved' : 'sent back for changes';
    return { ok: false, error: `Only a pending proof can be ${verb} (this one is "${proof.status}").` };
  }

  const [updated] = await db
    .update(schema.proofs)
    .set(
      status === 'approved'
        ? { status: 'approved' as const, approvedAt: new Date(), approvedBy: opts.userId ?? null }
        : { status: 'changes_requested' as const, notes: opts.notes ?? null },
    )
    .where(eq(schema.proofs.id, proofId))
    .returning();

  return { ok: true, value: toProofDetail(updated) };
}

/** Latest proof (any status) for a bulk order, scoped to the owning store. */
export async function getLatestBulkProof(storeId: string, bulkOrderId: string): Promise<ProofDetail | null> {
  const rows = await db
    .select({ proof: schema.proofs })
    .from(schema.proofs)
    .innerJoin(schema.bulkOrders, eq(schema.proofs.bulkOrderId, schema.bulkOrders.id))
    .where(and(eq(schema.proofs.bulkOrderId, bulkOrderId), eq(schema.bulkOrders.storeId, storeId)))
    .orderBy(desc(schema.proofs.version))
    .limit(1);
  return rows[0] ? toProofDetail(rows[0].proof) : null;
}
