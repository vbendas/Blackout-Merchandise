// Runs on PGlite: a run chooses its own print method when it is quoted, screen print or digital, so a
// run of a DTG shop product can be screen printed, and a paid run tells
// print prep which packs it needs. Digital is the garment's call (DTG, or DTF where DTG isn't ideal), never
// the artist's. Payment, e-mail and print prep are stubbed (runHooks); the catalogue comes from
// lib/services/test-catalogue.ts.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';

process.env.FAL_API_KEY = '';

let t: TestDb;
let bulk: typeof import('@/lib/services/bulk');
let quotes: typeof import('@/lib/services/quotes');
let products: typeof import('@/lib/services/products');
let cat: typeof TEST_CATALOGUE;
let storeId: string;
let userId: string;
let dtgProductId: string;

const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

const hookCalls: { packsFor: string[]; sawOrderLinked: boolean[] } = { packsFor: [], sawOrderLinked: [] };
let packsHook: (orderId: string) => Promise<void>;

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  bulk = await import('@/lib/services/bulk');
  quotes = await import('@/lib/services/quotes');
  products = await import('@/lib/services/products');
  const user = await seedUser(t.db, { email: 'artist@merchfrom.test', withStore: true });
  storeId = user.storeId!;
  userId = user.userId;

  // The shop sells this tee as DTG. Runs of it are quoted below.
  const product = await products.createProduct({
    storeId,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [cat.black, cat.white],
    sizes: ['S', 'M', 'L'],
    name: 'Tour tee',
  });
  assert.ok(product.ok, product.ok ? '' : product.error);
  dtgProductId = product.value.id;

  packsHook = async (orderId) => {
    hookCalls.packsFor.push(orderId);
    const [linked] = await t.db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.orderId, orderId));
    hookCalls.sawOrderLinked.push(!!linked);
  };
  bulk.runHooks.markPacksNeededForOrder = (orderId) => packsHook(orderId);
  bulk.runHooks.notify = async () => {};
});

after(async () => {
  await t.close();
});

async function unitCents(printServiceCode: string, qty: number): Promise<number> {
  const quote = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode, qty });
  assert.ok(quote);
  return quote.unitBaseCostCents;
}

test('a run of a DTG shop product can be screen printed', async () => {
  const quoted = await bulk.createBulkQuote({
    storeId,
    lines: [{ productId: dtgProductId, printServiceCode: 'screen_2c', colourCode: cat.black, sizes: { S: 10, M: 20 } }],
    shipTo,
  });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  const [line] = quoted.value.lines;
  assert.equal(line.printServiceCode, 'screen_2c', 'the run chose it; the product did not');
  assert.equal(line.printServiceName, 'Screen print (2 colours)');
  assert.equal(line.productId, dtgProductId);
  assert.equal(line.qty, 30);
  // Priced from the screen-print table by the screens: the tee has no print files yet, so 2 colours and the white
  // underbase and highlight white on black make a guess of 4 screens. The default table continues the old seed
  // (1 screen 3.50, then 1.70 more for each), 8% off at 25 pieces, and 30% margin on the blank and the print.
  assert.equal(line.screens?.basis, 'estimate');
  assert.equal(line.screens?.count, 4);
  const garment = 650;
  const print = Math.round((350 + 170 * 3) * 0.92);
  assert.equal(line.unitCents, garment + print + Math.round(0.3 * (garment + print)));
  assert.notEqual(line.unitCents, await unitCents('dtg', 30));
  assert.equal(line.totalCents, line.unitCents * 30);

  // and the shop product itself still prints DTG
  const product = await products.getProduct(storeId, dtgProductId);
  assert.equal(product?.printServiceCode, 'dtg');
});

test("a run chooses screen print or digital, and digital is the garment's method: a dtf or dtg that disagrees is corrected", async () => {
  // the tee prints DTG: 'digital', 'dtg' and a 'dtf' that says otherwise all give DTG, the last with a note
  for (const [code, note] of [['digital', undefined], ['dtg', undefined], ['dtf', 'Printed DTG on this garment.']] as const) {
    const quoted = await bulk.createBulkQuote({ storeId, lines: [{ productId: dtgProductId, printServiceCode: code, colourCode: cat.white, sizes: { M: 5 } }], shipTo });
    assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
    assert.equal(quoted.value.lines[0].printServiceCode, 'dtg', code);
    assert.equal(quoted.value.lines[0].printServiceName, 'Direct-to-garment print');
    assert.equal(quoted.notes?.[0], note, code);
  }
});

test("left out, a run prints the way the product does", async () => {
  const quoted = await bulk.createBulkQuote({ storeId, lines: [{ productId: dtgProductId, colourCode: cat.black, sizes: { S: 3 } }], shipTo });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  assert.equal(quoted.value.lines[0].printServiceCode, 'dtg');
  assert.equal(quoted.value.lines[0].printServiceName, 'Direct-to-garment print');
});

test('different lines of one run can print differently', async () => {
  const quoted = await bulk.createBulkQuote({
    storeId,
    lines: [
      { productId: dtgProductId, printServiceCode: 'screen_1c', colourCode: cat.black, sizes: { M: 30 } },
      { productId: dtgProductId, printServiceCode: 'digital', colourCode: cat.white, sizes: { M: 4 } },
    ],
    shipTo,
  });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  assert.deepEqual(quoted.value.lines.map((l) => quoted.ok && l.printServiceCode), ['screen_1c', 'dtg']);
});

test("on a garment with no DTG a run's digital line is DTF, and a dtg asked for is corrected with the note, not refused", async () => {
  // shorts: screen print, DTF and embroidery, no DTG
  const shorts = await products.createProduct({
    storeId,
    blankCode: cat.shorts,
    placement: { position: 'front_leg', widthCm: 12 },
    colours: [cat.black],
    sizes: ['M'],
  });
  assert.ok(shorts.ok, shorts.ok ? '' : shorts.error);
  assert.equal(shorts.value.printServiceCode, 'dtf', 'the product took the garment\'s method');
  for (const code of ['digital', 'dtf', 'dtg']) {
    const quoted = await bulk.createBulkQuote({ storeId, lines: [{ productId: shorts.value.id, printServiceCode: code, colourCode: cat.black, sizes: { M: 5 } }], shipTo });
    assert.ok(quoted.ok, `${code}: ${quoted.ok ? '' : quoted.error}`);
    assert.equal(quoted.value.lines[0].printServiceCode, 'dtf', code);
    assert.equal(quoted.value.lines[0].printServiceName, 'Direct-to-film print');
    assert.equal(quoted.notes?.[0], code === 'dtg' ? "Printed DTF on this garment, since DTG isn't ideal for it." : undefined, code);
  }
  // new artwork on the blank does the same
  const bare = await bulk.createBulkQuote({ storeId, lines: [{ blankCode: cat.shorts, printServiceCode: 'digital', placement: { position: 'front_leg', widthCm: 12 }, colourCode: cat.black, sizes: { M: 5 } }], shipTo });
  assert.ok(bare.ok, bare.ok ? '' : bare.error);
  assert.equal(bare.value.lines[0].printServiceCode, 'dtf');
});

test('a method the blank does not offer is refused with the ones it does: screen print, digital, and what else it has', async () => {
  // the tee offers screen print and digital, no embroidery
  const refused = await bulk.createBulkQuote({ storeId, lines: [{ productId: dtgProductId, printServiceCode: 'embroidery', colourCode: cat.black, sizes: { M: 5 } }], shipTo });
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.match(refused.error, /"embroidery" isn't offered on/);
    const choices = refused.error.split('Choose one of:')[1] ?? '';
    assert.match(choices, /screen_1c \(Screen print \(1 colour\)\)/);
    assert.match(choices, /digital \(Direct-to-garment print\)/, 'digital is one choice, named by the garment\'s own method');
    assert.doesNotMatch(choices, /dtg \(|dtf \(/, 'DTG and DTF are not two choices for an artist');
  }
  // the shorts offer embroidery: it is listed, and digital there is DTF
  const shorts = await bulk.createBulkQuote({ storeId, lines: [{ blankCode: cat.shorts, printServiceCode: 'laser', placement: { position: 'front_leg', widthCm: 12 }, colourCode: cat.black, sizes: { M: 5 } }], shipTo });
  assert.equal(shorts.ok, false);
  if (!shorts.ok) {
    const choices = shorts.error.split('Choose one of:')[1] ?? '';
    assert.match(choices, /digital \(Direct-to-film print\)/);
    assert.match(choices, /embroidery \(Embroidery\)/);
  }
});

test('new artwork on a blank chooses its method and its position the same way', async () => {
  const line = { blankCode: cat.tee, printServiceCode: 'screen_1c', placement: { position: 'front_chest', widthCm: 28 }, colourCode: cat.black, sizes: { M: 30 } };
  const quoted = await bulk.createBulkQuote({ storeId, lines: [line], shipTo });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  assert.equal(quoted.value.lines[0].productId, null);
  assert.equal(quoted.value.lines[0].printServiceCode, 'screen_1c');

  // a bare 'sleeve' is no position: the error says which sleeve, as the tee has sleeves
  const sleeve = await bulk.createBulkQuote({ storeId, lines: [{ ...line, placement: { position: 'sleeve', widthCm: 8 } }], shipTo });
  assert.equal(sleeve.ok, false);
  if (!sleeve.ok) assert.match(sleeve.error, /"sleeve" is not a print position for T-shirts\. Say which sleeve: sleeve_left or sleeve_right\./);
  // the left sleeve of a tee is one
  const left = await bulk.createBulkQuote({ storeId, lines: [{ ...line, placement: { position: 'sleeve_left', widthCm: 8 } }], shipTo });
  assert.ok(left.ok, left.ok ? '' : left.error);

  const unknown = await bulk.createBulkQuote({ storeId, lines: [{ ...line, printServiceCode: 'screen_9c' }], shipTo });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.match(unknown.error, /"screen_9c" isn't offered on/);
});

test('the proof says which print method the artist is approving', async () => {
  const quoted = await bulk.createBulkQuote({
    storeId,
    lines: [
      { productId: dtgProductId, printServiceCode: 'screen_2c', colourCode: cat.black, sizes: { M: 30 } },
      { productId: dtgProductId, printServiceCode: 'digital', colourCode: cat.white, sizes: { M: 4 } },
    ],
    shipTo,
  });
  assert.ok(quoted.ok);
  const proof = await bulk.submitBulkProof(storeId, quoted.value.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  const row = proof.value.spec.find((s) => s.label === 'Print method');
  // A screen line says "Screen print": the number in its service name is only a first guess at the colours. A digital line says
  // the method the garment prints with, which is what the artist approves.
  assert.equal(row?.value, 'Screen print, Direct-to-garment print');
  assert.match(proof.value.spec.find((s) => /^Colours · .* · Black$/.test(s.label))?.value ?? '', /^Front chest · 4 colours \(estimate\): no surcharge$/);
});

// -- paying -------------------------------------------------------------------------------

function session(bulkOrderId: string, id: string, amountTotalCents: number) {
  return {
    id,
    amountTotalCents,
    amountSubtotalCents: null,
    taxCents: 0,
    shippingCents: 0,
    currency: 'eur',
    customerEmail: null,
    paymentIntentId: `pi_${id}`,
    metadata: { bulkOrderId },
    shippingDetails: null,
    paymentStatus: 'paid' as const,
  };
}

async function approvedRun() {
  const quoted = await bulk.createBulkQuote({
    storeId,
    lines: [
      // a DTG shop product, screen printed for this run
      { productId: dtgProductId, printServiceCode: 'screen_2c', colourCode: cat.black, sizes: { M: 30 } },
      // new artwork, screen printed: it has no product yet, so one is made at payment
      { blankCode: cat.tee, printServiceCode: 'screen_1c', placement: { position: 'front_chest', widthCm: 28 }, colourCode: cat.white, sizes: { S: 12, L: 12 } },
    ],
    shipTo,
  });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  const proof = await bulk.submitBulkProof(storeId, quoted.value.id);
  assert.ok(proof.ok);
  const approved = await bulk.approveBulkProof(storeId, proof.value.id, userId);
  assert.ok(approved.ok, approved.ok ? '' : approved.error);
  return quoted.value;
}

test('a paid screen-printed run gets its backing product, and print prep hears about the order', async () => {
  hookCalls.packsFor.length = 0;
  hookCalls.sawOrderLinked.length = 0;
  const run = await approvedRun();

  const paid = await bulk.markBulkPaid('cs_run_1', session(run.id, 'cs_run_1', run.totalCents));
  assert.ok(paid.ok, paid.ok ? '' : paid.error);
  assert.equal(paid.value.status, 'in_production');
  const orderId = paid.value.orderId!;

  const items = await t.db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  assert.equal(items.length, 3, 'one item per size with pieces');
  const productIds = [...new Set(items.map((i) => i.productId))];
  assert.equal(productIds.length, 2);
  assert.ok(productIds.includes(dtgProductId), 'the first line is the shop product');

  // the new artwork's backing product carries the screen method the run chose, and is not for sale
  const backingId = productIds.find((id) => id !== dtgProductId)!;
  const [backing] = await t.db.select().from(schema.products).where(eq(schema.products.id, backingId));
  assert.equal(backing.printServiceCode, 'screen_1c');
  assert.equal(backing.status, 'draft');
  assert.match(backing.name, /^Bulk run — /);
  const toShop = await products.transition(backingId, 'live');
  assert.equal(toShop.ok, false);

  // print prep is told once, after the order exists and the run points at it
  assert.deepEqual(hookCalls.packsFor, [orderId]);
  assert.deepEqual(hookCalls.sawOrderLinked, [true]);

  // and finds each line's method on the run, not on the shop product
  const runLines = await bulk.getRunLinesForOrder(orderId);
  assert.equal(runLines?.bulkOrderId, run.id);
  assert.deepEqual(runLines?.lines.map((l) => l.printServiceCode), ['screen_2c', 'screen_1c']);
  assert.deepEqual(runLines?.lines.map((l) => quotes.techniqueOfService(l.printServiceCode)), ['screen', 'screen']);
  assert.equal((await products.getProduct(storeId, dtgProductId))?.printServiceCode, 'dtg');
});

test('a run quoted before the sleeve refusal still pays: the position is checked at the quote, not at the till', async () => {
  const line = {
    productId: null,
    designId: null,
    blankCode: cat.tee,
    blankName: 'T-shirt',
    printServiceCode: 'screen_1c',
    printServiceName: 'Screen print (1 colour)',
    placement: { position: 'sleeve', widthCm: 8 },
    colourCode: cat.black,
    colourName: 'Black',
    sizes: { M: 10 },
    qty: 10,
    unitCents: 1000,
    totalCents: 10000,
    label: 'T-shirt · Black · 10 pcs',
    mockupUrl: null,
  };
  const quote = { lines: [line], setupCents: 0, shippingCents: 450, totalCents: 10450, currency: 'EUR', leadTime: '10 working days' };
  const [row] = await t.db.insert(schema.bulkOrders).values({ storeId, quote, status: 'awaiting_payment', shipTo }).returning();

  const paid = await bulk.markBulkPaid('cs_legacy', session(row.id, 'cs_legacy', 10450));
  assert.ok(paid.ok, paid.ok ? '' : paid.error);
  const items = await t.db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, paid.value.orderId!));
  assert.equal(items.length, 1);
  const [backing] = await t.db.select().from(schema.products).where(eq(schema.products.id, items[0].productId));
  assert.equal(backing.printServiceCode, 'screen_1c');
});

test('paying twice does not tell print prep twice', async () => {
  hookCalls.packsFor.length = 0;
  const run = await approvedRun();
  const first = await bulk.markBulkPaid('cs_run_2', session(run.id, 'cs_run_2', run.totalCents));
  const second = await bulk.markBulkPaid('cs_run_2', session(run.id, 'cs_run_2', run.totalCents));
  assert.ok(first.ok && second.ok);
  assert.equal(second.value.orderId, first.value.orderId);
  assert.equal(hookCalls.packsFor.length, 1);
});

test('print prep failing never undoes the sale', async () => {
  const run = await approvedRun();
  const original = packsHook;
  packsHook = async () => {
    throw new Error('queue unavailable');
  };
  const errors: unknown[][] = [];
  const log = console.error;
  console.error = (...args: unknown[]) => void errors.push(args);
  try {
    const paid = await bulk.markBulkPaid('cs_run_3', session(run.id, 'cs_run_3', run.totalCents));
    assert.ok(paid.ok, paid.ok ? '' : paid.error);
    assert.equal(paid.value.status, 'in_production');
    assert.ok(paid.value.orderId);
  } finally {
    console.error = log;
    packsHook = original;
  }
  assert.ok(errors.some((e) => String(e[0]).includes('markPacksNeededForOrder failed')));
});

test('an order that is not a run has no run lines', async () => {
  assert.equal(await bulk.getRunLinesForOrder('00000000-0000-4000-8000-000000000000'), null);
});

test('techniqueOfService names the technique print prep works by', () => {
  assert.equal(quotes.techniqueOfService('screen_1c'), 'screen');
  assert.equal(quotes.techniqueOfService('screen_3c'), 'screen');
  assert.equal(quotes.techniqueOfService('dtg'), 'dtg_dtf');
  assert.equal(quotes.techniqueOfService('dtf'), 'dtg_dtf');
  assert.equal(quotes.techniqueOfService('embroidery'), null);
});

test("a run only prints its own shop's art: another shop's design is refused on any line", async () => {
  const other = await seedUser(t.db, { email: 'other-shop@merchfrom.test', withStore: true });
  const [theirs] = await t.db.insert(schema.designs).values({ storeId: other.storeId!, source: 'upload' }).returning();

  // The shop's product has no design of its own, so the line's design would be the one printed.
  const bare = await products.createProduct({
    storeId,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [cat.black],
    sizes: ['M'],
    name: 'Bare tee',
  });
  assert.ok(bare.ok, bare.ok ? '' : bare.error);
  const viaProduct = await bulk.createBulkQuote({ storeId, lines: [{ productId: bare.value.id, designId: theirs.id, colourCode: cat.black, sizes: { M: 30 } }], shipTo });
  assert.deepEqual(viaProduct, { ok: false, error: 'Design not found for this shop.' });

  const viaBlank = await bulk.createBulkQuote({
    storeId,
    lines: [{ blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, designId: theirs.id, colourCode: cat.black, sizes: { M: 30 } }],
    shipTo,
  });
  assert.deepEqual(viaBlank, { ok: false, error: 'Design not found for this shop.' });
});

// A shop product has no proof of its own any more (its design's approval replaces it, products.ts
// checkPublishable); a run keeps the proof it always had, and nothing else stands in for it.
test('a run still needs its own proof: it cannot be paid until the proof is sent and approved', async () => {
  const quoted = await bulk.createBulkQuote({
    storeId,
    lines: [{ productId: dtgProductId, printServiceCode: 'screen_2c', colourCode: cat.black, sizes: { M: 30 } }],
    shipTo,
  });
  assert.ok(quoted.ok, quoted.ok ? '' : quoted.error);
  const run = quoted.value;
  const pay = (id: string) => bulk.markBulkPaid(id, session(run.id, id, run.totalCents));
  const statusNow = async () => (await t.db.select().from(schema.bulkOrders).where(eq(schema.bulkOrders.id, run.id)))[0].status;
  const refusedAs = (result: Awaited<ReturnType<typeof pay>>, status: string) =>
    assert.ok(!result.ok && result.error === `Bulk order must be awaiting payment to be marked paid (this one is "${status}").`, JSON.stringify(result));

  // Quoted, no proof yet: no payment, whatever the shop product's artwork says.
  refusedAs(await pay('cs_noproof_1'), 'quoted');
  assert.equal(await statusNow(), 'quoted');

  // The proof is sent: it waits for the artist's OK and still cannot be paid.
  const proof = await bulk.submitBulkProof(storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  assert.equal(await statusNow(), 'proof_pending');
  refusedAs(await pay('cs_noproof_2'), 'proof_pending');

  // Sent back for changes: back to the quote, and still not payable.
  const changes = await bulk.requestBulkChanges(storeId, proof.value.id, 'Make the logo bigger.');
  assert.ok(changes.ok, changes.ok ? '' : changes.error);
  assert.equal(await statusNow(), 'quoted');
  refusedAs(await pay('cs_noproof_3'), 'quoted');

  // A proof can only be approved once it is sent, and approving it is what opens payment.
  const second = await bulk.submitBulkProof(storeId, run.id);
  assert.ok(second.ok, second.ok ? '' : second.error);
  const approved = await bulk.approveBulkProof(storeId, second.value.id, userId);
  assert.ok(approved.ok, approved.ok ? '' : approved.error);
  assert.equal(await statusNow(), 'awaiting_payment');
  const paid = await pay('cs_noproof_4');
  assert.ok(paid.ok, paid.ok ? '' : paid.error);
  assert.equal(paid.value.status, 'in_production');
});
