/**
 * Admin ops smoke test (wave 3 — admin queue, production, supplier orders,
 * payout review, pricing). Calls services and tools directly (no agent loop,
 * no HTTP) against STRIPE_MOCK=1 / AGENT_MOCK=1, so it exercises the whole
 * pipeline without real Stripe/Anthropic keys.
 *
 * Sets up two paid POD orders (via the same buildCheckout/markPaid path
 * commerce-smoke.ts exercises): one is driven all the way to 'shipped'
 * (production state machine + notifications), the other is left 'queued' so
 * there's something to draft a supplier order from.
 *
 * Run with: `STRIPE_MOCK=1 AGENT_MOCK=1 npx tsx scripts/admin-smoke.ts`
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

const HOODIE_BLANK = 'STSU177'; // 'Cruiser 2.0' — dtg, C002, sizes S-XXL in the seed
const PRINT_SERVICE = 'dtg'; // shop products print DTG/DTF only (screen print is for runs)
const COLOUR = 'C002';
const FAN_EMAIL = 'admin-smoke-fan@blackoutmerch.test';

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
  const { eq, and, desc } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { createProduct, getProduct, setPrice } = await import('../lib/services/products');
  const { startOnboarding, completeMockOnboarding, syncStripeAccountStatus } = await import('../lib/services/stripe');
  const { buildCheckout } = await import('../lib/services/checkout');
  const { markPaid, getOrder } = await import('../lib/services/orders');
  const { publishStoreTool } = await import('../lib/tools/store');
  const { advance, setTracking, listProduction } = await import('../lib/services/production');
  const { draftSupplierOrder, getSupplierOrder, placeSupplierOrder, receiveSupplierOrder, listSupplierOrders } = await import('../lib/services/supplier');
  const { buildQueue } = await import('../lib/services/admin-queue');
  const { listAnomalies } = await import('../lib/services/payouts');
  const { setBaseCost, listBaseCosts } = await import('../lib/services/pricing-admin');
  const { adminQueueTool, draftSupplierOrderTool, placeSupplierOrderTool, advanceProductionTool } = await import('../lib/tools/admin');

  async function ensureUser(clerkId: string, email: string, role: 'artist' | 'admin') {
    const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
    if (existing[0]) {
      if (existing[0].role !== role) {
        const [updated] = await db.update(schema.users).set({ role }).where(eq(schema.users.id, existing[0].id)).returning();
        return updated ?? existing[0];
      }
      return existing[0];
    }
    const [created] = await db.insert(schema.users).values({ clerkId, email, displayName: clerkId, role }).returning();
    return created;
  }

  async function ensureStore(userId: string, slug: string, name: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug, name, country: 'ES', currency: 'EUR', locale: 'en', isPublished: false })
      .returning();
    return created;
  }

  const artist = await ensureUser('admin-smoke-artist', 'admin-smoke-artist@blackoutmerch.test', 'artist');
  const admin = await ensureUser('smoke-admin', 'smoke-admin@blackoutmerch.test', 'admin');
  const store = await ensureStore(artist.id, 'admin-smoke-shop', 'Admin Smoke Shop');
  console.log(`Artist store: ${store.name} (${store.id}); admin user: ${admin.email} (${admin.id})`);

  await db.delete(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, store.id));
  await db.update(schema.artistStores).set({ isPublished: false }).where(eq(schema.artistStores.id, store.id));

  // -- setup: onboarding + a live product ------------------------------------
  console.log('\n=== setup: onboarding + product ===');
  const onboarding = await startOnboarding(store.id, { returnUrl: 'http://localhost:3006/api/stripe/connect?return=1', refreshUrl: 'http://localhost:3006/api/stripe/connect?refresh=1' });
  if (!onboarding.ok) throw new Error(`startOnboarding failed: ${onboarding.error}`);
  completeMockOnboarding(onboarding.accountId);
  const stripeStatus = await syncStripeAccountStatus(store.id);
  assert(stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled, 'stripe onboarding mocked ready');

  const created = await createProduct({
    storeId: store.id,
    blankCode: HOODIE_BLANK,
    printServiceCode: PRINT_SERVICE,
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [COLOUR],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    name: 'Admin Smoke Hoodie',
  });
  if (!created.ok) throw new Error(`createProduct failed: ${created.error}`);
  let product = created.value;

  const priced = await setPrice(store.id, product.id, 3500);
  if (!priced.ok) throw new Error(`setPrice failed: ${priced.error}`);

  // Publishing waits on the design's approval (Print-Prep-Plan section 7), which needs the print worker and real
  // artwork; a shop product has no proof of its own. This smoke is about production, supplier orders and payouts,
  // so the product goes live directly.
  await db.update(schema.products).set({ status: 'live', updatedAt: new Date() }).where(eq(schema.products.id, product.id));
  const live = await getProduct(store.id, product.id);
  if (!live) throw new Error('the smoke product disappeared after going live');
  product = live;

  const ctx = { userId: artist.id, clerkId: artist.clerkId, role: 'artist' as const, storeId: store.id, conversationId: 'admin-smoke', idempotencyKey: 'admin-smoke-publish', locale: 'en' };
  const publishResult = await publishStoreTool.run(ctx, {});
  assert(publishResult.data.ok === true, `publish_store succeeds (${JSON.stringify(publishResult.data)})`);

  // -- two paid orders: one to ship, one to leave queued ---------------------
  console.log('\n=== two paid orders ===');
  const checkoutA = await buildCheckout({
    storeSlug: store.slug,
    lines: [{ productId: product.id, colourCode: COLOUR, size: 'M', qty: 2 }],
    country: 'ES',
    email: FAN_EMAIL,
  });
  if (!checkoutA.ok) throw new Error(`buildCheckout(A) failed: ${checkoutA.error}`);
  const { getStripeGateway } = await import('../lib/services/stripe');
  const snapshotA = await getStripeGateway().retrieveCheckoutSession(checkoutA.value.sessionId);
  const paidA = await markPaid(checkoutA.value.sessionId, snapshotA);
  if (!paidA.ok) throw new Error(`markPaid(A) failed: ${paidA.error}`);
  assert(paidA.value.productionStatus === 'queued', 'order A starts queued');

  const checkoutB = await buildCheckout({
    storeSlug: store.slug,
    lines: [{ productId: product.id, colourCode: COLOUR, size: 'L', qty: 1 }],
    country: 'ES',
    email: 'admin-smoke-fan-2@blackoutmerch.test',
  });
  if (!checkoutB.ok) throw new Error(`buildCheckout(B) failed: ${checkoutB.error}`);
  const snapshotB = await getStripeGateway().retrieveCheckoutSession(checkoutB.value.sessionId);
  const paidB = await markPaid(checkoutB.value.sessionId, snapshotB);
  if (!paidB.ok) throw new Error(`markPaid(B) failed: ${paidB.error}`);
  assert(paidB.value.productionStatus === 'queued', 'order B starts queued');

  const orderIdA = paidA.value.id;
  const orderIdB = paidB.value.id;

  // -- admin queue ------------------------------------------------------------
  console.log('\n=== admin_queue ===');
  const queue = await buildQueue();
  for (const section of queue.sections) console.log(`  ${section.title}: ${section.count}`);
  const productionSection = queue.sections.find((s) => s.key === 'production');
  assert(!!productionSection && productionSection.count >= 2, 'admin_queue production section sees both queued orders');

  const queueToolResult = await adminQueueTool.run({ ...ctx, role: 'admin', userId: admin.id, clerkId: admin.clerkId, storeId: null, idempotencyKey: 'smoke-admin-queue' }, {});
  assert(queueToolResult.ui?.cards?.[0]?.kind === 'admin_queue', 'admin_queue tool returns an admin_queue card');

  // -- production state machine: order A to shipped ---------------------------
  console.log('\n=== production: advance order A to shipped ===');
  const toPrinting = await advance(orderIdA);
  if (!toPrinting.ok) throw new Error(`advance(printing) failed: ${toPrinting.error}`);
  assert(toPrinting.value.productionStatus === 'printing', 'order A -> printing');

  const toPacked = await advance(orderIdA);
  if (!toPacked.ok) throw new Error(`advance(packed) failed: ${toPacked.error}`);
  assert(toPacked.value.productionStatus === 'packed', 'order A -> packed');

  const shipWithoutTracking = await advance(orderIdA, 'shipped');
  assert(!shipWithoutTracking.ok, 'advancing to shipped without tracking is refused');

  const tracked = await setTracking(orderIdA, { carrier: 'DHL', code: 'ADMSMOKE123' });
  if (!tracked.ok) throw new Error(`setTracking failed: ${tracked.error}`);
  assert(tracked.value.productionStatus === 'packed', 'setTracking does not change production status');
  assert(tracked.value.tracking?.carrier === 'DHL', 'tracking carrier persisted');

  const toolAdvanceCtx = { ...ctx, role: 'admin' as const, userId: admin.id, clerkId: admin.clerkId, storeId: null, idempotencyKey: 'smoke-advance-shipped' };
  const shippedResult = await advanceProductionTool.run(toolAdvanceCtx, { orderId: orderIdA });
  assert(shippedResult.data.ok === true && shippedResult.data.productionStatus === 'shipped', 'advance_production tool ships order A once tracking is set');

  const skipDelivered = await advance(orderIdA, 'delivered');
  assert(skipDelivered.ok && skipDelivered.value.productionStatus === 'delivered', 'order A -> delivered');
  const pastDelivered = await advance(orderIdA);
  assert(!pastDelivered.ok, 'advancing past delivered is refused');

  // -- notifications: assert rows + outbox files -------------------------------
  console.log('\n=== notifications: order.shipped ===');
  const notificationRows = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, artist.id), eq(schema.notifications.event, 'order.shipped')))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(5);
  assert(notificationRows.some((r) => r.channel === 'inapp'), 'artist gets an in-app order.shipped notification');
  assert(notificationRows.some((r) => r.channel === 'email'), 'artist gets an email order.shipped notification');

  const { readdir } = await import('fs/promises');
  const path = await import('path');
  const outboxDir = path.join(process.cwd(), 'var', 'outbox');
  const outboxFiles = await readdir(outboxDir).catch(() => [] as string[]);
  assert(outboxFiles.some((f) => f.includes('order.shipped') && !f.includes('fan.')), 'artist order.shipped outbox file written');
  assert(outboxFiles.some((f) => f.includes('fan.order.shipped')), 'fan order.shipped outbox file written');

  // -- supplier orders: draft from order B (still queued) ----------------------
  console.log('\n=== supplier order: draft -> place -> receive ===');
  const productionAfterShip = await listProduction({});
  assert(productionAfterShip.every((r) => r.orderId !== orderIdA), 'order A no longer in the active production list (delivered)');
  assert(productionAfterShip.some((r) => r.orderId === orderIdB && r.productionStatus === 'queued'), 'order B still queued');

  // Scoped to order B explicitly (rather than "every queued order") so this
  // assertion is unaffected by leftover queued orders from other smoke
  // scripts or prior runs of this one.
  const draftToolCtx = { ...ctx, role: 'admin' as const, userId: admin.id, clerkId: admin.clerkId, storeId: null, idempotencyKey: 'smoke-draft-supplier' };
  const draftResult = await draftSupplierOrderTool.run(draftToolCtx, { orderIds: [orderIdB] });
  assert(draftResult.data.ok === true, `draft_supplier_order tool succeeds (${JSON.stringify(draftResult.data)})`);
  const supplierOrderId = (draftResult.data as { supplierOrderId?: string }).supplierOrderId!;

  const drafted = await getSupplierOrder(supplierOrderId);
  assert(!!drafted && drafted.status === 'draft', 'supplier order is a draft');
  assert(!!drafted && drafted.forOrders.includes(orderIdB), 'supplier order references order B');
  assert(!!drafted && drafted.lines.some((l) => l.blankCode === HOODIE_BLANK && l.size === 'L' && l.qty === 1), 'supplier order line matches order B (L x1)');

  const placeResult = await placeSupplierOrderTool.run({ ...draftToolCtx, idempotencyKey: 'smoke-place-supplier' }, { supplierOrderId });
  assert(placeResult.data.ok === true && (placeResult.data as { status?: string }).status === 'placed', 'place_supplier_order tool places the draft');

  const received = await receiveSupplierOrder(supplierOrderId);
  if (!received.ok) throw new Error(`receiveSupplierOrder failed: ${received.error}`);
  assert(received.value.status === 'received', 'supplier order received');

  const supplierList = await listSupplierOrders();
  assert(supplierList.some((o) => o.id === supplierOrderId), 'listSupplierOrders sees the supplier order');

  // -- payouts ------------------------------------------------------------------
  console.log('\n=== payout anomalies ===');
  const anomalies = await listAnomalies(store.id);
  console.log(`  ${anomalies.length} flagged ledger row(s) for this store`);
  for (const row of anomalies) console.log(`  - ${row.id}: ${JSON.stringify(row.anomalyFlags)}`);

  // -- pricing admin --------------------------------------------------------------
  // qtyFrom 9999 is a smoke-test-only quantity break, deliberately distinct
  // from the seeded breaks (1, 25, 50, ...) so this doesn't overwrite the
  // qty=1 "from price" the storefront/catalogue actually show.
  console.log('\n=== set_base_cost / list_base_costs ===');
  const setResult = await setBaseCost({
    blankCode: HOODIE_BLANK,
    printServiceCode: PRINT_SERVICE,
    qtyFrom: 9999,
    garmentCostCents: 900,
    printCostCents: 250,
    marginCents: 600,
  });
  if (!setResult.ok) throw new Error(`setBaseCost failed: ${setResult.error}`);
  assert(setResult.value.totalCents === 1750, `setBaseCost total = 1750 (got ${setResult.value.totalCents})`);

  const baseCosts = await listBaseCosts(HOODIE_BLANK);
  const row = baseCosts.find((r) => r.printServiceCode === PRINT_SERVICE && r.qtyFrom === 9999);
  assert(!!row && row.totalCents === 1750, `listBaseCosts reads back the updated row (${eur(row?.totalCents)})`);

  const orderAAfter = await getOrder(store.id, orderIdA);
  console.log(`\nOrder A final status: ${orderAAfter?.status} / ${orderAAfter?.productionStatus}`);

  console.log('\nAdmin smoke test complete.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
