import { and, desc, eq, inArray } from 'drizzle-orm';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { runLabel } from '@/lib/format/runs';
import { runNumberFor } from '@/lib/services/runs';
import { db, schema } from '@/lib/db';
import { createProduct, getProduct, type Placement } from '@/lib/services/products';
import { createBulkProof, setBulkProofStatus, type ProofDetail, type ProofSpecLine } from '@/lib/services/proofs';
import { printServicesFor, quoteFor } from '@/lib/services/quotes';
import { zoneForCountry } from '@/lib/services/shipping';
import { getStore } from '@/lib/services/stores';
import { claimWebhookEvent } from '@/lib/services/orders';
import { notify } from '@/lib/services/notifications';
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
  colourCode: string;
  colourName: string;
  /** size code -> quantity */
  sizes: Record<string, number>;
  qty: number;
  unitCents: number;
  totalCents: number;
  label: string;
  mockupUrl: string | null;
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

async function resolveLine(storeId: string, input: CreateBulkQuoteLineInput): Promise<LineResult> {
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
    designId = product.designId ?? designId;
    blankCode = product.blankCode;
    blankName = product.blankName;
    printServiceCode = product.printServiceCode;
    printServiceName = product.printServiceName;
    placement = product.placement;

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

    if (designId) {
      const designRows = await db
        .select({ id: schema.designs.id, storeId: schema.designs.storeId })
        .from(schema.designs)
        .where(eq(schema.designs.id, designId))
        .limit(1);
      const design = designRows[0];
      if (!design || design.storeId !== storeId) return { ok: false, error: 'Design not found for this shop.' };
    }

    const blankRows = await db.select().from(schema.blanks).where(eq(schema.blanks.code, input.blankCode)).limit(1);
    const blank = blankRows[0];
    if (!blank) return { ok: false, error: `Unknown blank code "${input.blankCode}".` };
    blankCode = blank.code;
    blankName = blankDisplayName(blank.code, blank.name);
    placement = input.placement;

    const services = await printServicesFor(input.blankCode);
    const service = services.find((s) => s.code === input.printServiceCode);
    if (!service) return { ok: false, error: `"${input.printServiceCode}" isn't offered on ${blankName} (${input.blankCode}).` };
    printServiceCode = service.code;
    printServiceName = service.name;

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

  const quote = await quoteFor({ blankCode, printServiceCode, qty });
  if (!quote) return { ok: false, error: `No pricing configured for ${blankCode} with ${printServiceCode}.` };

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
      colourCode: input.colourCode,
      colourName,
      sizes,
      qty,
      unitCents: quote.unitBaseCostCents,
      totalCents: quote.unitBaseCostCents * qty,
      label: `${blankName} · ${colourName} · ${qty} pcs`,
      mockupUrl,
    },
  };
}

/**
 * Quotes a bulk run: per-line pricing at the seeded quantity breaks, setup
 * once per distinct print service, and shipping by a flat zone rate scaled
 * to a "pallet" factor (ceil(totalUnits / 20)) rather than the retail
 * free-over-X table, which doesn't apply to a bulk run. Persists a new
 * bulk_orders row in 'quoted'.
 */
export async function createBulkQuote(input: CreateBulkQuoteInput): Promise<ServiceResult<BulkOrderDetail>> {
  if (!input.lines || input.lines.length === 0) return { ok: false, error: 'At least one line is required.' };

  const shipTo = normaliseShipTo(input.shipTo);
  if (!shipTo) return { ok: false, error: 'A complete shipping address (name, line1, city, postcode, 2-letter country) is required.' };

  const lines: BulkQuoteLine[] = [];
  for (const lineInput of input.lines) {
    const resolved = await resolveLine(input.storeId, lineInput);
    if (!resolved.ok) return resolved;
    lines.push(resolved.value);
  }

  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);

  const distinctServiceCodes = [...new Set(lines.map((l) => l.printServiceCode))];
  const serviceRows = await db
    .select({ code: schema.printServices.code, setupCents: schema.printServices.setupCents })
    .from(schema.printServices)
    .where(inArray(schema.printServices.code, distinctServiceCodes));
  const setupCents = serviceRows.reduce((sum, s) => sum + (s.setupCents ?? 0), 0);

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

// -- proof round-trip -------------------------------------------------------

function buildBulkSpec(detail: BulkOrderDetail): ProofSpecLine[] {
  return [
    ...detail.lines.map((l) => ({ label: l.label, value: `€${(l.unitCents / 100).toFixed(2)} / unit` })),
    { label: 'Setup', value: `€${(detail.setupCents / 100).toFixed(2)}` },
    { label: 'Shipping', value: `€${(detail.shippingCents / 100).toFixed(2)}` },
    { label: 'Total', value: `€${(detail.totalCents / 100).toFixed(2)}` },
    { label: 'Lead time', value: detail.leadTime },
    { label: 'Ships to', value: `${detail.shipTo.name}, ${detail.shipTo.city}, ${detail.shipTo.country}` },
  ];
}

export async function submitBulkProof(storeId: string, bulkOrderId: string): Promise<ServiceResult<ProofDetail>> {
  const detail = await getBulkOrder(storeId, bulkOrderId);
  if (!detail) return { ok: false, error: 'Bulk order not found for this shop.' };
  if (detail.status !== 'quoted') {
    return { ok: false, error: `A proof can only be submitted from "quoted" (this bulk order is "${detail.status}").` };
  }

  const mockupUrls = detail.lines.map((l) => l.mockupUrl).filter((u): u is string => !!u);
  const proof = await createBulkProof(bulkOrderId, mockupUrls, buildBulkSpec(detail));

  const moved = await transitionBulk(bulkOrderId, 'proof_pending', detail.status);
  if (!moved.ok) return { ok: false, error: moved.error };

  return { ok: true, value: proof };
}

export async function approveBulkProof(storeId: string, proofId: string, userId: string): Promise<ServiceResult<ProofDetail>> {
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

  const created = await createProduct({
    storeId,
    designId: line.designId ?? undefined,
    blankCode: line.blankCode,
    printServiceCode: line.printServiceCode,
    placement: line.placement ?? { position: 'front_chest', widthCm: 28 },
    colours: [line.colourCode],
    sizes: Object.keys(line.sizes),
    name: `Bulk run — ${line.blankName} (${line.colourName})`,
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

  // Notifications are best-effort — never let a failure here undo the sale.
  const runNumber = await runNumberFor(bulkOrderId).catch(() => null);
  try {
    await notify({
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
    await notify({
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
