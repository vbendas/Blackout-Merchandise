// Orders, the two parts print-prep touches: staff reading any shop's order, and the
// payment putting the order's DTG/DTF pack in the pre-press queue without ever
// being able to fail the payment. PGlite, with the print fakes.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser } from '@/scripts/test/pglite';
import { bootstrapPrint, seedShopOrder, type Harness } from '@/lib/print/test-support';
import type { PackNeed } from '@/lib/print/types';
import type { CheckoutSessionSnapshot } from '@/lib/services/stripe';

// No email leaves the machine and none is written to disk: with a key that is not one and no sender,
// the email gateway refuses before it does anything, and says so on the error log (filtered below).
process.env.RESEND_API_KEY = 're_test_not_a_key';
delete process.env.EMAIL_FROM;
const logError = console.error;
console.error = (...args: unknown[]) => {
  if (args.some((a) => String(a).includes('EMAIL_FROM is not configured'))) return;
  logError(...args);
};

let h: Harness;
let orders: typeof import('@/lib/services/orders');

before(async () => {
  h = await bootstrapPrint();
  orders = await import('@/lib/services/orders');
});

after(async () => {
  await h.close();
});

const snapshot = (orderId: string, over: Partial<CheckoutSessionSnapshot> = {}): CheckoutSessionSnapshot => ({
  id: `cs_${orderId}`,
  amountTotalCents: 2500,
  amountSubtotalCents: 2500,
  taxCents: 0,
  shippingCents: 0,
  currency: 'eur',
  customerEmail: 'fan@merchfrom.test',
  paymentIntentId: `pi_${orderId}`,
  metadata: { orderId },
  shippingDetails: null,
  paymentStatus: 'paid',
  ...over,
});

/** An order as checkout leaves it: pending, with one line, until the payment comes in. */
async function pendingOrder(productId: string, colourCode = 'C002'): Promise<string> {
  const [order] = await h.db
    .insert(schema.orders)
    .values({ storeId: h.artist.storeId, orderType: 'pod', status: 'pending', totalAmount: 2500, fanEmail: 'fan@merchfrom.test' })
    .returning({ id: schema.orders.id });
  await h.db.insert(schema.orderItems).values({ orderId: order.id, productId, quantity: 1, priceAtPurchase: 2500, colourCode, size: 'M' });
  return order.id;
}

const needsOf = (pack: { neededFor: unknown }) => pack.neededFor as (PackNeed & { orderId: string })[];

// -- staff reads -----------------------------------------------------------------

test('staff read any shop’s order in full, the artist only their own, and an id that is no order is nothing', async () => {
  const orderId = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId: h.productId, colourCode: 'C002', qty: 2 });
  const stranger = await seedUser(h.db, { email: 'other-shop@merchfrom.test', withStore: true });

  const detail = await orders.getOrderForStaff(orderId);
  assert.ok(detail);
  assert.equal(detail.id, orderId);
  assert.equal(detail.storeId, h.artist.storeId);
  assert.equal(detail.reference, `ORD-${orderId.slice(0, 8).toUpperCase()}`);
  assert.equal(detail.orderType, 'pod');
  assert.equal(detail.status, 'paid');
  assert.equal(detail.productionStatus, 'queued');
  assert.equal(detail.fanEmail, 'fan@merchfrom.test', 'staff see the fan’s email, as the artist does');
  assert.deepEqual(detail.lines, [{ label: 'Underwriter tee', colour: 'Black', size: 'M', qty: 2, unitCents: 2500 }]);
  assert.deepEqual(detail.totals, { grossCents: 2500, shippingCents: 0, taxCents: 0, feeCents: 0, transferCents: 0 });
  assert.equal(detail.tracking, null);
  assert.equal(detail.token, null);

  // It is the owner's own read, unscoped: the same detail, whichever shop it is.
  assert.deepEqual(await orders.getOrder(h.artist.storeId, orderId), detail);
  assert.equal(await orders.getOrder(stranger.storeId as string, orderId), null, 'another shop’s artist gets nothing');
  assert.deepEqual(await orders.getOrderForStaff(orderId), detail, 'and staff still see it');

  // Tracking comes through once it is set.
  await h.db.update(schema.orders).set({ tracking: { carrier: 'DHL', code: 'JD0146', url: 'https://track.test/JD0146', token: 'tok_abc' }, productionStatus: 'shipped' }).where(eq(schema.orders.id, orderId));
  const shipped = (await orders.getOrderForStaff(orderId))!;
  assert.deepEqual(shipped.tracking, { carrier: 'DHL', code: 'JD0146', url: 'https://track.test/JD0146' });
  assert.equal(shipped.token, 'tok_abc');
  assert.equal(shipped.productionStatus, 'shipped');

  // No such order: null, and a malformed id is not a database error.
  assert.equal(await orders.getOrderForStaff(randomUUID()), null);
  assert.equal(await orders.getOrderForStaff('not-an-order'), null);
  assert.equal(await orders.getOrderForStaff(''), null);
});

// -- the payment and the pre-press queue ----------------------------------------------

test('a paid shop order puts its DTG/DTF pack in the pre-press queue, once, however many times the payment is reported', async () => {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const packs = await h.packs(designVersionId);
  const dtg = packs.find((p) => p.technique === 'dtg_dtf')!;
  const orderId = await pendingOrder(productId);
  const reload = async (id: string) => (await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, id)))[0];

  assert.equal((await reload(dtg.id)).auditStatus, 'idle', 'built, but nobody needs it yet');

  const paid = await orders.markPaid(`cs_${orderId}`, snapshot(orderId));
  assert.ok(paid.ok, JSON.stringify(paid));
  assert.equal(paid.ok && paid.value.status, 'paid');
  assert.equal(paid.ok && paid.value.productionStatus, 'queued');

  const after = await reload(dtg.id);
  assert.equal(after.auditStatus, 'waiting');
  assert.deepEqual(needsOf(after).map((n) => [n.kind, n.orderId]), [['shop_order', orderId]]);
  for (const pack of packs.filter((p) => p.technique === 'screen')) assert.equal((await reload(pack.id)).auditStatus, 'idle', 'a shop sale never prints screens');

  // The payment reported again (the webhook and the mock page, or a retry) changes nothing.
  assert.ok((await orders.markPaid(`cs_${orderId}`, snapshot(orderId))).ok);
  assert.ok((await orders.markPaid(`cs_again_${orderId}`, snapshot(orderId, { id: `cs_again_${orderId}` }))).ok);
  assert.equal(needsOf(await reload(dtg.id)).length, 1);

  // The payment was recorded as it always is.
  const [row] = await h.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  assert.equal(row.status, 'paid');
  assert.equal((await h.db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.orderId, orderId))).length, 1);
});

test('a design nobody has prepared is prepared when its first sale comes in, and the sale does not wait for it', async () => {
  const { designId, productId } = await h.newDesign();
  const orderId = await pendingOrder(productId);

  const paid = await orders.markPaid(`cs_${orderId}`, snapshot(orderId));
  assert.ok(paid.ok);
  const jobs = await h.db.select().from(schema.printJobs);
  const queued = jobs.filter((j) => (j.input as { designId?: string }).designId === designId);
  assert.equal(queued.length, 1, 'a build was queued for the worker');
  assert.equal(queued[0].status, 'queued');
});

test('whatever goes wrong while the queue is told, the sale still goes through', async () => {
  const { productId } = await h.newDesign();
  const orderId = await pendingOrder(productId);
  const down = { ...h.fakes.deps.jobs!, enqueuePrintJob: async () => { throw new Error('the queue is down'); } };
  h.pipeline.overridePrintDeps({ ...h.fakes.deps, jobs: down });
  const spy = console.error;
  const reports: string[] = [];
  console.error = (...args: unknown[]) => void reports.push(args.map(String).join(' '));
  try {
    const paid = await orders.markPaid(`cs_${orderId}`, snapshot(orderId));
    assert.ok(paid.ok, JSON.stringify(paid));
    assert.equal(paid.ok && paid.value.status, 'paid');
  } finally {
    console.error = spy;
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
  assert.ok(reports.some((r) => r.includes('the queue is down')), 'the failure is reported, not hidden');
  const [row] = await h.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  assert.equal(row.status, 'paid');
  assert.equal(row.productionStatus, 'queued');
  assert.equal((await h.db.select().from(schema.payoutLedger).where(eq(schema.payoutLedger.orderId, orderId))).length, 1);
});

test('an order whose payment has not gone through is not told to pre-press', async () => {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const dtg = (await h.packs(designVersionId)).find((p) => p.technique === 'dtg_dtf')!;
  const orderId = await pendingOrder(productId);

  const early = await orders.markPaid(`cs_${orderId}`, snapshot(orderId, { paymentStatus: 'unpaid' }));
  assert.deepEqual(early, { ok: false, error: 'This payment has not gone through yet.' });
  const [row] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, dtg.id));
  assert.equal(row.auditStatus, 'idle');
  assert.deepEqual(row.neededFor, []);

  // Paid later (a delayed method): then it is.
  assert.ok((await orders.markPaid(`cs_${orderId}`, snapshot(orderId))).ok);
  assert.equal((await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, dtg.id)))[0].auditStatus, 'waiting');
});
