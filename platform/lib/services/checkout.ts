import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { appBaseUrl, getStripeGateway, type CheckoutLineItemInput } from '@/lib/services/stripe';
import { REST_OF_WORLD_COUNTRIES, shippingCentsFor, zoneForCountry } from '@/lib/services/shipping';
import { storeUrl } from '@/lib/services/stores';
import { getBulkOrder, recordBulkCheckoutSession } from '@/lib/services/bulk';
import type { CheckoutLine, CheckoutRequest, CheckoutResponse } from '@/lib/agent/protocol';

// Builds a pending order + Stripe Checkout Session for a fan's cart (the POD
// path — see Platform-Plan.md §6). This is the only place that creates an
// order; orders.markPaid is the only place that ever moves it to 'paid'.
// Public and unauthenticated — every check here is a real re-validation
// against the DB, never trusting anything the cart page sent beyond ids/qty.

export type BuildCheckoutResult = { ok: true; value: CheckoutResponse } | { ok: false; error: string };

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * 24-char url-safe order-lookup token, stored in orders.tracking.token.
 *
 * Decision: the schema has no dedicated "public order token" column, only
 * `stripeCheckoutSessionId` (unique) and a free-form `tracking` jsonb. We
 * mint our own random token rather than reusing the Stripe session id so the
 * fan-facing order URL never leaks a Stripe identifier, and so the token
 * keeps working even if a future flow re-creates a Checkout Session for the
 * same order (e.g. a retried payment). It lives at tracking.token; carrier
 * tracking added later (set_tracking, wave 3) merges into the same object
 * under tracking.carrier / tracking.code, never overwriting the token.
 */
function generateOrderToken(): string {
  let out = '';
  for (let i = 0; i < 24; i += 1) out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  return out;
}

interface CheckoutProductInfo {
  id: string;
  name: string;
  status: string;
  retailPriceCents: number | null;
  baseCostCents: number | null;
  colours: Map<string, string>; // code -> name
  sizes: Set<string>;
}

async function loadCheckoutProducts(storeId: string, productIds: string[]): Promise<Map<string, CheckoutProductInfo>> {
  const ids = [...new Set(productIds)];
  const map = new Map<string, CheckoutProductInfo>();
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      status: schema.products.status,
      retailPriceCents: schema.products.retailPriceCents,
      baseCostCents: schema.products.baseCostCents,
    })
    .from(schema.products)
    .where(and(eq(schema.products.storeId, storeId), inArray(schema.products.id, ids)));

  for (const row of rows) map.set(row.id, { ...row, colours: new Map(), sizes: new Set() });

  const [colourRows, sizeRows] = await Promise.all([
    db
      .select({ productId: schema.productColours.productId, code: schema.productColours.colourCode, name: schema.colours.name })
      .from(schema.productColours)
      .innerJoin(schema.colours, eq(schema.productColours.colourCode, schema.colours.code))
      .where(inArray(schema.productColours.productId, ids)),
    db
      .select({ productId: schema.productSizes.productId, size: schema.productSizes.size })
      .from(schema.productSizes)
      .where(inArray(schema.productSizes.productId, ids)),
  ]);
  for (const c of colourRows) map.get(c.productId)?.colours.set(c.code, c.name);
  for (const s of sizeRows) map.get(s.productId)?.sizes.add(s.size);

  return map;
}

function validateLine(line: CheckoutLine, product: CheckoutProductInfo | undefined): string | null {
  if (!product) return 'One of the items in your cart is no longer available.';
  if (product.status !== 'live') return `"${product.name}" is not currently for sale.`;
  if (product.retailPriceCents == null || product.baseCostCents == null) return `"${product.name}" has no price set yet.`;
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) return `Invalid quantity for "${product.name}".`;
  if (!product.colours.has(line.colourCode)) return `"${product.name}" doesn't come in that colour.`;
  if (!product.sizes.has(line.size)) return `"${product.name}" doesn't come in that size.`;
  return null;
}

export async function buildCheckout(req: CheckoutRequest): Promise<BuildCheckoutResult> {
  if (!Array.isArray(req.lines) || req.lines.length === 0) return { ok: false, error: 'Cart is empty.' };
  if (!req.country || req.country.trim().length < 2) return { ok: false, error: 'A destination country is required.' };

  const storeRows = await db.select().from(schema.artistStores).where(eq(schema.artistStores.slug, req.storeSlug)).limit(1);
  const store = storeRows[0];
  if (!store || !store.isPublished) return { ok: false, error: 'Shop not found.' };

  const stripeRows = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, store.id)).limit(1);
  const stripeAccount = stripeRows[0];
  if (!stripeAccount?.chargesEnabled || !stripeAccount?.payoutsEnabled) {
    return { ok: false, error: 'This shop cannot accept payments right now.' };
  }

  const products = await loadCheckoutProducts(
    store.id,
    req.lines.map((l) => l.productId),
  );
  for (const line of req.lines) {
    const error = validateLine(line, products.get(line.productId));
    if (error) return { ok: false, error };
  }

  const zone = await zoneForCountry(req.country);
  if (!zone) return { ok: false, error: "We don't ship to that country yet." };

  let subtotalCents = 0;
  let baseCostTotalCents = 0;
  const orderItemValues: {
    productId: string;
    quantity: number;
    priceAtPurchase: number;
    colourCode: string;
    size: string;
    unitBaseCostCents: number;
  }[] = [];
  const stripeLineItems: { name: string; unitAmountCents: number; quantity: number }[] = [];

  for (const line of req.lines) {
    const product = products.get(line.productId)!;
    const unitCents = product.retailPriceCents!;
    const unitBaseCostCents = product.baseCostCents!;
    subtotalCents += unitCents * line.qty;
    baseCostTotalCents += unitBaseCostCents * line.qty;
    orderItemValues.push({
      productId: line.productId,
      quantity: line.qty,
      priceAtPurchase: unitCents,
      colourCode: line.colourCode,
      size: line.size,
      unitBaseCostCents,
    });
    const colourName = product.colours.get(line.colourCode) ?? line.colourCode;
    stripeLineItems.push({ name: `${product.name} — ${colourName} / ${line.size}`, unitAmountCents: unitCents, quantity: line.qty });
  }

  // MerchFrom keeps base cost + shipping; the artist's transfer is the
  // spread on the garment sale only (see stripe.ts's transferAmountCents doc
  // for why this must be an explicit Stripe transfer amount, not the
  // charge's implicit remainder — that remainder would include tax).
  const shippingCents = shippingCentsFor(zone, subtotalCents);
  const applicationFeeCents = baseCostTotalCents + shippingCents;
  const transferCents = subtotalCents - baseCostTotalCents;
  const token = generateOrderToken();

  const [order] = await db
    .insert(schema.orders)
    .values({
      storeId: store.id,
      orderType: 'pod',
      status: 'pending',
      totalAmount: subtotalCents + shippingCents, // pre-tax estimate; markPaid corrects to the actual charge total
      fanEmail: req.email ?? null,
      shippingAddress: { country: req.country.trim().toUpperCase() },
      shippingCents,
      taxCents: 0,
      applicationFeeCents,
      transferCents,
      tracking: { token },
    })
    .returning();

  await db.insert(schema.orderItems).values(orderItemValues.map((item) => ({ orderId: order.id, ...item })));

  const base = storeUrl(store.slug);
  const successUrl = `${base}/order/${token}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/cart`;

  const gateway = getStripeGateway();
  let session: { id: string; url: string };
  try {
    session = await gateway.createCheckoutSession({
      lineItems: stripeLineItems,
      currency: 'eur',
      customerEmail: req.email,
      applicationFeeAmountCents: applicationFeeCents,
      transferAmountCents: transferCents,
      destinationAccountId: stripeAccount.accountId,
      shippingAmountCents: shippingCents,
      shippingLabel: zone.name,
      shippingCountries: zone.countries.length > 0 ? zone.countries : REST_OF_WORLD_COUNTRIES,
      automaticTax: true,
      successUrl,
      cancelUrl,
      metadata: { orderId: order.id, storeId: store.id },
    });
  } catch (err) {
    // Leaves the order row 'pending' with no session id — harmless (it will
    // never be paid) and useful for debugging a Stripe-side failure.
    console.error('[checkout] createCheckoutSession failed:', err instanceof Error ? err.message : err);
    return { ok: false, error: 'Could not start checkout. Please try again.' };
  }

  await db.update(schema.orders).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.orders.id, order.id));

  return { ok: true, value: { url: session.url, sessionId: session.id } };
}

/**
 * Starts a Checkout Session for an already-quoted, already-approved bulk
 * order (service path B — see Platform-Plan.md §6). Unlike buildCheckout,
 * there is no order row yet — bulk_orders stands in for "pending" until
 * markBulkPaid materialises orders/order_items. One line item per bulk
 * line plus Setup/Shipping as plain line items, and no destinationAccountId
 * / transferAmountCents / applicationFeeAmountCents at all: MerchFrom is
 * simply the merchant of record here, not splitting anything with the
 * artist (see stripe.ts's CreateCheckoutSessionInput doc for what omitting
 * those does).
 */
export async function buildBulkCheckout(storeId: string, bulkOrderId: string): Promise<BuildCheckoutResult> {
  const detail = await getBulkOrder(storeId, bulkOrderId);
  if (!detail) return { ok: false, error: 'Bulk order not found for this shop.' };
  if (detail.status !== 'awaiting_payment') {
    return { ok: false, error: `This bulk order isn't ready for payment yet (status "${detail.status}").` };
  }

  const lineItems: CheckoutLineItemInput[] = detail.lines.map((line) => ({ name: line.label, unitAmountCents: line.totalCents, quantity: 1 }));
  if (detail.setupCents > 0) lineItems.push({ name: 'Setup', unitAmountCents: detail.setupCents, quantity: 1 });
  lineItems.push({ name: 'Shipping', unitAmountCents: detail.shippingCents, quantity: 1 });

  const base = appBaseUrl();
  const successUrl = `${base}/studio?bulk=${bulkOrderId}&paid=1`;
  const cancelUrl = `${base}/studio?bulk=${bulkOrderId}`;

  const gateway = getStripeGateway();
  let session: { id: string; url: string };
  try {
    session = await gateway.createCheckoutSession({
      lineItems,
      currency: 'eur',
      automaticTax: true,
      successUrl,
      cancelUrl,
      metadata: { bulkOrderId, storeId },
    });
  } catch (err) {
    console.error('[checkout] buildBulkCheckout createCheckoutSession failed:', err instanceof Error ? err.message : err);
    return { ok: false, error: 'Could not start checkout. Please try again.' };
  }

  await recordBulkCheckoutSession(storeId, bulkOrderId, session.id);

  return { ok: true, value: { url: session.url, sessionId: session.id } };
}
