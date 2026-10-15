import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { revalidateStore } from '@/lib/storefront/revalidate';
import { describeServices, printServicesFor, quoteFor } from '@/lib/services/quotes';
import { renderProductMockups } from '@/lib/services/mockups';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { checkPlacementPosition } from '@/lib/mockups/placements';
import { checkProductApproval, productColourCodes, productPrintPlacement, type ProductApproval, type StoredPlacement } from '@/lib/services/print-prep';
import { samePlacement } from '@/lib/print/pipeline';

// Products are an artist's design printed on a blank, for sale in their
// shop. All ownership is scoped by storeId — every read/write here takes it
// and never trusts a bare productId alone.

export type ProductStatus = 'draft' | 'proof_pending' | 'live' | 'archived';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** A refusal that comes with where the product's artwork stands, when that is why: the sentence in `error`
 * says what is missing, and `approval` carries the step it points to (the tools build the link from it). */
export type GatedResult<T> = { ok: true; value: T } | { ok: false; error: string; approval?: ProductApproval };

export interface Placement {
  position: string;
  widthCm: number;
  offsetYcm?: number;
}

export interface ProductColourInfo {
  code: string;
  name: string;
  hex: string;
  mockupUrl: string | null;
}

export interface ProductDetail {
  id: string;
  storeId: string;
  designId: string | null;
  name: string;
  description: string | null;
  blankCode: string;
  blankName: string;
  printServiceCode: string;
  printServiceName: string;
  placement: Placement | null;
  colours: ProductColourInfo[];
  sizes: string[];
  baseCostCents: number | null;
  retailPriceCents: number | null;
  marginCents: number | null;
  status: ProductStatus;
  collectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// -- state machine ------------------------------------------------------

/** The only place product status transitions are decided. A shop product has no proof of its own now: the
 * design's approval replaces it (Print-Prep-Plan section 7), so a product goes straight from draft to live.
 * proof_pending is no longer entered; products already there can still go live, back to draft or away. */
const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['live', 'archived'],
  proof_pending: ['draft', 'live', 'archived'],
  live: ['archived'],
  archived: [],
};

/** The statuses that put a product in front of fans (proof_pending is the one from before the proof was retired). */
const SHOP_STATUSES: ProductStatus[] = ['proof_pending', 'live'];

/**
 * Why a product cannot go in front of fans, when its print method is for runs
 * only, else null. A run's backing product can carry screen print; it must
 * never reach the shop with it, so publishing asks before it acts.
 */
export async function shopMethodError(productId: string): Promise<string | null> {
  const rows = await db
    .select({ name: schema.printServices.name, availableInShop: schema.printServices.availableInShop })
    .from(schema.products)
    .innerJoin(schema.printServices, eq(schema.products.printServiceCode, schema.printServices.code))
    .where(eq(schema.products.id, productId))
    .limit(1);
  const method = rows[0];
  if (!method || method.availableInShop) return null;
  return `${method.name} is for runs, so this product can't go to your shop. Shop products print DTG or DTF.`;
}

export async function transition(productId: string, to: ProductStatus, from?: ProductStatus): Promise<ServiceResult<ProductStatus>> {
  const current =
    from ??
    (await db.select({ status: schema.products.status }).from(schema.products).where(eq(schema.products.id, productId)).limit(1))[0]?.status;
  if (!current) return { ok: false, error: 'Product not found.' };
  if (current === to) return { ok: true, value: to };
  if (!ALLOWED_TRANSITIONS[current].includes(to)) {
    return { ok: false, error: `Can't move a product from "${current}" to "${to}".` };
  }
  if (SHOP_STATUSES.includes(to)) {
    const blocked = await shopMethodError(productId);
    if (blocked) return { ok: false, error: blocked };
  }
  await db.update(schema.products).set({ status: to, updatedAt: new Date() }).where(eq(schema.products.id, productId));
  return { ok: true, value: to };
}

// -- validation helpers ---------------------------------------------------

async function validSizes(blankCode: string): Promise<Set<string>> {
  const rows = await db.select({ size: schema.blankSizes.size }).from(schema.blankSizes).where(eq(schema.blankSizes.blankCode, blankCode));
  return new Set(rows.map((r) => r.size));
}

async function validColours(blankCode: string): Promise<Map<string, { name: string; hex: string }>> {
  const rows = await db
    .select({ code: schema.colours.code, name: schema.colours.name, hex: schema.colours.hex })
    .from(schema.blankColours)
    .innerJoin(schema.colours, eq(schema.blankColours.colourCode, schema.colours.code))
    .where(eq(schema.blankColours.blankCode, blankCode));
  return new Map(rows.map((r) => [r.code, { name: r.name, hex: r.hex ?? '#000000' }]));
}

type ProductRow = typeof schema.products.$inferSelect;

async function getOwnedProductRow(storeId: string, productId: string): Promise<ProductRow | null> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.storeId, storeId)))
    .limit(1);
  return rows[0] ?? null;
}

// -- reads ------------------------------------------------------------------

export async function getProduct(storeId: string, productId: string): Promise<ProductDetail | null> {
  const rows = await db
    .select({
      id: schema.products.id,
      storeId: schema.products.storeId,
      designId: schema.products.designId,
      name: schema.products.name,
      description: schema.products.description,
      blankCode: schema.products.blankCode,
      blankName: schema.blanks.name,
      printServiceCode: schema.products.printServiceCode,
      printServiceName: schema.printServices.name,
      placement: schema.products.placement,
      baseCostCents: schema.products.baseCostCents,
      retailPriceCents: schema.products.retailPriceCents,
      status: schema.products.status,
      collectionId: schema.products.collectionId,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
    .innerJoin(schema.printServices, eq(schema.products.printServiceCode, schema.printServices.code))
    .where(and(eq(schema.products.id, productId), eq(schema.products.storeId, storeId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [colourRows, sizeRows] = await Promise.all([
    db
      .select({ code: schema.productColours.colourCode, mockupUrl: schema.productColours.mockupUrl, name: schema.colours.name, hex: schema.colours.hex })
      .from(schema.productColours)
      .innerJoin(schema.colours, eq(schema.productColours.colourCode, schema.colours.code))
      .where(eq(schema.productColours.productId, productId)),
    db.select({ size: schema.productSizes.size }).from(schema.productSizes).where(eq(schema.productSizes.productId, productId)),
  ]);

  return {
    id: row.id,
    storeId: row.storeId,
    designId: row.designId,
    name: row.name,
    description: row.description,
    blankCode: row.blankCode,
    // The name people read for the blank, never the supplier's model name.
    blankName: blankDisplayName(row.blankCode, row.blankName),
    printServiceCode: row.printServiceCode,
    printServiceName: row.printServiceName,
    placement: (row.placement as Placement | null) ?? null,
    colours: colourRows.map((c) => ({ code: c.code, name: c.name, hex: c.hex ?? '#000000', mockupUrl: c.mockupUrl })),
    sizes: sizeRows.map((s) => s.size),
    baseCostCents: row.baseCostCents,
    retailPriceCents: row.retailPriceCents,
    marginCents: row.retailPriceCents != null && row.baseCostCents != null ? row.retailPriceCents - row.baseCostCents : null,
    status: row.status,
    collectionId: row.collectionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface ProductListItem {
  id: string;
  name: string;
  blankCode: string;
  status: ProductStatus;
  imageUrl: string | null;
  retailPriceCents: number | null;
}

export async function listProducts(storeId: string, status?: ProductStatus): Promise<ProductListItem[]> {
  const conditions = [eq(schema.products.storeId, storeId)];
  if (status) conditions.push(eq(schema.products.status, status));

  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      blankCode: schema.products.blankCode,
      status: schema.products.status,
      retailPriceCents: schema.products.retailPriceCents,
    })
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(desc(schema.products.updatedAt));

  if (rows.length === 0) return [];

  const colourRows = await db
    .select({ productId: schema.productColours.productId, mockupUrl: schema.productColours.mockupUrl })
    .from(schema.productColours)
    .where(inArray(schema.productColours.productId, rows.map((r) => r.id)));

  const imageByProduct = new Map<string, string>();
  for (const c of colourRows) {
    if (c.mockupUrl && !imageByProduct.has(c.productId)) imageByProduct.set(c.productId, c.mockupUrl);
  }

  return rows.map((r) => ({ ...r, imageUrl: imageByProduct.get(r.id) ?? null }));
}

// -- writes -----------------------------------------------------------------

export interface CreateProductInput {
  storeId: string;
  designId?: string;
  blankCode: string;
  printServiceCode: string;
  placement: Placement;
  colours: string[];
  sizes: string[];
  name?: string;
  /** a run's backing product (bulk.ts), never offered by a tool: it may carry
   * a run-only method such as screen print, and transition() keeps it out of
   * the shop. Its placement was checked when the run was quoted, so it is not
   * checked again at payment, when refusing would leave a paid order half made. */
  forRun?: boolean;
}

async function applyMockups(productId: string): Promise<void> {
  // Best-effort: the render service is being built alongside this file in
  // the same wave. A throw (including its current stub "not implemented")
  // just means the product is created without preview images yet.
  try {
    const rendered = await renderProductMockups(productId);
    await Promise.all(
      rendered.map((r) =>
        db
          .update(schema.productColours)
          .set({ mockupUrl: r.url })
          .where(and(eq(schema.productColours.productId, productId), eq(schema.productColours.colourCode, r.colourCode))),
      ),
    );
  } catch {
    // no mockups yet
  }
}

export async function createProduct(input: CreateProductInput): Promise<ServiceResult<ProductDetail>> {
  const blankRows = await db.select().from(schema.blanks).where(eq(schema.blanks.code, input.blankCode)).limit(1);
  const blank = blankRows[0];
  if (!blank) return { ok: false, error: `Unknown blank code "${input.blankCode}".` };

  if (input.colours.length === 0) return { ok: false, error: 'At least one colour is required.' };
  if (input.sizes.length === 0) return { ok: false, error: 'At least one size is required.' };

  const [sizes, colours, printServices] = await Promise.all([
    validSizes(input.blankCode),
    validColours(input.blankCode),
    printServicesFor(input.blankCode),
  ]);

  // Shop products print DTG or DTF; screen print is for runs (Print-Prep-Plan section 1).
  // Whatever else the blank offers (embroidery) is outside that plan and stays as it was.
  const offered = input.forRun ? printServices : printServices.filter((p) => p.availableInShop);
  const service = printServices.find((p) => p.code === input.printServiceCode);
  if (!service) {
    const choices = offered.length > 0 ? ` Use one of: ${describeServices(offered)}.` : '';
    return { ok: false, error: `That print method isn't offered on the ${blankDisplayName(blank.code, blank.name)}.${choices}` };
  }
  if (!input.forRun && !service.availableInShop) {
    const choices = offered.length > 0 ? ` Shop products print with: ${describeServices(offered)}.` : '';
    return { ok: false, error: `${service.name} is for runs, not shop products.${choices}` };
  }
  const badColours = input.colours.filter((c) => !colours.has(c));
  if (badColours.length > 0) return { ok: false, error: `Colour(s) not available on this blank: ${badColours.join(', ')}.` };
  const badSizes = input.sizes.filter((s) => !sizes.has(s));
  if (badSizes.length > 0) return { ok: false, error: `Size(s) not available on this blank: ${badSizes.join(', ')}.` };
  if (!input.forRun) {
    const position = checkPlacementPosition(blank.type, input.placement.position);
    if (!position.ok) return { ok: false, error: position.error };
  }

  if (input.designId) {
    const designRows = await db
      .select({ id: schema.designs.id, storeId: schema.designs.storeId })
      .from(schema.designs)
      .where(eq(schema.designs.id, input.designId))
      .limit(1);
    const design = designRows[0];
    if (!design || design.storeId !== input.storeId) return { ok: false, error: 'Design not found for this shop.' };
  }

  const quote = await quoteFor({ blankCode: input.blankCode, printServiceCode: input.printServiceCode, qty: 1 });
  if (!quote) return { ok: false, error: `No pricing configured for ${input.blankCode} with ${input.printServiceCode}.` };

  // An unnamed product takes its blank's display name, never the supplier's model name.
  const name = input.name?.trim() || blankDisplayName(blank.code, blank.name);

  const [product] = await db
    .insert(schema.products)
    .values({
      storeId: input.storeId,
      designId: input.designId ?? null,
      blankCode: input.blankCode,
      printServiceCode: input.printServiceCode,
      name,
      placement: input.placement,
      baseCostCents: quote.unitBaseCostCents,
      status: 'draft',
    })
    .returning();

  await db.insert(schema.productColours).values(input.colours.map((code) => ({ productId: product.id, colourCode: code })));
  await db.insert(schema.productSizes).values(input.sizes.map((size) => ({ productId: product.id, size })));

  await applyMockups(product.id);

  const detail = await getProduct(input.storeId, product.id);
  if (!detail) return { ok: false, error: 'Product creation failed unexpectedly.' };
  return { ok: true, value: detail };
}

export interface UpdateProductPatch {
  name?: string;
  description?: string;
  placement?: Placement;
  colours?: string[];
  sizes?: string[];
  collectionId?: string | null;
}

/** A live product stays live whatever happens to its approval, but what it newly puts in front of fans needs
 * the design's approval like a first publish does: a colour it didn't have, or another print position or
 * width (every colour then prints there). Null when the edit adds nothing, or is covered. */
async function liveEditApproval(product: ProductRow, patch: UpdateProductPatch): Promise<ProductApproval | null> {
  if (product.status !== 'live' || (!patch.colours && !patch.placement)) return null;
  const current = await productColourCodes(product.id);
  const next = patch.colours ?? current;
  const placement = patch.placement ?? (product.placement as StoredPlacement | null);
  const moved = Boolean(patch.placement) && !samePlacement(productPrintPlacement(patch.placement), productPrintPlacement(product.placement as StoredPlacement | null));
  const toCover = moved ? next : next.filter((code) => !current.includes(code));
  if (toCover.length === 0) return null;
  const approval = await checkProductApproval(product, { colours: toCover, placement, nameColours: !moved });
  return approval.covered ? null : approval;
}

export async function updateProduct(storeId: string, productId: string, patch: UpdateProductPatch): Promise<GatedResult<ProductDetail>> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  if (product.status === 'archived') return { ok: false, error: 'This product is archived and can no longer be edited.' };

  if (patch.collectionId) {
    const collectionRows = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.id, patch.collectionId), eq(schema.collections.storeId, storeId)))
      .limit(1);
    if (collectionRows.length === 0) return { ok: false, error: 'Collection not found for this shop.' };
  }

  if (patch.placement) {
    const blankRows = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, product.blankCode)).limit(1);
    const position = checkPlacementPosition(blankRows[0]?.type ?? '', patch.placement.position);
    if (!position.ok) return { ok: false, error: position.error };
  }

  if (patch.colours) {
    if (patch.colours.length === 0) return { ok: false, error: 'At least one colour is required.' };
    const colours = await validColours(product.blankCode);
    const bad = patch.colours.filter((c) => !colours.has(c));
    if (bad.length > 0) return { ok: false, error: `Colour(s) not available on this blank: ${bad.join(', ')}.` };
  }
  if (patch.sizes) {
    if (patch.sizes.length === 0) return { ok: false, error: 'At least one size is required.' };
    const sizes = await validSizes(product.blankCode);
    const bad = patch.sizes.filter((s) => !sizes.has(s));
    if (bad.length > 0) return { ok: false, error: `Size(s) not available on this blank: ${bad.join(', ')}.` };
  }

  // Nothing is written before this: a refused edit leaves the live product as it was.
  const uncovered = await liveEditApproval(product, patch);
  if (uncovered) return { ok: false, error: uncovered.sentence ?? 'Approve the artwork first.', approval: uncovered };

  await db
    .update(schema.products)
    .set({
      name: patch.name ?? product.name,
      description: patch.description ?? product.description,
      placement: patch.placement ?? product.placement,
      collectionId: patch.collectionId === undefined ? product.collectionId : patch.collectionId,
      updatedAt: new Date(),
    })
    .where(eq(schema.products.id, productId));

  if (patch.colours) {
    await db.delete(schema.productColours).where(eq(schema.productColours.productId, productId));
    await db.insert(schema.productColours).values(patch.colours.map((code) => ({ productId, colourCode: code })));
  }
  if (patch.sizes) {
    await db.delete(schema.productSizes).where(eq(schema.productSizes.productId, productId));
    await db.insert(schema.productSizes).values(patch.sizes.map((size) => ({ productId, size })));
  }

  if (patch.colours) await applyMockups(productId);

  const detail = await getProduct(storeId, productId);
  if (!detail) return { ok: false, error: 'Product update failed unexpectedly.' };
  await revalidateStore(storeId);
  return { ok: true, value: detail };
}

export interface SetPriceResult {
  retailPriceCents: number;
  marginCents: number;
}

export async function setPrice(storeId: string, productId: string, retailCents: number): Promise<ServiceResult<SetPriceResult>> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  if (product.baseCostCents == null) return { ok: false, error: 'This product has no base cost snapshot yet.' };

  const minCents = product.baseCostCents + 100; // base cost + at least EUR 1 margin
  if (retailCents < minCents) {
    return { ok: false, error: `Price must be at least €${(minCents / 100).toFixed(2)} (base cost plus a €1 minimum margin).` };
  }

  await db.update(schema.products).set({ retailPriceCents: retailCents, updatedAt: new Date() }).where(eq(schema.products.id, productId));
  await revalidateStore(storeId);
  return { ok: true, value: { retailPriceCents: retailCents, marginCents: retailCents - product.baseCostCents } };
}

export async function archiveProduct(storeId: string, productId: string): Promise<ServiceResult<ProductDetail>> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };

  const result = await transition(productId, 'archived', product.status);
  if (!result.ok) return result;

  const detail = await getProduct(storeId, productId);
  if (!detail) return { ok: false, error: 'Archive failed unexpectedly.' };
  await revalidateStore(storeId);
  return { ok: true, value: detail };
}

export type PublishCheck = { ok: true; product: ProductRow } | { ok: false; error: string; approval?: ProductApproval };

/** Everything a publish asks of a product, in order, without publishing it (so the assistant can refuse before
 * it shows a confirm card). The design's approval is the gate: a product goes live only when its design's
 * current version has an approval covering its blank, every enabled colour and its print position and width
 * (print-prep.ts approvalCoverage). That one approval replaces the per-product proof (Print-Prep-Plan section 7),
 * so a draft is published with no proof at all, and a proof a product happens to have (from before the proof
 * was retired) is neither asked nor read. The artwork comes right after the status and the print method, before
 * the price and payouts: it is the step an artist can't skip, so it is the one to say first. A product already
 * live is never taken down by it: only a publish, and adding a colour or position to a live product, ask. */
export async function checkPublishable(storeId: string, productId: string): Promise<PublishCheck> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  if (product.status === 'live') return { ok: false, error: 'This product is already live.' };
  if (product.status === 'archived') return { ok: false, error: 'This product is archived and can no longer be published.' };

  // A run's backing product can carry screen print; it never reaches the shop with it.
  const blocked = await shopMethodError(productId);
  if (blocked) return { ok: false, error: blocked };

  const approval = await checkProductApproval(product, { colours: await productColourCodes(productId), placement: product.placement as StoredPlacement | null });
  if (!approval.covered) return { ok: false, error: approval.sentence ?? 'Approve the artwork first.', approval };

  // Fans must never see a product without a retail price.
  if (!product.retailPriceCents || product.retailPriceCents < (product.baseCostCents ?? 0) + 100) {
    return { ok: false, error: 'Set a retail price (at least €1 above the base cost) before publishing.' };
  }

  const stripeRows = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, storeId)).limit(1);
  const stripe = stripeRows[0];
  if (!stripe?.chargesEnabled || !stripe?.payoutsEnabled) {
    return {
      ok: false,
      error: 'Publishing is blocked until Stripe payouts are connected and both charges and payouts are enabled for your shop.',
    };
  }
  return { ok: true, product };
}

/** The only way a product goes live: transition() is never asked for it anywhere else. */
export async function publishProduct(storeId: string, productId: string): Promise<GatedResult<ProductDetail>> {
  const checked = await checkPublishable(storeId, productId);
  if (!checked.ok) return checked;

  const result = await transition(productId, 'live', checked.product.status);
  if (!result.ok) return result;

  const detail = await getProduct(storeId, productId);
  if (!detail) return { ok: false, error: 'Publish failed unexpectedly.' };
  await revalidateStore(storeId);
  return { ok: true, value: detail };
}
