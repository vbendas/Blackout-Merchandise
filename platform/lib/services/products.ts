import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { revalidateStore } from '@/lib/storefront/revalidate';
import { describeServices, printServicesFor, quoteFor } from '@/lib/services/quotes';
import { renderProductMockups } from '@/lib/services/mockups';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { areaSide, checkPrintAreas, defaultAreaWidthCm, isSleevePosition, positionsFor, printPositionLabel, sortAreas, type ProductArea } from '@/lib/mockups/placements';
import { checkProductApproval, productAreas, productColourCodes, productPrintPlacement, productSleeveProofs, type ProductApproval } from '@/lib/services/print-prep';
import { samePlacement } from '@/lib/print/pipeline';
import { podPrice, type PodPriceLine } from '@/lib/pricing/pod';
import { POD_LINE_LABELS } from '@/lib/pricing/pod-table';

// Products are an artist's design printed on a blank, for sale in their
// shop. All ownership is scoped by storeId — every read/write here takes it
// and never trusts a bare productId alone.
//
// A product prints one or more print areas (products.placements, owner
// decision of 16 Oct 2026): at most one front, one back, and the sleeves, each
// with its own design, so the front and the back can be different artwork.
// Its base cost is podPrice() for those areas (lib/pricing/pod.ts): the
// garment's base price with one print, plus the extras for front and back and
// for sleeve prints. It is taken again whenever the areas change, and the
// retail price never goes below it.

export type ProductStatus = 'draft' | 'proof_pending' | 'live' | 'archived';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** A refusal that comes with where the product's artwork stands, when that is why: the sentence in `error`
 * says what is missing, and `approval` carries the step it points to (the tools build the link from it). A change of
 * print areas that would put the base cost above the product's price comes back with `priceNeeded`: the new base and
 * the lowest price that works with it, so the artist can be asked for a new price. */
export type GatedResult<T> = { ok: true; value: T } | { ok: false; error: string; approval?: ProductApproval; priceNeeded?: PriceNeeded };

export interface PriceNeeded {
  baseCostCents: number;
  /** the base cost plus the €1 minimum margin */
  minRetailCents: number;
  retailPriceCents: number;
  lines: ProductPriceLine[];
}

export interface Placement {
  position: string;
  widthCm: number;
  offsetYcm?: number;
}

/** A print area as callers give it. Left out: the width is the usual one for that position (and the art's shape), the
 * design is the one already printed there, else the product's own. */
export interface AreaInput {
  position: string;
  widthCm?: number;
  offsetYcm?: number;
  designId?: string | null;
}

/** One print area of a product, as the artist reads it. */
export interface ProductAreaDetail {
  position: string;
  /** 'Front chest', 'Left sleeve' */
  label: string;
  widthCm: number;
  /** the width times the art's aspect, when the art's size is known */
  heightCm: number | null;
  offsetYcm?: number;
  designId: string | null;
  /** a sleeve: no garment photo, a flat proof */
  sleeve: boolean;
}

/** A line of what the base cost is made of, as the artist reads it: 'Garment with one print', 'Front and back', 'Sleeve prints'. */
export type ProductPriceLine = Pick<PodPriceLine, 'key' | 'label' | 'cents'>;

/** The €1 a price must be above the base cost. */
export const MIN_MARGIN_CENTS = 100;

export interface ProductColourInfo {
  code: string;
  name: string;
  hex: string;
  mockupUrl: string | null;
  /** a picture of every side that prints: front, back, and each sleeve as its flat proof */
  views: Partial<Record<MockupView, string>>;
}

export type MockupView = 'front' | 'back' | 'sleeve_left' | 'sleeve_right';

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
  /** the main print area (the first of `areas`): what single-area callers read */
  placement: Placement | null;
  /** every print area, front first, then the back, then the sleeves */
  areas: ProductAreaDetail[];
  /** the areas the product could still add (the garment takes them and the rules allow them): 'back', 'sleeve_left'... */
  addableAreas: string[];
  colours: ProductColourInfo[];
  sizes: string[];
  baseCostCents: number | null;
  /** what the base cost is made of (empty when unknown) */
  baseCostLines: ProductPriceLine[];
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

// -- print areas ----------------------------------------------------------------

type DesignShape = { storeId: string; widthPx: number | null; heightPx: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The designs by id, with the shop each belongs to. Something that isn't a design id is simply not found. */
async function designShapes(ids: (string | null | undefined)[]): Promise<Map<string, DesignShape>> {
  const unique = [...new Set(ids.filter((id): id is string => typeof id === 'string' && UUID.test(id)))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: schema.designs.id, storeId: schema.designs.storeId, widthPx: schema.designs.widthPx, heightPx: schema.designs.heightPx })
    .from(schema.designs)
    .where(inArray(schema.designs.id, unique));
  return new Map(rows.map((r) => [r.id, { storeId: r.storeId, widthPx: r.widthPx, heightPx: r.heightPx }]));
}

/** The art's height over its width, when its size is known. */
function aspectOf(shape: DesignShape | undefined): number | null {
  return shape?.widthPx && shape.heightPx ? shape.heightPx / shape.widthPx : null;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

function heightOf(area: ProductArea, shapes: Map<string, DesignShape>): number | null {
  const aspect = aspectOf(area.designId ? shapes.get(area.designId) : undefined);
  return aspect ? tenth(area.widthCm * aspect) : null;
}

/** Two lists of areas print the same: the same positions at the same sizes and offsets, with the same designs. */
function sameAreas(a: readonly ProductArea[], b: readonly ProductArea[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((area) => b.some((other) => other.position === area.position && other.designId === area.designId && samePlacement(productPrintPlacement(area), productPrintPlacement(other))));
}

/** What products.placements stores for an area: no undefined keys, no offset at the standard position. */
function storedArea(area: ProductArea): ProductArea {
  return { position: area.position, widthCm: area.widthCm, ...(area.offsetYcm ? { offsetYcm: area.offsetYcm } : {}), designId: area.designId };
}

type ResolvedAreas = { ok: true; areas: ProductArea[]; shapes: Map<string, DesignShape> } | { ok: false; error: string };

/** The print areas callers asked for, filled in and checked: each design is this shop's, each area has a width (the
 * usual one for its position and the art's shape when left out) and the areas follow the rules in
 * lib/mockups/placements.ts (one front, one back, sleeves only where there are sleeves, A2 at most). `current` is what
 * the product prints now: an area left without a design keeps the one printed there, else the product's own. A run's
 * backing product keeps what the run was quoted with: nothing is checked again at payment. */
async function resolveAreas(
  blank: { code: string; type: string },
  storeId: string,
  wanted: readonly AreaInput[],
  opts: { current?: readonly ProductArea[]; designId?: string | null; forRun?: boolean },
): Promise<ResolvedAreas> {
  if (wanted.length === 0) return { ok: false, error: 'Say where the print goes: a product prints at least one area.' };
  const fallbackDesign = opts.designId ?? opts.current?.[0]?.designId ?? null;
  const designFor = (input: AreaInput): string | null =>
    input.designId !== undefined && input.designId !== null && input.designId !== '' ? input.designId : (opts.current?.find((a) => a.position === input.position)?.designId ?? fallbackDesign);
  const shapes = await designShapes([...wanted.map(designFor), fallbackDesign]);
  for (const [, shape] of shapes) if (shape.storeId !== storeId) return { ok: false, error: 'Design not found for this shop.' };
  for (const input of wanted) {
    const id = designFor(input);
    if (id && !shapes.has(id)) return { ok: false, error: 'Design not found for this shop.' };
  }

  const areas = wanted.map((input): ProductArea => {
    const designId = designFor(input);
    const aspect = aspectOf(designId ? shapes.get(designId) : undefined);
    const widthCm = typeof input.widthCm === 'number' && Number.isFinite(input.widthCm) && input.widthCm > 0 ? input.widthCm : defaultAreaWidthCm(blank, input.position, aspect);
    const offset = typeof input.offsetYcm === 'number' && Number.isFinite(input.offsetYcm) && input.offsetYcm !== 0 ? { offsetYcm: input.offsetYcm } : {};
    return { position: input.position.trim(), widthCm, ...offset, designId };
  });
  if (!opts.forRun) {
    const withArt = areas.filter((a) => a.designId);
    const without = areas.find((a) => !a.designId);
    if (withArt.length > 0 && without) return { ok: false, error: `Say which artwork the ${printPositionLabel(without.position).toLowerCase()} print uses.` };
    const checked = checkPrintAreas(blank, areas.map((a) => ({ position: a.position, widthCm: a.widthCm, heightCm: heightOf(a, shapes) })));
    if (!checked.ok) return checked;
  }
  return { ok: true, areas: sortAreas(areas), shapes };
}

/** The base cost of a shop product with these areas, and its lines (podPrice); null when the blank has no price. A run's
 * backing product is priced as before, by its one-off base cost: a run is priced by its own quote. */
async function baseCostFor(blankCode: string, printServiceCode: string, areas: readonly ProductArea[], shapes: Map<string, DesignShape>, forRun: boolean): Promise<{ cents: number; lines: ProductPriceLine[] } | null> {
  if (forRun) {
    const quote = await quoteFor({ blankCode, printServiceCode, qty: 1 });
    return quote ? { cents: quote.unitBaseCostCents, lines: [] } : null;
  }
  const price = await podPrice(
    blankCode,
    areas.map((a) => {
      const heightCm = heightOf(a, shapes);
      return { position: a.position, widthCm: a.widthCm, ...(heightCm === null ? {} : { heightCm }) };
    }),
    printServiceCode,
  );
  return price ? { cents: price.totalCents, lines: price.lines.map((l) => ({ key: l.key, label: l.label, cents: l.cents })) } : null;
}

/** €17.00 */
function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** 'Garment with one print €17.00 · Front and back +€1.00 · Sleeve prints +€2.00 · Base €20.00': how artists read a
 * base cost, never the garment, print and margin inside it. */
export function describeBaseCost(lines: readonly ProductPriceLine[], totalCents: number): string {
  const parts = lines.map((l, i) => `${l.label} ${i === 0 || l.key === 'base' ? '' : '+'}${euros(l.cents)}`);
  return [...parts, `Base ${euros(totalCents)}`].join(' · ');
}

/** The areas a product could still add: the back when it has none, a front when it has none (the chest), and each
 * sleeve on a garment with sleeves. */
function addableAreas(blank: { code: string; type: string }, areas: readonly ProductArea[]): string[] {
  const takes = positionsFor(blank) as string[];
  const has = (side: string) => areas.some((a) => areaSide(a.position) === side);
  const out: string[] = [];
  if (!has('front')) {
    const front = takes.find((p) => p === 'front_chest') ?? takes.find((p) => areaSide(p) === 'front');
    if (front) out.push(front);
  }
  if (!has('back') && takes.includes('back')) out.push('back');
  for (const sleeve of ['sleeve_left', 'sleeve_right']) if (takes.includes(sleeve) && !areas.some((a) => a.position === sleeve)) out.push(sleeve);
  return out;
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
      blankType: schema.blanks.type,
      printServiceCode: schema.products.printServiceCode,
      printServiceName: schema.printServices.name,
      placement: schema.products.placement,
      placements: schema.products.placements,
      baseCostCents: schema.products.baseCostCents,
      baseCostLines: schema.products.baseCostLines,
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
      .select({ code: schema.productColours.colourCode, mockupUrl: schema.productColours.mockupUrl, views: schema.productColours.mockupViews, name: schema.colours.name, hex: schema.colours.hex })
      .from(schema.productColours)
      .innerJoin(schema.colours, eq(schema.productColours.colourCode, schema.colours.code))
      .where(eq(schema.productColours.productId, productId)),
    db.select({ size: schema.productSizes.size }).from(schema.productSizes).where(eq(schema.productSizes.productId, productId)),
  ]);

  const areas = productAreas(row);
  const shapes = await designShapes(areas.map((a) => a.designId));
  // A sleeve's picture is the flat proof the print pipeline drew, once its print files exist.
  const sleeveViews = areas.some((a) => isSleevePosition(a.position)) ? await productSleeveProofs(row) : {};
  const main = areas[0];
  const storedLines = Array.isArray(row.baseCostLines) ? (row.baseCostLines as ProductPriceLine[]) : null;
  // A product priced before the lines were kept had one print area: its base cost is the garment with one print.
  const lines = storedLines ?? (row.baseCostCents != null && areas.length === 1 ? [{ key: 'base' as const, label: POD_LINE_LABELS.base, cents: row.baseCostCents }] : []);

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
    placement: main && (row.placements || row.placement) ? { position: main.position, widthCm: main.widthCm, ...(main.offsetYcm ? { offsetYcm: main.offsetYcm } : {}) } : null,
    areas: areas.map((a) => ({
      position: a.position,
      label: printPositionLabel(a.position),
      widthCm: a.widthCm,
      heightCm: heightOf(a, shapes),
      ...(a.offsetYcm ? { offsetYcm: a.offsetYcm } : {}),
      designId: a.designId,
      sleeve: isSleevePosition(a.position),
    })),
    colours: colourRows.map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex ?? '#000000',
      mockupUrl: c.mockupUrl,
      views: {
        ...(c.views && typeof c.views === 'object' && !Array.isArray(c.views) ? (c.views as Partial<Record<MockupView, string>>) : {}),
        ...(sleeveViews[c.code] ?? {}),
      },
    })),
    sizes: sizeRows.map((s) => s.size),
    addableAreas: addableAreas({ code: row.blankCode, type: row.blankType }, areas),
    baseCostCents: row.baseCostCents,
    baseCostLines: lines,
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
  /** the design the areas print, unless an area names its own */
  designId?: string;
  blankCode: string;
  printServiceCode: string;
  /** one print area; `areas` gives several (it wins when both are given) */
  placement?: Placement;
  /** the print areas: at most one front, one back, and the sleeves, each with its own design when it differs */
  areas?: AreaInput[];
  colours: string[];
  sizes: string[];
  name?: string;
  /** a run's backing product (bulk.ts), never offered by a tool: it may carry
   * a run-only method such as screen print, and transition() keeps it out of
   * the shop. Its placement was checked when the run was quoted, so it is not
   * checked again at payment, when refusing would leave a paid order half made. */
  forRun?: boolean;
}

async function applyMockups(productId: string, force = false): Promise<void> {
  // Best-effort: a render that fails just means the product is created (or
  // changed) without fresh preview images. The service saves what it renders.
  try {
    await renderProductMockups(productId, force);
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

  const wanted: AreaInput[] = input.areas ?? (input.placement ? [input.placement] : []);
  const resolved = await resolveAreas({ code: blank.code, type: blank.type }, input.storeId, wanted, { designId: input.designId ?? null, forRun: input.forRun });
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { areas, shapes } = resolved;

  const price = await baseCostFor(input.blankCode, input.printServiceCode, areas, shapes, Boolean(input.forRun));
  if (!price) return { ok: false, error: `No pricing configured for ${input.blankCode} with ${input.printServiceCode}.` };

  // An unnamed product takes its blank's display name, never the supplier's model name.
  const name = input.name?.trim() || blankDisplayName(blank.code, blank.name);

  const [product] = await db
    .insert(schema.products)
    .values({
      storeId: input.storeId,
      // the main design: the first area's (the front, else the back, else a sleeve)
      designId: areas[0]?.designId ?? input.designId ?? null,
      blankCode: input.blankCode,
      printServiceCode: input.printServiceCode,
      name,
      placements: areas.map(storedArea),
      baseCostCents: price.cents,
      baseCostLines: price.lines.length > 0 ? price.lines : null,
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
  /** moves or resizes the main print area (the first one); `areas` replaces them all */
  placement?: Placement;
  /** every print area the product prints after the change */
  areas?: AreaInput[];
  /** a new retail price that comes with an area change: needed when the change lifts the base cost past the price */
  retailPriceCents?: number;
  colours?: string[];
  sizes?: string[];
  collectionId?: string | null;
}

/** A live product stays live whatever happens to its approval, but what it newly puts in front of fans needs
 * the design's approval like a first publish does: a colour it didn't have (in every area), or an area it didn't
 * print, or prints somewhere else, at another size or with other artwork (every colour then prints there).
 * Null when the edit adds nothing, or is covered. */
async function liveEditApproval(product: ProductRow, next: { areas?: ProductArea[]; colours?: string[] }): Promise<ProductApproval | null> {
  if (product.status !== 'live' || (!next.colours && !next.areas)) return null;
  const currentColours = await productColourCodes(product.id);
  const colours = next.colours ?? currentColours;
  const added = colours.filter((code) => !currentColours.includes(code));
  const currentAreas = productAreas(product);
  const areas = next.areas ?? currentAreas;
  const several = areas.length > 1;
  for (const area of areas) {
    const unchanged = currentAreas.some((a) => a.position === area.position && a.designId === area.designId && samePlacement(productPrintPlacement(a), productPrintPlacement(area)));
    const toCover = unchanged ? added : colours;
    if (toCover.length === 0) continue;
    const approval = await checkProductApproval(product, { colours: toCover, areas: [area], nameColours: unchanged, nameAreas: several });
    if (!approval.covered) return approval;
  }
  return null;
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

  // The print areas after the edit: the list given, or the main one moved. Checked like a new product's.
  const current = productAreas(product);
  let nextAreas: ProductArea[] | null = null;
  let shapes = new Map<string, DesignShape>();
  if (patch.areas || patch.placement) {
    const [blank] = await db.select({ code: schema.blanks.code, type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, product.blankCode)).limit(1);
    const wanted: AreaInput[] = patch.areas ?? [{ ...patch.placement!, designId: current[0]?.designId ?? product.designId }, ...current.slice(1)];
    const resolved = await resolveAreas(blank ?? { code: product.blankCode, type: '' }, storeId, wanted, { current, designId: product.designId });
    if (!resolved.ok) return { ok: false, error: resolved.error };
    if (!sameAreas(current, resolved.areas)) nextAreas = resolved.areas;
    shapes = resolved.shapes;
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

  // Other areas, another base cost (podPrice): the price must stay at least €1 above it. When it wouldn't, nothing
  // changes and the artist is asked for a new price, which can come with the change.
  // A blank podPrice can't price keeps the base cost it has (the snapshot), rather than failing the edit or zeroing it.
  const price = nextAreas ? await baseCostFor(product.blankCode, product.printServiceCode, nextAreas, shapes, false) : null;
  const baseAfter = price?.cents ?? product.baseCostCents;
  const retailAfter = patch.retailPriceCents ?? product.retailPriceCents;
  if (patch.retailPriceCents !== undefined && (!Number.isInteger(patch.retailPriceCents) || patch.retailPriceCents <= 0)) return { ok: false, error: 'A price is a whole number of cents above zero.' };
  // As setPrice: a price needs a base cost to be checked against.
  if (patch.retailPriceCents !== undefined && baseAfter == null) return { ok: false, error: 'This product has no base cost snapshot yet.' };
  // Only what this edit changes is checked: a rename never trips over an old price.
  if ((nextAreas || patch.retailPriceCents !== undefined) && baseAfter != null && retailAfter != null && retailAfter < baseAfter + MIN_MARGIN_CENTS) {
    const minRetailCents = baseAfter + MIN_MARGIN_CENTS;
    const lines = price?.lines ?? [];
    const what = price ? `With these print areas the base cost is ${euros(baseAfter)}${lines.length > 1 ? ` (${describeBaseCost(lines, baseAfter)})` : ''}` : `The base cost is ${euros(baseAfter)}`;
    const error =
      patch.retailPriceCents !== undefined
        ? `${what}, so the price must be at least ${euros(minRetailCents)} (the base cost plus a €1 minimum margin).`
        : `${what}, above what your price of ${euros(retailAfter)} allows. Set a new price of at least ${euros(minRetailCents)} with the change.`;
    return { ok: false, error, priceNeeded: { baseCostCents: baseAfter, minRetailCents, retailPriceCents: retailAfter, lines } };
  }

  // Nothing is written before this: a refused edit leaves the live product as it was.
  const uncovered = await liveEditApproval(product, { ...(nextAreas ? { areas: nextAreas } : {}), ...(patch.colours ? { colours: patch.colours } : {}) });
  if (uncovered) return { ok: false, error: uncovered.sentence ?? 'Approve the artwork first.', approval: uncovered };

  await db
    .update(schema.products)
    .set({
      name: patch.name ?? product.name,
      description: patch.description ?? product.description,
      ...(nextAreas ? { placements: nextAreas.map(storedArea), designId: nextAreas[0]?.designId ?? product.designId } : {}),
      ...(price ? { baseCostCents: price.cents, baseCostLines: price.lines.length > 0 ? price.lines : null } : {}),
      ...(patch.retailPriceCents !== undefined ? { retailPriceCents: patch.retailPriceCents } : {}),
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

  // New areas change every picture; new colours need theirs.
  if (nextAreas) await applyMockups(productId, true);
  else if (patch.colours) await applyMockups(productId);

  const detail = await getProduct(storeId, productId);
  if (!detail) return { ok: false, error: 'Product update failed unexpectedly.' };
  await revalidateStore(storeId);
  return { ok: true, value: detail };
}

/** Adds, changes or removes print areas: `remove` names positions to drop, `add` areas to print (one at a position the
 * product already prints replaces it, keeping its design unless another is named). The rest is updateProduct's: the
 * rules, the new base cost, the price check and, on a live product, the approval of what is new. */
export async function editProductAreas(
  storeId: string,
  productId: string,
  edit: { add?: AreaInput[]; remove?: string[]; retailPriceCents?: number },
): Promise<GatedResult<ProductDetail>> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  const current = productAreas(product);
  const remove = [...new Set(edit.remove ?? [])];
  for (const position of remove) {
    if (!current.some((a) => a.position === position)) return { ok: false, error: `${product.name} has no ${printPositionLabel(position).toLowerCase()} print to remove.` };
  }
  const kept: AreaInput[] = current.filter((a) => !remove.includes(a.position));
  const next: AreaInput[] = [...kept];
  for (const add of edit.add ?? []) {
    const at = next.findIndex((a) => a.position === add.position);
    const was = at >= 0 ? next[at] : undefined;
    // An area that is there already keeps what the change doesn't say: its width, its height on the garment, its design.
    const area: AreaInput = {
      position: add.position,
      ...(add.widthCm !== undefined ? { widthCm: add.widthCm } : was?.widthCm !== undefined ? { widthCm: was.widthCm } : {}),
      ...(add.offsetYcm !== undefined ? { offsetYcm: add.offsetYcm } : was?.offsetYcm !== undefined ? { offsetYcm: was.offsetYcm } : {}),
      designId: add.designId ?? was?.designId ?? undefined,
    };
    if (at >= 0) next[at] = area;
    else next.push(area);
  }
  if (next.length === 0) return { ok: false, error: `${product.name} has to print somewhere: keep at least one print area.` };
  return updateProduct(storeId, productId, { areas: next, ...(edit.retailPriceCents !== undefined ? { retailPriceCents: edit.retailPriceCents } : {}) });
}

export interface AreasQuote {
  cents: number;
  lines: ProductPriceLine[];
  /** the garment's price is still a placeholder the owner hasn't set */
  placeholder: boolean;
  /** the print method it was priced for */
  printServiceCode: string;
}

/** What a shop product would cost with these print areas, before any is changed: the shop quote (quoteFor with `shop`,
 * which is podPrice) with its lines and total. With no print method, the one a new product of the garment would take:
 * DTG, or DTF on a garment without DTG. `check` holds the areas to the product rules first (positions the garment takes,
 * sleeves only where it has them, one front and one back), for areas that aren't a product's yet. Refused in words for
 * screen print (runs only), a method the garment doesn't offer, and a blank with no price. */
export async function quoteProductAreas(
  blankCode: string,
  printServiceCode: string | null,
  areas: readonly AreaInput[],
  opts: { check?: boolean } = {},
): Promise<ServiceResult<AreasQuote>> {
  const [blank] = await db.select({ code: schema.blanks.code, name: schema.blanks.name, type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  if (!blank) return { ok: false, error: `Unknown blank code "${blankCode}".` };
  if (opts.check) {
    const checked = checkPrintAreas(blank, areas.map((a) => ({ position: a.position, widthCm: a.widthCm ?? defaultAreaWidthCm(blank, a.position) })));
    if (!checked.ok) return checked;
  }
  const offered = await printServicesFor(blank.code);
  const shop = offered.filter((p) => p.availableInShop);
  const service = printServiceCode ? offered.find((p) => p.code === printServiceCode) : (shop.find((p) => p.code === 'dtg') ?? shop.find((p) => p.code === 'dtf') ?? shop[0]);
  const name = blankDisplayName(blank.code, blank.name);
  if (!service) {
    const choices = shop.length > 0 ? ` Shop products print with: ${describeServices(shop)}.` : '';
    return { ok: false, error: printServiceCode ? `That print method isn't offered on the ${name}.${choices}` : `The ${name} has no print method for shop products.` };
  }
  if (!service.availableInShop) return { ok: false, error: `${service.name} is for runs, not shop products. Quote a run for it instead.` };
  const quote = await quoteFor({ blankCode: blank.code, printServiceCode: service.code, qty: 1, shop: { placements: areas.map((a) => ({ position: a.position, widthCm: a.widthCm ?? 0 })) } });
  const price = quote?.breakdown;
  if (!price) return { ok: false, error: `No pricing configured for ${blank.code} with ${service.code}.` };
  return { ok: true, value: { cents: price.totalCents, lines: price.lines.map((l) => ({ key: l.key, label: l.label, cents: l.cents })), placeholder: price.placeholder, printServiceCode: service.code } };
}

export interface SetPriceResult {
  retailPriceCents: number;
  marginCents: number;
}

export async function setPrice(storeId: string, productId: string, retailCents: number): Promise<ServiceResult<SetPriceResult>> {
  const product = await getOwnedProductRow(storeId, productId);
  if (!product) return { ok: false, error: 'Product not found for this shop.' };
  if (product.baseCostCents == null) return { ok: false, error: 'This product has no base cost snapshot yet.' };

  const minCents = product.baseCostCents + MIN_MARGIN_CENTS; // base cost + at least EUR 1 margin
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

export type PublishCheck =
  | { ok: true; product: ProductRow; /** the base cost as podPrice gives it now, when it moved from the draft's snapshot */ repriced: { cents: number; lines: ProductPriceLine[] } | null }
  | { ok: false; error: string; approval?: ProductApproval; priceNeeded?: PriceNeeded };

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

  // Every print area, against its own design's approval.
  const approval = await checkProductApproval(product, { colours: await productColourCodes(productId) });
  if (!approval.covered) return { ok: false, error: approval.sentence ?? 'Approve the artwork first.', approval };

  // A draft keeps the base cost it was made with, which may have been a placeholder since: it goes live at today's
  // shop price for its print areas (podPrice), and its price must still be at least €1 above that.
  const repriced = await currentBaseCost(product);
  const base = repriced?.cents ?? product.baseCostCents ?? 0;

  // Fans must never see a product without a retail price.
  if (!product.retailPriceCents) return { ok: false, error: 'Set a retail price (at least €1 above the base cost) before publishing.' };
  if (product.retailPriceCents < base + MIN_MARGIN_CENTS) {
    const lines = repriced?.lines ?? [];
    const minRetailCents = base + MIN_MARGIN_CENTS;
    return {
      ok: false,
      error: repriced
        ? `The base cost is now ${euros(base)}${lines.length > 1 ? ` (${describeBaseCost(lines, base)})` : ''}, above what your price of ${euros(product.retailPriceCents)} allows. Set a price of at least ${euros(minRetailCents)} before publishing.`
        : 'Set a retail price (at least €1 above the base cost) before publishing.',
      priceNeeded: { baseCostCents: base, minRetailCents, retailPriceCents: product.retailPriceCents, lines },
    };
  }

  const stripeRows = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, storeId)).limit(1);
  const stripe = stripeRows[0];
  if (!stripe?.chargesEnabled || !stripe?.payoutsEnabled) {
    return {
      ok: false,
      error: 'Publishing is blocked until Stripe payouts are connected and both charges and payouts are enabled for your shop.',
    };
  }
  return { ok: true, product, repriced };
}

/** A shop product's base cost as podPrice gives it now, when it differs from the stored snapshot; null when it is the
 * same, or when the blank has no price (the snapshot stands). */
async function currentBaseCost(product: ProductRow): Promise<{ cents: number; lines: ProductPriceLine[] } | null> {
  const areas = productAreas(product);
  const price = await baseCostFor(product.blankCode, product.printServiceCode, areas, await designShapes(areas.map((a) => a.designId)), false);
  if (!price) return null;
  const stored = Array.isArray(product.baseCostLines) ? (product.baseCostLines as ProductPriceLine[]) : null;
  const sameLines = stored !== null && JSON.stringify(stored) === JSON.stringify(price.lines);
  return price.cents === product.baseCostCents && (sameLines || stored === null) ? null : price;
}

/** The only way a product goes live: transition() is never asked for it anywhere else. */
export async function publishProduct(storeId: string, productId: string): Promise<GatedResult<ProductDetail>> {
  const checked = await checkPublishable(storeId, productId);
  if (!checked.ok) return checked;

  // It goes live at today's base cost: the Stripe fee and the payout are worked out from it at checkout.
  if (checked.repriced) {
    await db
      .update(schema.products)
      .set({ baseCostCents: checked.repriced.cents, baseCostLines: checked.repriced.lines.length > 0 ? checked.repriced.lines : null, updatedAt: new Date() })
      .where(eq(schema.products.id, productId));
  }

  const result = await transition(productId, 'live', checked.product.status);
  if (!result.ok) return result;

  const detail = await getProduct(storeId, productId);
  if (!detail) return { ok: false, error: 'Publish failed unexpectedly.' };
  await revalidateStore(storeId);
  return { ok: true, value: detail };
}
