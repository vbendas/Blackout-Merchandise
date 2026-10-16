import { and, desc, eq, inArray } from 'drizzle-orm';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { runLabel } from '@/lib/format/runs';
import { runNumberFor } from '@/lib/services/runs';
import { db, schema } from '@/lib/db';
import { createProduct, getProduct, type Placement } from '@/lib/services/products';
import { createBulkProof, setBulkProofStatus, type ProofDetail, type ProofSpecLine } from '@/lib/services/proofs';
import { describeServices, printServicesFor, quoteFor, quoteScreenLine, techniqueOfService } from '@/lib/services/quotes';
import { getScreenPriceTable } from '@/lib/services/pricing-admin';
import { setupCentsFor, type LineScreens, type ScreenPriceTable } from '@/lib/pricing/screen-print';
import { zoneForCountry } from '@/lib/services/shipping';
import { getStore } from '@/lib/services/stores';
import { claimWebhookEvent } from '@/lib/services/orders';
import { notify } from '@/lib/services/notifications';
import { markPacksNeededForOrder } from '@/lib/services/prepress';
import { checkPlacementPosition, defaultPlacementFor } from '@/lib/mockups/placements';
import type { CheckoutSessionSnapshot } from '@/lib/services/stripe';

// Bulk orders (service path B, Platform-Plan.md §6): an artist orders a run
// for themselves — from a shop product or brand-new artwork — shipped to
// their own address, paid 100% to MerchFrom (no Connect transfer). This
// file owns the bulk_orders row end to end: quoting with quantity breaks,
// the proof round-trip (delegating the proofs-table plumbing to
// proofs.ts's bulk-scoped functions, but keeping the bulk_orders status
// transition here), payment, and cancellation. checkout.ts calls into this
// file for the Checkout Session (getBulkOrder, recordBulkCheckoutSession);
// the Stripe webhook and the mock-checkout action call markBulkPaid.
//
// A run chooses its own print method when it is quoted: screen print or
// DTG/DTF, whatever the blank offers. A run of a shop product does not inherit
// the product's method (shop products are DTG/DTF only), so a run of a DTG
// product can be screen printed. Each line carries the service its artist
// chose; production reads it from there (getRunLinesForOrder).
//
// A screen-printed line is priced by the screens its design really uses
// (Print-Prep-Plan section 10): quoteScreenLine reads the count from the
// design's print files for that garment colour, or guesses and says so when
// there are none yet. The line records what it rests on (BulkQuoteLine.screens),
// the price is worked out again when the proof is sent, and an approval is
// refused if the screens changed since the proof (approveBulkProof).

/** What a paid run sets in motion outside this module. Tests swap these for
 * stubs; the wrappers look the functions up when called, so an import cycle
 * with prepress.ts cannot leave one undefined. */
export const runHooks = {
  notify: (input: Parameters<typeof notify>[0]) => notify(input),
  markPacksNeededForOrder: (orderId: string) => markPacksNeededForOrder(orderId),
};

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type BulkOrderStatus = (typeof schema.bulkOrders.$inferSelect)['status'];

export interface BulkShipTo {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  /** ISO-2 */
  country: string;
}

export interface BulkQuoteLine {
  /** set when this line was quoted off an existing shop product */
  productId: string | null;
  /** carried through so a payment-time backing product (see ensureLineProduct) prints the right artwork */
  designId: string | null;
  blankCode: string;
  blankName: string;
  printServiceCode: string;
  printServiceName: string;
  placement: Placement | null;
  /** screen print only: more print positions on the same garment, after `placement`, each priced at the second-position
   * rate. Pre-press builds and gates a pack for each of them (resolveOrderRequirements), and the job sheet lists them. */
  extraPlacements?: Placement[];
  colourCode: string;
  colourName: string;
  /** size code -> quantity */
  sizes: Record<string, number>;
  qty: number;
  /** what one piece costs, the screen surcharge included */
  unitCents: number;
  totalCents: number;
  label: string;
  mockupUrl: string | null;
  /** screen print only: the screens the price rests on (from the design's print files, or a guess with its reason) */
  screens?: LineScreens | null;
}

/** The shape persisted in bulk_orders.quote — see Platform-Plan.md §3. */
interface PersistedBulkQuote {
  lines: BulkQuoteLine[];
  setupCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  leadTime: string;
  /** set by recordBulkCheckoutSession once pay_bulk_order starts a Checkout Session */
  checkoutSessionId?: string;
}

export interface BulkOrderDetail {
  id: string;
  storeId: string;
  status: BulkOrderStatus;
  lines: BulkQuoteLine[];
  setupCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  leadTime: string;
  shipTo: BulkShipTo;
  orderId: string | null;
  checkoutSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EMPTY_QUOTE: PersistedBulkQuote = { lines: [], setupCents: 0, shippingCents: 0, totalCents: 0, currency: 'EUR', leadTime: '10 working days' };

type BulkOrderRow = typeof schema.bulkOrders.$inferSelect;

function toBulkOrderDetail(row: BulkOrderRow): BulkOrderDetail {
  const quote = (row.quote as PersistedBulkQuote | null) ?? EMPTY_QUOTE;
  const shipTo = (row.shipTo as BulkShipTo | null) ?? { name: '', line1: '', city: '', postcode: '', country: '' };
  return {
    id: row.id,
    storeId: row.storeId,
    status: row.status,
    lines: quote.lines,
    setupCents: quote.setupCents,
    shippingCents: quote.shippingCents,
    totalCents: quote.totalCents,
    currency: quote.currency,
    leadTime: quote.leadTime,
    shipTo,
    orderId: row.orderId,
    checkoutSessionId: quote.checkoutSessionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getOwnedBulkOrderRow(storeId: string, bulkOrderId: string): Promise<BulkOrderRow | null> {
  const rows = await db
    .select()
    .from(schema.bulkOrders)
    .where(and(eq(schema.bulkOrders.id, bulkOrderId), eq(schema.bulkOrders.storeId, storeId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBulkOrder(storeId: string, bulkOrderId: string): Promise<BulkOrderDetail | null> {
  const row = await getOwnedBulkOrderRow(storeId, bulkOrderId);
  return row ? toBulkOrderDetail(row) : null;
}

/**
 * The lines of the run that became an order, each with the print service its
 * artist chose when it was quoted (techniqueOfService in quotes.ts turns that
 * into screen or DTG/DTF). Production and the pre-press queue read the method
 * here: an order item points at a shop product, whose own method can differ
 * from the run's. Null when the order did not come from a run.
 */
export async function getRunLinesForOrder(orderId: string): Promise<{ bulkOrderId: string; storeId: string; lines: BulkQuoteLine[] } | null> {
  const rows = await db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.orderId, orderId)).limit(1);
  const row = rows[0];
  return row ? { bulkOrderId: row.id, storeId: row.storeId, lines: toBulkOrderDetail(row).lines } : null;
}

export interface BulkOrderListItem {
  id: string;
  status: BulkOrderStatus;
  totalUnits: number;
  totalCents: number;
  createdAt: Date;
}

export async function listBulkOrders(storeId: string): Promise<BulkOrderListItem[]> {
  const rows = await db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.storeId, storeId)).orderBy(desc(schema.bulkOrders.createdAt));
  return rows.map((row) => {
    const detail = toBulkOrderDetail(row);
    return {
      id: detail.id,
      status: detail.status,
      totalUnits: detail.lines.reduce((sum, l) => sum + l.qty, 0),
      totalCents: detail.totalCents,
      createdAt: detail.createdAt,
    };
  });
}

// -- state machine ------------------------------------------------------

const ALLOWED_BULK_TRANSITIONS: Record<BulkOrderStatus, BulkOrderStatus[]> = {
  quoted: ['proof_pending', 'cancelled'],
  proof_pending: ['quoted', 'awaiting_payment', 'cancelled'],
  // 'paid' is reachable in the enum but markBulkPaid moves straight from
  // awaiting_payment to in_production (see markBulkPaid's doc) — kept here
  // for a future "payment received, production not yet started" step.
  awaiting_payment: ['in_production', 'paid', 'cancelled'],
  paid: ['in_production', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

async function transitionBulk(bulkOrderId: string, to: BulkOrderStatus, from?: BulkOrderStatus): Promise<ServiceResult<BulkOrderStatus>> {
  const current =
    from ?? (await db.select({ status: schema.bulkOrders.status }).from(schema.bulkOrders).where(eq(schema.bulkOrders.id, bulkOrderId)).limit(1))[0]?.status;
  if (!current) return { ok: false, error: 'Bulk order not found.' };
  if (current === to) return { ok: true, value: to };
  if (!ALLOWED_BULK_TRANSITIONS[current].includes(to)) {
    return { ok: false, error: `Can't move a bulk order from "${current}" to "${to}".` };
  }
  await db.update(schema.bulkOrders).set({ status: to, updatedAt: new Date() }).where(eq(schema.bulkOrders.id, bulkOrderId));
  return { ok: true, value: to };
}

// -- quoting --------------------------------------------------------------

export interface CreateBulkQuoteLineInput {
  productId?: string;
  designId?: string;
  blankCode?: string;
  printServiceCode?: string;
  placement?: Placement;
  /** screen print only: more print positions on the same garment (at most 3 more) */
  extraPlacements?: Placement[];
  colourCode: string;
  /** size code -> quantity */
  sizes: Record<string, number>;
}

export interface CreateBulkQuoteInput {
  storeId: string;
  lines: CreateBulkQuoteLineInput[];
  shipTo: BulkShipTo;
}

function normaliseShipTo(input: BulkShipTo | undefined): BulkShipTo | null {
  if (!input) return null;
  const name = input.name?.trim();
  const line1 = input.line1?.trim();
  const city = input.city?.trim();
  const postcode = input.postcode?.trim();
  const country = input.country?.trim().toUpperCase();
  if (!name || !line1 || !city || !postcode || !country || country.length !== 2) return null;
  const line2 = input.line2?.trim();
  return { name, line1, ...(line2 ? { line2 } : {}), city, postcode, country };
}

type LineResult = { ok: true; value: BulkQuoteLine } | { ok: false; error: string };

/** True when the design belongs to this shop: a run only ever prints its own shop's art. */
async function designInShop(storeId: string, designId: string): Promise<boolean> {
  const [design] = await db.select({ storeId: schema.designs.storeId }).from(schema.designs).where(eq(schema.designs.id, designId)).limit(1);
  return design?.storeId === storeId;
}

/** The usual place and size for a line that names none, as pre-press reads it for an order (toPrintPlacement in prepress.ts). */
const DEFAULT_PLACEMENT: Placement = { position: 'front_chest', widthCm: 28 };

/** More print positions on one garment, after the main one. */
const MAX_EXTRA_PLACEMENTS = 3;

async function resolveLine(storeId: string, input: CreateBulkQuoteLineInput, table: ScreenPriceTable, lineKey: string): Promise<LineResult> {
  const sizeEntries = Object.entries(input.sizes ?? {}).filter(([, qty]) => qty > 0);
  if (sizeEntries.length === 0) return { ok: false, error: 'At least one size with a quantity greater than zero is required.' };
  for (const [size, qty] of sizeEntries) {
    if (!Number.isInteger(qty) || qty < 0) return { ok: false, error: `Invalid quantity for size "${size}".` };
  }
  const qty = sizeEntries.reduce((sum, [, q]) => sum + q, 0);

  let blankCode: string;
  let blankName: string;
  let printServiceCode: string;
  let printServiceName: string;
  let placement: Placement | null;
  let colourName: string;
  let mockupUrl: string | null = null;
  let productId: string | null = null;
  let designId: string | null = input.designId ?? null;

  if (input.productId) {
    const product = await getProduct(storeId, input.productId);
    if (!product) return { ok: false, error: 'Product not found for this shop.' };
    productId = product.id;
    // The product's own design wins; a design named on the line is taken only from this shop.
    if (product.designId) designId = product.designId;
    else if (designId && !(await designInShop(storeId, designId))) return { ok: false, error: 'Design not found for this shop.' };
    blankCode = product.blankCode;
    blankName = product.blankName;
    placement = product.placement;

    // The run picks its own method. Left out, it prints the way the product does.
    if (input.printServiceCode && input.printServiceCode !== product.printServiceCode) {
      const services = await printServicesFor(product.blankCode);
      const service = services.find((s) => s.code === input.printServiceCode);
      if (!service) {
        return { ok: false, error: `"${input.printServiceCode}" isn't offered on ${blankName} (${product.blankCode}). Choose one of: ${describeServices(services)}.` };
      }
      printServiceCode = service.code;
      printServiceName = service.name;
    } else {
      printServiceCode = product.printServiceCode;
      printServiceName = product.printServiceName;
    }

    const colour = product.colours.find((c) => c.code === input.colourCode);
    if (!colour) return { ok: false, error: `"${input.colourCode}" is not an enabled colour on ${product.name}.` };
    colourName = colour.name;
    mockupUrl = colour.mockupUrl;

    const badSizes = sizeEntries.map(([s]) => s).filter((s) => !product.sizes.includes(s));
    if (badSizes.length > 0) return { ok: false, error: `Size(s) not enabled on ${product.name}: ${badSizes.join(', ')}.` };
  } else {
    if (!input.blankCode || !input.printServiceCode || !input.placement) {
      return { ok: false, error: 'Provide either a productId, or a blankCode, printServiceCode and placement.' };
    }

    if (designId && !(await designInShop(storeId, designId))) return { ok: false, error: 'Design not found for this shop.' };

    const blankRows = await db.select().from(schema.blanks).where(eq(schema.blanks.code, input.blankCode)).limit(1);
    const blank = blankRows[0];
    if (!blank) return { ok: false, error: `Unknown blank code "${input.blankCode}".` };
    blankCode = blank.code;
    blankName = blankDisplayName(blank.code, blank.name);
    placement = input.placement;

    const services = await printServicesFor(input.blankCode);
    const service = services.find((s) => s.code === input.printServiceCode);
    if (!service) return { ok: false, error: `"${input.printServiceCode}" isn't offered on ${blankName} (${input.blankCode}). Choose one of: ${describeServices(services)}.` };
    printServiceCode = service.code;
    printServiceName = service.name;

    const position = checkPlacementPosition(blank.type, input.placement.position);
    if (!position.ok) return { ok: false, error: position.error };

    const colourRows = await db
      .select({ code: schema.colours.code, name: schema.colours.name, frontImageUrl: schema.blankColours.frontImageUrl })
      .from(schema.blankColours)
      .innerJoin(schema.colours, eq(schema.blankColours.colourCode, schema.colours.code))
      .where(eq(schema.blankColours.blankCode, input.blankCode));
    const colour = colourRows.find((c) => c.code === input.colourCode);
    if (!colour) return { ok: false, error: `Colour "${input.colourCode}" is not available on ${blankName}.` };
    colourName = colour.name;
    mockupUrl = colour.frontImageUrl ?? blank.frontImageUrl ?? null;

    const sizeRows = await db.select({ size: schema.blankSizes.size }).from(schema.blankSizes).where(eq(schema.blankSizes.blankCode, input.blankCode));
    const validSizeSet = new Set(sizeRows.map((r) => r.size));
    const badSizes = sizeEntries.map(([s]) => s).filter((s) => !validSizeSet.has(s));
    if (badSizes.length > 0) return { ok: false, error: `Size(s) not available on ${blankName}: ${badSizes.join(', ')}.` };
  }

  const isScreen = techniqueOfService(printServiceCode) === 'screen';

  // More print positions on the garment: priced for screen print, where each position has its own screens.
  const extras = input.extraPlacements ?? [];
  if (extras.length > 0) {
    if (!isScreen) return { ok: false, error: 'More than one print position is priced for screen print only.' };
    if (extras.length > MAX_EXTRA_PLACEMENTS) return { ok: false, error: `A garment takes at most ${MAX_EXTRA_PLACEMENTS + 1} print positions.` };
    const [blankRow] = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
    const seen = new Set([(placement ?? DEFAULT_PLACEMENT).position]);
    for (const extra of extras) {
      const position = checkPlacementPosition(blankRow?.type ?? '', extra.position);
      if (!position.ok) return { ok: false, error: position.error };
      if (seen.has(extra.position)) return { ok: false, error: 'A garment can have each print position once.' };
      // The width print prep can make files for (validateDrop in print-prep.ts).
      if (!(extra.widthCm >= 2 && extra.widthCm <= 60)) return { ok: false, error: 'A print position must be between 2 and 60 cm wide.' };
      seen.add(extra.position);
    }
  }

  let unitCents: number;
  let screens: LineScreens | null = null;
  if (isScreen) {
    // Priced by the screens the design really uses for this colour, not by the service the artist picked.
    const priced = await quoteScreenLine(
      { blankCode, printServiceCode, colourCode: input.colourCode, colourName, qty, designId, placements: [placement ?? DEFAULT_PLACEMENT, ...extras], lineKey },
      table,
    );
    if (!priced.ok) return priced;
    unitCents = priced.value.unitCents;
    screens = priced.value.screens;
  } else {
    const quote = await quoteFor({ blankCode, printServiceCode, qty });
    if (!quote) return { ok: false, error: `No pricing configured for ${blankCode} with ${printServiceCode}.` };
    unitCents = quote.unitBaseCostCents;
  }

  const sizes = Object.fromEntries(sizeEntries);
  return {
    ok: true,
    value: {
      productId,
      designId,
      blankCode,
      blankName,
      printServiceCode,
      printServiceName,
      placement,
      ...(extras.length > 0 ? { extraPlacements: extras } : {}),
      colourCode: input.colourCode,
      colourName,
      sizes,
      qty,
      unitCents,
      totalCents: unitCents * qty,
      label: `${blankName} · ${colourName} · ${qty} pcs`,
      mockupUrl,
      ...(screens ? { screens } : {}),
    },
  };
}

/** The one-off cost of a run: each distinct print service's own setup fee, plus the cost of making the screens (each set of
 * screens once, however many garment colours share it). */
async function setupCentsOf(lines: BulkQuoteLine[], table: ScreenPriceTable): Promise<number> {
  const distinctServiceCodes = [...new Set(lines.map((l) => l.printServiceCode))];
  const serviceRows = await db
    .select({ code: schema.printServices.code, setupCents: schema.printServices.setupCents })
    .from(schema.printServices)
    .where(inArray(schema.printServices.code, distinctServiceCodes));
  const services = serviceRows.reduce((sum, s) => sum + (s.setupCents ?? 0), 0);
  const sets = lines.flatMap((l) => l.screens?.placements.map((p) => ({ id: p.setId, screens: p.screens })) ?? []);
  return services + setupCentsFor(table, sets);
}

/**
 * Quotes a bulk run: per-line pricing at the seeded quantity breaks (a
 * screen-printed line by the design's real screen count, see quoteScreenLine),
 * setup once per distinct print service and once for each set of screens, and
 * shipping by a flat zone rate scaled to a "pallet" factor (ceil(totalUnits /
 * 20)) rather than the retail free-over-X table, which doesn't apply to a bulk
 * run. Persists a new bulk_orders row in 'quoted'.
 */
export async function createBulkQuote(input: CreateBulkQuoteInput): Promise<ServiceResult<BulkOrderDetail>> {
  if (!input.lines || input.lines.length === 0) return { ok: false, error: 'At least one line is required.' };

  const shipTo = normaliseShipTo(input.shipTo);
  if (!shipTo) return { ok: false, error: 'A complete shipping address (name, line1, city, postcode, 2-letter country) is required.' };

  const table = await getScreenPriceTable();
  const lines: BulkQuoteLine[] = [];
  for (const [index, lineInput] of input.lines.entries()) {
    const resolved = await resolveLine(input.storeId, lineInput, table, String(index));
    if (!resolved.ok) return resolved;
    lines.push(resolved.value);
  }

  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
  const setupCents = await setupCentsOf(lines, table);

  const zone = await zoneForCountry(shipTo.country);
  if (!zone) return { ok: false, error: "We don't ship to that country yet." };
  const shippingCents = zone.flatCents * Math.ceil(totalUnits / 20);

  const leadTime = totalUnits < 100 ? '10 working days' : '15 working days';
  const linesTotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const totalCents = linesTotalCents + setupCents + shippingCents;

  const quote: PersistedBulkQuote = { lines, setupCents, shippingCents, totalCents, currency: 'EUR', leadTime };

  const [row] = await db.insert(schema.bulkOrders).values({ storeId: input.storeId, quote, status: 'quoted', shipTo }).returning();

  return { ok: true, value: toBulkOrderDetail(row) };
}

// -- the screens, worked out again ------------------------------------------------

interface RepricedRun {
  lines: BulkQuoteLine[];
  setupCents: number;
  totalCents: number;
}

/** A run's screen-printed lines priced again from the design's print files as they are now, and the price table as it is now.
 * Other lines are kept. Refuses when a design now needs more screens than the press can print. */
async function repriceRun(detail: BulkOrderDetail, table: ScreenPriceTable): Promise<ServiceResult<RepricedRun>> {
  // A run with no screen-printed line keeps the price it was quoted at, setup included, as before screen pricing.
  if (!detail.lines.some((l) => techniqueOfService(l.printServiceCode) === 'screen')) {
    return { ok: true, value: { lines: detail.lines, setupCents: detail.setupCents, totalCents: detail.totalCents } };
  }
  const lines: BulkQuoteLine[] = [];
  for (const [index, line] of detail.lines.entries()) {
    if (techniqueOfService(line.printServiceCode) !== 'screen') {
      lines.push(line);
      continue;
    }
    const priced = await quoteScreenLine(
      {
        blankCode: line.blankCode,
        printServiceCode: line.printServiceCode,
        colourCode: line.colourCode,
        colourName: line.colourName,
        qty: line.qty,
        designId: line.designId,
        placements: [line.placement ?? DEFAULT_PLACEMENT, ...(line.extraPlacements ?? [])],
        lineKey: String(index),
      },
      table,
    );
    if (!priced.ok) return priced;
    lines.push({ ...line, unitCents: priced.value.unitCents, totalCents: priced.value.totalCents, screens: priced.value.screens });
  }
  const setupCents = await setupCentsOf(lines, table);
  return { ok: true, value: { lines, setupCents, totalCents: lines.reduce((sum, l) => sum + l.totalCents, 0) + setupCents + detail.shippingCents } };
}

/** True when pricing the run again gives other prices or other screens. */
function priceChanged(detail: BulkOrderDetail, again: RepricedRun): boolean {
  const key = (lines: BulkQuoteLine[]) => JSON.stringify(lines.map((l) => [l.unitCents, l.totalCents, l.screens ?? null]));
  return key(detail.lines) !== key(again.lines) || detail.setupCents !== again.setupCents || detail.totalCents !== again.totalCents;
}

/** The lines whose screens are not what their price rests on any more: a print position that now has another count, whether the
 * count was a design's or a guess. A guess that turns out to be the real count has not moved. A line quoted before runs recorded
 * their screens is left alone. */
function screensMoved(detail: BulkOrderDetail, again: RepricedRun): { was: BulkQuoteLine; now: BulkQuoteLine }[] {
  const moved: { was: BulkQuoteLine; now: BulkQuoteLine }[] = [];
  detail.lines.forEach((was, i) => {
    const now = again.lines[i];
    if (!was.screens || !now?.screens) return;
    const counts = (screens: LineScreens) => JSON.stringify(screens.placements.map((p) => [p.position, p.screens]));
    if (counts(was.screens) !== counts(now.screens)) moved.push({ was, now });
  });
  return moved;
}

async function saveRepriced(bulkOrderId: string, again: RepricedRun): Promise<void> {
  const [row] = await db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.id, bulkOrderId)).limit(1);
  if (!row) return;
  const quote = (row.quote as PersistedBulkQuote | null) ?? EMPTY_QUOTE;
  await db
    .update(schema.bulkOrders)
    .set({ quote: { ...quote, lines: again.lines, setupCents: again.setupCents, totalCents: again.totalCents }, updatedAt: new Date() })
    .where(eq(schema.bulkOrders.id, bulkOrderId));
}

// -- proof round-trip -------------------------------------------------------

/** The method as the proof names it. The number in a screen service's name is only a first guess at the colours, so a
 * screen-printed line says "Screen print" and the screens below say what the price rests on. */
function methodName(line: BulkQuoteLine): string {
  return techniqueOfService(line.printServiceCode) === 'screen' ? 'Screen print' : line.printServiceName;
}

function buildBulkSpec(detail: BulkOrderDetail): ProofSpecLine[] {
  const methods = [...new Set(detail.lines.map(methodName))];
  return [
    ...detail.lines.map((l) => ({ label: l.label, value: `€${(l.unitCents / 100).toFixed(2)} / unit` })),
    // The artist chose the method at quote time, so the proof says which one they are approving.
    { label: 'Print method', value: methods.join(', ') },
    ...detail.lines.flatMap((l) =>
      l.screens ? [{ label: `Screens · ${blankDisplayName(l.blankCode, l.blankName)} · ${l.colourName}`, value: l.screens.summary }] : [],
    ),
    { label: 'Setup', value: `€${(detail.setupCents / 100).toFixed(2)}` },
    { label: 'Shipping', value: `€${(detail.shippingCents / 100).toFixed(2)}` },
    { label: 'Total', value: `€${(detail.totalCents / 100).toFixed(2)}` },
    { label: 'Lead time', value: detail.leadTime },
    { label: 'Ships to', value: `${detail.shipTo.name}, ${detail.shipTo.city}, ${detail.shipTo.country}` },
  ];
}

export async function submitBulkProof(storeId: string, bulkOrderId: string): Promise<ServiceResult<ProofDetail>> {
  let detail = await getBulkOrder(storeId, bulkOrderId);
  if (!detail) return { ok: false, error: 'Bulk order not found for this shop.' };
  if (detail.status !== 'quoted') {
    return { ok: false, error: `A proof can only be submitted from "quoted" (this bulk order is "${detail.status}").` };
  }

  // The proof is what the artist signs off, so it carries the price the design's screens give now: the print files may have
  // been made since the quote (a guess becomes the real count), or made again with another count.
  const again = await repriceRun(detail, await getScreenPriceTable());
  if (!again.ok) return { ok: false, error: again.error };
  if (priceChanged(detail, again.value)) {
    await saveRepriced(bulkOrderId, again.value);
    const refreshed = await getBulkOrder(storeId, bulkOrderId);
    if (refreshed) detail = refreshed;
  }

  const mockupUrls = detail.lines.map((l) => l.mockupUrl).filter((u): u is string => !!u);
  const proof = await createBulkProof(bulkOrderId, mockupUrls, buildBulkSpec(detail));

  const moved = await transitionBulk(bulkOrderId, 'proof_pending', detail.status);
  if (!moved.ok) return { ok: false, error: moved.error };

  return { ok: true, value: proof };
}

/** The run a proof belongs to, when it is this shop's. */
async function bulkOrderOfProof(storeId: string, proofId: string): Promise<string | null> {
  const [row] = await db
    .select({ bulkOrderId: schema.proofs.bulkOrderId })
    .from(schema.proofs)
    .innerJoin(schema.bulkOrders, eq(schema.proofs.bulkOrderId, schema.bulkOrders.id))
    .where(and(eq(schema.proofs.id, proofId), eq(schema.bulkOrders.storeId, storeId)))
    .limit(1);
  return row?.bulkOrderId ?? null;
}

export async function approveBulkProof(storeId: string, proofId: string, userId: string): Promise<ServiceResult<ProofDetail>> {
  // The price on the proof rests on the screens the design had when it was sent. If they changed since (the artist asked for
  // fewer, pre-press made the files again, a guess became the real count), approving would sign off a price that is no longer
  // true: the quote is worked out again, the proof goes back, and the artist looks at the new one.
  const currentRun = await bulkOrderOfProof(storeId, proofId);
  const detail = currentRun ? await getBulkOrder(storeId, currentRun) : null;
  if (currentRun && detail?.status === 'proof_pending') {
    const again = await repriceRun(detail, await getScreenPriceTable());
    if (!again.ok) return { ok: false, error: again.error };
    // A job is making a design's screen files while the artist approves: the count, and so the price, can still change.
    // Nothing is changed; the artist approves once the files are ready (and sees the new price then if it moved).
    if (again.value.lines.some((l) => l.screens?.placements.some((p) => p.pending))) {
      return { ok: false, error: 'The print files for this design are being prepared, so the screen count, and the price, can still change. Approve the proof once they are ready.' };
    }
    const moved = screensMoved(detail, again.value);
    if (moved.length > 0) {
      await saveRepriced(currentRun, again.value);
      const changes = moved.map(({ was, now }) => `${blankDisplayName(was.blankCode, was.blankName)} in ${was.colourName} was ${was.screens?.summary ?? 'priced differently'}, now ${now.screens?.summary}`).join('; ');
      const message = `The screens changed since this proof was sent: ${changes}. The price is now €${(again.value.totalCents / 100).toFixed(2)}. The quote is updated, so send the proof again to see it.`;
      await setBulkProofStatus(storeId, proofId, 'changes_requested', { notes: message });
      await transitionBulk(currentRun, 'quoted', 'proof_pending');
      return { ok: false, error: message };
    }
  }

  const result = await setBulkProofStatus(storeId, proofId, 'approved', { userId });
  if (!result.ok) return result;
  const bulkOrderId = result.value.bulkOrderId;
  if (!bulkOrderId) return { ok: false, error: 'Proof is not linked to a bulk order.' };

  const moved = await transitionBulk(bulkOrderId, 'awaiting_payment');
  if (!moved.ok) return { ok: false, error: moved.error };

  return result;
}

export async function requestBulkChanges(storeId: string, proofId: string, notes: string): Promise<ServiceResult<ProofDetail>> {
  const result = await setBulkProofStatus(storeId, proofId, 'changes_requested', { notes });
  if (!result.ok) return result;
  const bulkOrderId = result.value.bulkOrderId;
  if (!bulkOrderId) return { ok: false, error: 'Proof is not linked to a bulk order.' };

  const moved = await transitionBulk(bulkOrderId, 'quoted');
  if (!moved.ok) return { ok: false, error: moved.error };

  return result;
}

// -- payment ----------------------------------------------------------------

/** Records the Checkout Session id on the bulk order (quote.checkoutSessionId)
 * once pay_bulk_order / buildBulkCheckout starts one. Called from
 * checkout.ts so it never writes to bulk_orders directly. */
export async function recordBulkCheckoutSession(storeId: string, bulkOrderId: string, sessionId: string): Promise<void> {
  const row = await getOwnedBulkOrderRow(storeId, bulkOrderId);
  if (!row) return;
  const quote = (row.quote as PersistedBulkQuote | null) ?? EMPTY_QUOTE;
  await db
    .update(schema.bulkOrders)
    .set({ quote: { ...quote, checkoutSessionId: sessionId }, updatedAt: new Date() })
    .where(eq(schema.bulkOrders.id, bulkOrderId));
}

/** A bulk line quoted directly off a blank (no productId) has nothing to
 * hang an order_item off — order_items.product_id is NOT NULL. Rather than
 * loosen that constraint (a shared schema owned outside this wave), we
 * materialise a normal draft product for the exact blank/print/colour/size
 * spec at payment time, the same shape create_product would make by hand.
 * It never touches the fan storefront (draft, never published) but does
 * show up in list_products — see the wave report's contract-gaps note. */
async function ensureLineProduct(storeId: string, line: BulkQuoteLine): Promise<string> {
  if (line.productId) return line.productId;

  // The backing product carries the method the run chose, screen print
  // included (forRun), and never reaches the shop with it (see transition in
  // products.ts). A line with no placement gets its blank's usual spot, not a
  // chest print on a pair of trousers.
  const blankRows = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, line.blankCode)).limit(1);
  const created = await createProduct({
    storeId,
    designId: line.designId ?? undefined,
    blankCode: line.blankCode,
    printServiceCode: line.printServiceCode,
    placement: line.placement ?? defaultPlacementFor(blankRows[0]?.type ?? ''),
    colours: [line.colourCode],
    sizes: Object.keys(line.sizes),
    name: `Bulk run — ${line.blankName} (${line.colourName})`,
    forRun: true,
  });
  if (!created.ok) throw new Error(`Could not create a backing product for bulk line "${line.label}": ${created.error}`);
  return created.value.id;
}

/**
 * Marks a bulk order paid from a Checkout Session snapshot — the bulk-order
 * analogue of orders.ts's markPaid, sharing its processed_webhook_events
 * idempotency table under a distinct synthetic key so the two never collide.
 * Unlike the POD path, this is where the `orders` / `order_items` rows are
 * *created* (bulk_orders stands in for "pending" until payment): applies
 * 100% of the charge as MerchFrom's application fee (transferCents 0 — no
 * Connect transfer for a bulk order) and moves bulk_orders straight from
 * 'awaiting_payment' to 'in_production' (see the state machine's 'paid'
 * value doc above).
 */
export async function markBulkPaid(sessionId: string, session: CheckoutSessionSnapshot): Promise<ServiceResult<BulkOrderDetail>> {
  const bulkOrderId = session.metadata.bulkOrderId;
  if (!bulkOrderId) return { ok: false, error: 'Checkout session has no bulkOrderId in metadata.' };

  const firstTime = await claimWebhookEvent(`bulk.checkout.session.completed:${sessionId}`, bulkOrderId);

  const rows = await db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.id, bulkOrderId)).limit(1);
  const bulkRow = rows[0];
  if (!bulkRow) return { ok: false, error: 'Bulk order not found.' };

  if (!firstTime || bulkRow.orderId) {
    return { ok: true, value: toBulkOrderDetail(bulkRow) };
  }

  if (bulkRow.status !== 'awaiting_payment') {
    return { ok: false, error: `Bulk order must be awaiting payment to be marked paid (this one is "${bulkRow.status}").` };
  }

  const detail = toBulkOrderDetail(bulkRow);
  const store = await getStore(bulkRow.storeId);
  if (!store) return { ok: false, error: 'Shop not found for this bulk order.' };

  const artistRows = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, store.artistId)).limit(1);
  const fanEmail = artistRows[0]?.email ?? null; // the artist is the buyer — see markBulkPaid's doc

  const grossCents = session.amountTotalCents ?? detail.totalCents;
  const taxCents = session.taxCents ?? 0;

  const [order] = await db
    .insert(schema.orders)
    .values({
      storeId: bulkRow.storeId,
      orderType: 'bulk',
      status: 'paid',
      totalAmount: grossCents,
      fanEmail,
      shippingAddress: detail.shipTo,
      shippingCents: detail.shippingCents,
      taxCents,
      applicationFeeCents: grossCents, // 100% platform — bulk has no artist transfer
      transferCents: 0,
      stripePaymentIntentId: session.paymentIntentId,
      stripeCheckoutSessionId: sessionId,
      productionStatus: 'queued',
    })
    .returning();

  const orderItemValues: (typeof schema.orderItems.$inferInsert)[] = [];
  for (const line of detail.lines) {
    const productId = await ensureLineProduct(bulkRow.storeId, line);
    for (const [size, qty] of Object.entries(line.sizes)) {
      if (qty <= 0) continue;
      orderItemValues.push({
        orderId: order.id,
        productId,
        quantity: qty,
        priceAtPurchase: line.unitCents,
        colourCode: line.colourCode,
        size,
        unitBaseCostCents: line.unitCents,
      });
    }
  }
  if (orderItemValues.length > 0) await db.insert(schema.orderItems).values(orderItemValues);

  const [updatedRow] = await db
    .update(schema.bulkOrders)
    .set({ orderId: order.id, status: 'in_production', updatedAt: new Date() })
    .where(eq(schema.bulkOrders.id, bulkOrderId))
    .returning();

  // Print prep: the packs this run needs enter the pre-press queue. Best-effort,
  // like the notifications below: a failure never undoes the sale. Called once
  // the order exists and the bulk order points at it, so the queue can find the
  // run's lines (getRunLinesForOrder).
  try {
    await runHooks.markPacksNeededForOrder(order.id);
  } catch (err) {
    console.error('[markBulkPaid] markPacksNeededForOrder failed:', err instanceof Error ? err.message : err);
  }

  // Notifications are best-effort — never let a failure here undo the sale.
  const runNumber = await runNumberFor(bulkOrderId).catch(() => null);
  try {
    await runHooks.notify({
      userId: store.artistId,
      event: 'sale.new',
      text: runNumber !== null ? `${runLabel(runNumber)} is paid and going into production` : 'Your run is paid and going into production',
      payload: { bulkOrderId, orderId: order.id, grossCents },
      prompt: runNumber !== null ? `Open ${runLabel(runNumber)}` : 'Show my runs',
    });
  } catch (err) {
    console.error('[markBulkPaid] notify(sale.new) failed:', err instanceof Error ? err.message : err);
  }
  try {
    await runHooks.notify({
      userId: store.artistId,
      event: 'admin.queue_item',
      text: `Bulk order ready for production — ${detail.lines.length} line(s), €${(grossCents / 100).toFixed(2)}`,
      payload: { summary: `Bulk order ${bulkOrderId} paid`, kind: 'bulk_order', bulkOrderId, orderId: order.id },
    });
  } catch (err) {
    console.error('[markBulkPaid] notify(admin.queue_item) failed:', err instanceof Error ? err.message : err);
  }

  return { ok: true, value: toBulkOrderDetail(updatedRow) };
}

// -- cancellation -------------------------------------------------------

const CANCELLABLE_STATUSES = new Set<BulkOrderStatus>(['quoted', 'proof_pending', 'awaiting_payment']);

export async function cancelBulk(storeId: string, bulkOrderId: string): Promise<ServiceResult<BulkOrderDetail>> {
  const row = await getOwnedBulkOrderRow(storeId, bulkOrderId);
  if (!row) return { ok: false, error: 'Bulk order not found for this shop.' };
  if (!CANCELLABLE_STATUSES.has(row.status)) {
    return { ok: false, error: `Can't cancel a bulk order that is "${row.status}".` };
  }

  const moved = await transitionBulk(bulkOrderId, 'cancelled', row.status);
  if (!moved.ok) return { ok: false, error: moved.error };

  const updated = await getOwnedBulkOrderRow(storeId, bulkOrderId);
  return updated ? { ok: true, value: toBulkOrderDetail(updated) } : { ok: false, error: 'Bulk order not found after cancelling.' };
}
