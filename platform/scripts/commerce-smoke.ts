/**
 * Commerce smoke test (wave 2 — Money). Calls services and the publish_store
 * tool directly (no agent loop, no HTTP), against STRIPE_MOCK=1, so it
 * exercises Stripe onboarding -> publish -> checkout -> webhook-equivalent
 * markPaid end to end without needing real Stripe keys.
 *
 * Run with: `STRIPE_MOCK=1 AGENT_MOCK=1 npx tsx scripts/commerce-smoke.ts`
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

const HOODIE_BLANK = 'STSU177'; // 'Cruiser 2.0' — has dtg, C002, sizes S-XXL in the seed
const PRINT_SERVICE = 'dtg'; // shop products print DTG/DTF only (screen print is for runs)
const COLOUR = 'C002'; // Black

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
  const { eq } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { createProduct, getProduct, setPrice } = await import('../lib/services/products');
  const {
    startOnboarding,
    getStripeAccountStatus,
    syncStripeAccountStatus,
    completeMockOnboarding,
    getStripeGateway,
  } = await import('../lib/services/stripe');
  const { buildCheckout } = await import('../lib/services/checkout');
  const { markPaid, getOrder } = await import('../lib/services/orders');
  const { publishStoreTool } = await import('../lib/tools/store');

  async function ensureSmokeUser() {
    const clerkId = 'commerce-smoke-test';
    const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.users)
      .values({ clerkId, email: 'commerce-smoke@blackoutmerch.test', displayName: 'Commerce Smoke Test', role: 'artist' })
      .returning();
    return created;
  }

  async function ensureSmokeStore(userId: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug: 'commerce-smoke-shop', name: 'Commerce Smoke Shop', country: 'ES', currency: 'EUR', locale: 'en', isPublished: false })
      .returning();
    return created;
  }

  const user = await ensureSmokeUser();
  const store = await ensureSmokeStore(user.id);
  console.log(`Smoke store: ${store.name} (${store.id})`);

  // The mock Stripe gateway's account/session state lives only in this
  // process's memory, but stripe_accounts is a real row that would carry a
  // stale accountId over from a previous run of this script — wipe it (and
  // the publish flag) so onboarding always starts clean and consistent with
  // this run's in-memory mock.
  await db.delete(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, store.id));
  await db.update(schema.artistStores).set({ isPublished: false }).where(eq(schema.artistStores.id, store.id));

  // -- 1. onboarding --------------------------------------------------------
  console.log('\n=== stripe onboarding ===');
  const onboarding = await startOnboarding(store.id, { returnUrl: 'http://localhost:3006/api/stripe/connect?return=1', refreshUrl: 'http://localhost:3006/api/stripe/connect?refresh=1' });
  if (!onboarding.ok) throw new Error(`startOnboarding failed: ${onboarding.error}`);
  console.log(`ok: startOnboarding succeeds — account=${onboarding.accountId} url=${onboarding.url}`);

  const statusBefore = await getStripeAccountStatus(store.id);
  assert(statusBefore.connected && !statusBefore.chargesEnabled, 'account created but not yet chargesEnabled');

  completeMockOnboarding(onboarding.accountId);
  const statusAfter = await syncStripeAccountStatus(store.id);
  if (!statusAfter) throw new Error('syncStripeAccountStatus returned null unexpectedly');
  assert(statusAfter.chargesEnabled && statusAfter.payoutsEnabled, 'chargesEnabled and payoutsEnabled after completeMockOnboarding + sync');

  // -- 2. product: create -> price -> live ------------------------------------
  console.log('\n=== product ===');
  const created = await createProduct({
    storeId: store.id,
    blankCode: HOODIE_BLANK,
    printServiceCode: PRINT_SERVICE,
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [COLOUR],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    name: 'Commerce Smoke Hoodie',
  });
  if (!created.ok) throw new Error(`createProduct failed: ${created.error}`);
  let product = created.value;
  console.log(`product ${product.id} baseCostCents=${product.baseCostCents} (${eur(product.baseCostCents)})`);

  const priced = await setPrice(store.id, product.id, 3500);
  if (!priced.ok) throw new Error(`setPrice failed: ${priced.error}`);
  console.log(`retailPriceCents=${priced.value.retailPriceCents} (${eur(priced.value.retailPriceCents)})`);

  // Publishing waits on the design's approval (Print-Prep-Plan section 7), which needs the print worker and real
  // artwork; a shop product has no proof of its own. This smoke is about checkout and payouts, so the product
  // goes live directly.
  await db.update(schema.products).set({ status: 'live', updatedAt: new Date() }).where(eq(schema.products.id, product.id));
  const live = await getProduct(store.id, product.id);
  if (!live) throw new Error('the smoke product disappeared after going live');
  assert(live.status === 'live', 'product status is live');
  product = live;

  // -- 3. publish_store (real gate, via the tool) ----------------------------
  console.log('\n=== publish_store ===');
  const ctx = { userId: user.id, clerkId: user.clerkId, role: 'artist' as const, storeId: store.id, conversationId: 'commerce-smoke', idempotencyKey: 'commerce-smoke-publish', locale: 'en' };
  const publishResult = await publishStoreTool.run(ctx, {});
  assert(publishResult.data.ok === true, `publish_store succeeds (${JSON.stringify(publishResult.data)})`);

  const storeAfterPublish = (await db.select().from(schema.artistStores).where(eq(schema.artistStores.id, store.id)).limit(1))[0];
  assert(storeAfterPublish?.isPublished === true, 'artist_stores.is_published is true');

  // -- 4. checkout: 2 lines to ES (domestic zone) ----------------------------
  console.log('\n=== checkout: 2 lines to ES ===');
  const checkout1 = await buildCheckout({
    storeSlug: store.slug,
    lines: [
      { productId: product.id, colourCode: COLOUR, size: 'S', qty: 1 },
      { productId: product.id, colourCode: COLOUR, size: 'M', qty: 2 },
    ],
    country: 'ES',
    email: 'fan@example.com',
  });
  if (!checkout1.ok) throw new Error(`buildCheckout(ES) failed: ${checkout1.error}`);
  console.log('ok: buildCheckout(ES) succeeds');
  assert(checkout1.value.url.startsWith('/mock-checkout/'), 'mock checkout URL shape');

  const baseCostCents = product.baseCostCents ?? 0;
  const unitCents = product.retailPriceCents ?? 0;
  const expectedSubtotal = unitCents * 1 + unitCents * 2;
  const expectedBaseCostTotal = baseCostCents * 3;
  const expectedShippingES = 450; // Spain zone, see scripts/seed.ts
  const expectedFee = expectedBaseCostTotal + expectedShippingES;
  const expectedTransfer = expectedSubtotal - expectedBaseCostTotal;

  const snapshot1 = await getStripeGateway().retrieveCheckoutSession(checkout1.value.sessionId);
  const paid1 = await markPaid(checkout1.value.sessionId, snapshot1);
  if (!paid1.ok) throw new Error(`markPaid(ES) failed: ${paid1.error}`);

  assert(paid1.value.status === 'paid', 'order status is paid');
  assert(paid1.value.totals.shippingCents === expectedShippingES, `shippingCents = ${expectedShippingES} (Spain flat rate)`);
  assert(paid1.value.totals.feeCents === expectedFee, `feeCents = baseCostTotal(${expectedBaseCostTotal}) + shipping(${expectedShippingES}) = ${expectedFee}`);
  assert(paid1.value.totals.transferCents === expectedTransfer, `transferCents = subtotal(${expectedSubtotal}) - baseCostTotal(${expectedBaseCostTotal}) = ${expectedTransfer}`);
  assert(paid1.value.totals.grossCents === expectedSubtotal + expectedShippingES, 'grossCents = subtotal + shipping (mock has no tax)');

  const ledgerRows1 = await db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.orderId, paid1.value.id));
  assert(ledgerRows1.length === 1, 'exactly one payout_ledger row for the order');
  const anomalies1 = (ledgerRows1[0]?.anomalyFlags as string[] | null) ?? [];
  assert(anomalies1.length === 0, `no anomaly flags (got: ${JSON.stringify(anomalies1)})`);

  // idempotency: calling markPaid again with the same session must not double-insert a ledger row
  const paidAgain = await markPaid(checkout1.value.sessionId, snapshot1);
  assert(paidAgain.ok, 'markPaid is idempotent on a second call');
  const ledgerRowsAfterRetry = await db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.orderId, paid1.value.id));
  assert(ledgerRowsAfterRetry.length === 1, 'still exactly one payout_ledger row after a duplicate markPaid call');

  const publicOrder = await getOrder(store.id, paid1.value.id);
  assert(!!publicOrder?.token, 'order carries a lookup token (tracking.token)');

  // -- 5. checkout: rest-of-world zone ----------------------------------------
  console.log('\n=== checkout: rest-of-world (JP) ===');
  const checkout2 = await buildCheckout({
    storeSlug: store.slug,
    lines: [{ productId: product.id, colourCode: COLOUR, size: 'L', qty: 1 }],
    country: 'JP',
    email: 'other-fan@example.com',
  });
  if (!checkout2.ok) throw new Error(`buildCheckout(JP) failed: ${checkout2.error}`);
  console.log('ok: buildCheckout(JP) succeeds');

  const snapshot2 = await getStripeGateway().retrieveCheckoutSession(checkout2.value.sessionId);
  const paid2 = await markPaid(checkout2.value.sessionId, snapshot2);
  if (!paid2.ok) throw new Error(`markPaid(JP) failed: ${paid2.error}`);

  const expectedShippingRoW = 1990; // Rest of world zone, see scripts/seed.ts
  assert(paid2.value.totals.shippingCents === expectedShippingRoW, `shippingCents = ${expectedShippingRoW} (rest-of-world flat rate)`);
  assert(Number(paid2.value.totals.shippingCents) !== Number(paid1.value.totals.shippingCents), 'rest-of-world shipping differs from the Spain zone');

  console.log('\nCommerce smoke test complete.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
