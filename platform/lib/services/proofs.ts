import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getProduct, transition, type ServiceResult } from '@/lib/services/products';

// Proofs are the mockup-approval step for a product. Submitting one moves
// the product draft -> proof_pending; approving it leaves the product in
// proof_pending (publishProduct is the only thing that flips it to live);
// requesting changes moves it back to draft.

export type ProofStatus = 'pending' | 'approved' | 'changes_requested';

export interface ProofSpecLine {
  label: string;
  value: string;
}

export interface ProofDetail {
  id: string;
  productId: string;
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
    productId: row.productId as string,
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

export async function submitProof(storeId: string, productId: string): Promise<ServiceResult<ProofDetail>> {
  const product = await getProduct(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  if (product.status !== 'draft') {
    return { ok: false, error: `A proof can only be submitted from draft (this product is "${product.status}").` };
  }

  const lastVersionRows = await db
    .select({ version: schema.proofs.version })
    .from(schema.proofs)
    .where(eq(schema.proofs.productId, productId))
    .orderBy(desc(schema.proofs.version))
    .limit(1);
  const version = (lastVersionRows[0]?.version ?? 0) + 1;

  const mockupUrls = product.colours.map((c) => c.mockupUrl).filter((u): u is string => !!u);
  const spec: ProofSpecLine[] = [
    { label: 'Blank', value: `${product.blankName} (${product.blankCode})` },
    { label: 'Print service', value: product.printServiceName },
    { label: 'Placement', value: product.placement ? `${product.placement.position}, ${product.placement.widthCm}cm` : 'Not set' },
    { label: 'Colours', value: product.colours.map((c) => c.name).join(', ') || 'None' },
    { label: 'Sizes', value: product.sizes.join(', ') || 'None' },
    { label: 'Base cost', value: product.baseCostCents != null ? `€${(product.baseCostCents / 100).toFixed(2)}` : 'Not priced' },
  ];

  const [proof] = await db.insert(schema.proofs).values({ productId, version, mockupUrls, spec, status: 'pending' }).returning();

  const moved = await transition(productId, 'proof_pending', product.status);
  if (!moved.ok) return moved;

  return { ok: true, value: toProofDetail(proof) };
}

async function getOwnedProof(storeId: string, proofId: string): Promise<ProofRow | null> {
  const rows = await db
    .select({ proof: schema.proofs })
    .from(schema.proofs)
    .innerJoin(schema.products, eq(schema.proofs.productId, schema.products.id))
    .where(and(eq(schema.proofs.id, proofId), eq(schema.products.storeId, storeId)))
    .limit(1);
  return rows[0]?.proof ?? null;
}

export async function approveProof(storeId: string, proofId: string, userId: string): Promise<ServiceResult<ProofDetail>> {
  const proof = await getOwnedProof(storeId, proofId);
  if (!proof) return { ok: false, error: 'Proof not found for this shop.' };
  if (proof.status !== 'pending') return { ok: false, error: `Only a pending proof can be approved (this one is "${proof.status}").` };

  const [updated] = await db
    .update(schema.proofs)
    .set({ status: 'approved', approvedAt: new Date(), approvedBy: userId })
    .where(eq(schema.proofs.id, proofId))
    .returning();

  // Product stays proof_pending — publishProduct is the gate that flips it live.
  return { ok: true, value: toProofDetail(updated) };
}

export async function requestChanges(storeId: string, proofId: string, notes: string): Promise<ServiceResult<ProofDetail>> {
  const proof = await getOwnedProof(storeId, proofId);
  if (!proof) return { ok: false, error: 'Proof not found for this shop.' };
  if (proof.status !== 'pending') {
    return { ok: false, error: `Only a pending proof can be sent back for changes (this one is "${proof.status}").` };
  }

  const [updated] = await db
    .update(schema.proofs)
    .set({ status: 'changes_requested', notes })
    .where(eq(schema.proofs.id, proofId))
    .returning();

  const moved = await transition(proof.productId as string, 'draft');
  if (!moved.ok) return moved;

  return { ok: true, value: toProofDetail(updated) };
}

/** Latest proof (any status) for a product, scoped to the owning store. */
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
