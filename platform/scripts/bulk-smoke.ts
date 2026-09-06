/**
 * Bulk order smoke test (wave 3 — Bulk). Calls services directly (no agent
 * loop, no HTTP), against STRIPE_MOCK=1: quote a run of 40 hoodies straight
 * off a blank (no shop product involved) -> proof -> approve -> checkout ->
 * markBulkPaid, then asserts the resulting `orders` row is 100%-to-MerchFrom
 * with no Connect transfer, and that a duplicate markBulkPaid is a no-op.
 *
 * Run with: `STRIPE_MOCK=1 AGENT_MOCK=1 npx tsx scripts/bulk-smoke.ts`
 * (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (lib/db.ts calls neon() at module scope) — every value import below
 * is a dynamic import() inside main(), after config() has run.
 */

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
process.env.AGENT_MOCK = process.env.AGENT_MOCK ?? '1';
process.env.STRIPE_MOCK = process.env.STRIPE_MOCK ?? '1';

const HOODIE_BLANK = 'STSU177'; // 'Cruiser 2.0' — has screen_1c, C002, sizes S-XXL in the seed
const PRINT_SERVICE = 'screen_1c';
const COLOUR = 'C002'; // Black
const QTY = 40;
const SIZES = { S: 8, M: 8, L: 8, XL: 8, XXL: 8 }; // 40 split evenly across S-XXL

const BARCELONA_SHIP_TO = { name: 'Studio Barcelona', line1: 'Carrer de Mallorca 401', city: 'Barcelona', postcode: '08013', country: 'ES' };

function eur(cents: number | null | undefined): string {
  return cents == null ? 'n/a' : `€${(cents / 100).toFixed(2)}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

async function main() {
  const { eq, and } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { quoteFor } = await import('../lib/services/quotes');
  const { zoneForCountry } = await import('../lib/services/shipping');
  const { createBulkQuote, submitBulkProof, approveBulkProof, markBulkPaid, cancelBulk, getBulkOrder } = await import('../lib/services/bulk');
  const { buildBulkCheckout } = await import('../lib/services/checkout');
  const { getStripeGateway } = await import('../lib/services/stripe');

  async function ensureSmokeUser() {
    const clerkId = 'bulk-smoke-test';
    const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.users)
      .values({ clerkId, email: 'bulk-smoke@merchfrom.test', displayName: 'Bulk Smoke Test', role: 'artist' })
      .returning();
    return created;
  }

  async function ensureSmokeStore(userId: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug: 'bulk-smoke-shop', name: 'Bulk Smoke Shop', country: 'ES', currency: 'EUR', locale: 'en', isPublished: false })
      .returning();
    return created;
  }

  const user = await ensureSmokeUser();
  const store = await ensureSmokeStore(user.id);
  console.log(`Smoke store: ${store.name} (${store.id})`);

  // -- expected pricing, computed independently of bulk.ts -------------------
  const expectedQuote = await quoteFor({ blankCode: HOODIE_BLANK, printServiceCode: PRINT_SERVICE, qty: QTY });
  if (!expectedQuote) throw new Error('quoteFor returned null for the smoke blank/print service — is the DB seeded?');
  const break25 = expectedQuote.breaks.find((b) => b.qtyFrom === 25);
  assert(!!break25, 'a 25-unit quantity break exists for STSU177 / screen_1c');
  assert(expectedQuote.unitBaseCostCents === break25!.unitCents, `quoteFor(qty=40) resolves to the 25+ break (${eur(break25!.unitCents)}/unit)`);

  const [printService] = await db.select().from(schema.printServices).where(eq(schema.printServices.code, PRINT_SERVICE)).limit(1);
  const expectedSetupCents = printService?.setupCents ?? 0;

  const zone = await zoneForCountry('ES');
  if (!zone) throw new Error('No shipping zone for ES — is the DB seeded?');
  const expectedShippingCents = zone.flatCents * Math.ceil(QTY / 20); // 2 "pallets" of 20

  // -- 1. quote ---------------------------------------------------------------
  console.log('\n=== create_bulk_quote: 40 hoodies ===');
  const quoted = await createBulkQuote({
    storeId: store.id,
    lines: [{ blankCode: HOODIE_BLANK, printServiceCode: PRINT_SERVICE, placement: { position: 'front_chest', widthCm: 28 }, colourCode: COLOUR, sizes: SIZES }],
    shipTo: BARCELONA_SHIP_TO,
  });
  if (!quoted.ok) throw new Error(`createBulkQuote failed: ${quoted.error}`);
  let bulk = quoted.value;
  console.log(`bulk order ${bulk.id} status=${bulk.status} totalCents=${bulk.totalCents} (${eur(bulk.totalCents)})`);

  assert(bulk.status === 'quoted', 'bulk order starts in "quoted"');
  assert(bulk.lines.length === 1, 'one resolved line');
  assert(bulk.lines[0].qty === QTY, `line quantity is ${QTY} (sum of sizes)`);
  assert(bulk.lines[0].unitCents === expectedQuote.unitBaseCostCents, `line unit cost uses the 25+ break (${eur(bulk.lines[0].unitCents)})`);
  assert(bulk.setupCents === expectedSetupCents, `setup applied once for the one distinct print service (${eur(bulk.setupCents)})`);
  assert(bulk.shippingCents === expectedShippingCents, `shipping = Spain zone(${eur(zone.flatCents)}) x ceil(40/20)=2 = ${eur(expectedShippingCents)}`);
  assert(bulk.leadTime === '10 working days', 'lead time is 10 working days under 100 units');

  const expectedLineTotal = bulk.lines[0].unitCents * QTY;
  const expectedTotalCents = expectedLineTotal + expectedSetupCents + expectedShippingCents;
  assert(bulk.totalCents === expectedTotalCents, `total = lines(${eur(expectedLineTotal)}) + setup(${eur(expectedSetupCents)}) + shipping(${eur(expectedShippingCents)}) = ${eur(expectedTotalCents)}`);

  // -- 2. proof round-trip ------------------------------------------------
  console.log('\n=== proof ===');
  const proof = await submitBulkProof(store.id, bulk.id);
  if (!proof.ok) throw new Error(`submitBulkProof failed: ${proof.error}`);
  assert(proof.value.status === 'pending', 'proof starts pending');
  assert(proof.value.bulkOrderId === bulk.id, 'proof is linked to this bulk order');

  bulk = (await getBulkOrder(store.id, bulk.id))!;
  assert(bulk.status === 'proof_pending', 'bulk order moves to "proof_pending" after submitting a proof');

  const approved = await approveBulkProof(store.id, proof.value.id, user.id);
  if (!approved.ok) throw new Error(`approveBulkProof failed: ${approved.error}`);
  assert(approved.value.status === 'approved', 'proof is approved');

  bulk = (await getBulkOrder(store.id, bulk.id))!;
  assert(bulk.status === 'awaiting_payment', 'bulk order moves to "awaiting_payment" after approval');

  // -- 3. checkout + payment ------------------------------------------------
  console.log('\n=== pay_bulk_order (checkout) ===');
  const checkout = await buildBulkCheckout(store.id, bulk.id);
  if (!checkout.ok) throw new Error(`buildBulkCheckout failed: ${checkout.error}`);
  assert(checkout.value.url.startsWith('/mock-checkout/'), 'mock checkout URL shape');

  bulk = (await getBulkOrder(store.id, bulk.id))!;
  assert(bulk.checkoutSessionId === checkout.value.sessionId, 'checkout session id recorded on the bulk order');

  const snapshot = await getStripeGateway().retrieveCheckoutSession(checkout.value.sessionId);
  const paid = await markBulkPaid(checkout.value.sessionId, snapshot);
  if (!paid.ok) throw new Error(`markBulkPaid failed: ${paid.error}`);
  assert(paid.value.status === 'in_production', 'bulk order moves straight to "in_production" on payment');
  assert(!!paid.value.orderId, 'bulk order carries an orderId after payment');

  const orderRows = await db.select().from(schema.orders).where(eq(schema.orders.id, paid.value.orderId!));
  const order = orderRows[0];
  if (!order) throw new Error('orders row not found after markBulkPaid');

  assert(order.orderType === 'bulk', 'orders.order_type is "bulk"');
  assert(order.status === 'paid', 'orders.status is "paid"');
  assert(order.productionStatus === 'queued', 'orders.production_status is "queued"');
  assert(order.fanEmail === user.email, 'orders.fan_email is the artist\'s own email (they are the buyer)');
  assert(order.shippingCents === expectedShippingCents, 'orders.shipping_cents matches the quote');
  assert(order.applicationFeeCents === order.totalAmount, 'applicationFeeCents = full gross (100% platform, no artist split)');
  assert(order.transferCents === 0, 'transferCents = 0 (no Stripe Connect transfer for a bulk order)');

  const itemRows = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  assert(itemRows.length === Object.keys(SIZES).length, `one order_item per size (${Object.keys(SIZES).length})`);
  const itemQtySum = itemRows.reduce((sum, i) => sum + i.quantity, 0);
  assert(itemQtySum === QTY, `order_items quantities sum to ${QTY}`);
  assert(
    itemRows.every((i) => i.unitBaseCostCents === bulk.lines[0].unitCents),
    'every order_item snapshots the same unit cost as the quote',
  );
  assert(
    itemRows.every((i) => !!i.productId),
    'every order_item has a backing product id (order_items.product_id is NOT NULL — see the wave report contract-gap note)',
  );

  // -- 4. idempotency -----------------------------------------------------
  console.log('\n=== idempotent second markBulkPaid ===');
  const paidAgain = await markBulkPaid(checkout.value.sessionId, snapshot);
  assert(paidAgain.ok, 'markBulkPaid is idempotent on a second call');
  assert(paidAgain.ok && paidAgain.value.orderId === order.id, 'second call returns the same orderId');

  const itemRowsAfterRetry = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  assert(itemRowsAfterRetry.length === itemRows.length, 'no duplicate order_items after a duplicate markBulkPaid call');

  const ordersForBulk = await db.select().from(schema.orders).where(and(eq(schema.orders.storeId, store.id), eq(schema.orders.orderType, 'bulk')));
  assert(ordersForBulk.filter((o) => o.id === order.id).length === 1, 'still exactly one orders row for this bulk order');

  // -- 5. cancel path (separate quote, never paid) ---------------------------
  console.log('\n=== cancel_bulk_order (separate quote) ===');
  const secondQuote = await createBulkQuote({
    storeId: store.id,
    lines: [{ blankCode: HOODIE_BLANK, printServiceCode: PRINT_SERVICE, placement: { position: 'front_chest', widthCm: 28 }, colourCode: COLOUR, sizes: { S: 5 } }],
    shipTo: BARCELONA_SHIP_TO,
  });
  if (!secondQuote.ok) throw new Error(`createBulkQuote (cancel scenario) failed: ${secondQuote.error}`);
  const cancelled = await cancelBulk(store.id, secondQuote.value.id);
  if (!cancelled.ok) throw new Error(`cancelBulk failed: ${cancelled.error}`);
  assert(cancelled.value.status === 'cancelled', 'a quoted (unpaid) bulk order can be cancelled');

  const cancelPaidAttempt = await cancelBulk(store.id, bulk.id);
  assert(!cancelPaidAttempt.ok, 'an in_production bulk order refuses to cancel');

  console.log('\nBulk smoke test complete.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
