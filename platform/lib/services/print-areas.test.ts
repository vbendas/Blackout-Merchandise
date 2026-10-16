// Print prep for products with several print areas (owner decision, 16 Oct 2026): each area's design gets packs for
// its position, a sleeve's proof is drawn flat (lib/mockups/sleeve-proof.ts) or, while it can't be, the approval page
// shows a card with its size; publishing needs every area approved; orders, runs and job sheets follow every area.
// The real pipeline on PGlite with the fake engine, pack writers, storage and queue (lib/print/test-support.ts).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { GARMENTS, bootstrapPrint, seedDesign, seedShopOrder, type Harness } from '@/lib/print/test-support';
import type { PackNeed } from '@/lib/print/types';

let h: Harness;
let products: typeof import('@/lib/services/products');
let jobSheets: typeof import('@/lib/services/job-sheets');
let logic: typeof import('@/components/studio/approve/approve-logic');

const BLACK = GARMENTS.black.code;
const WHITE = GARMENTS.white.code;
const COLOURS = [BLACK, WHITE];

before(async () => {
  h = await bootstrapPrint();
  products = await import('@/lib/services/products');
  jobSheets = await import('@/lib/services/job-sheets');
  logic = await import('@/components/studio/approve/approve-logic');
  // Payouts are connected, so a publish asks about nothing but what these tests are about.
  await h.db.insert(schema.stripeAccounts).values({ storeId: h.artist.storeId, accountId: 'acct_test', chargesEnabled: true, payoutsEnabled: true });
});

after(async () => {
  await h.close();
});

async function newDesign(): Promise<string> {
  const id = await seedDesign(h.db, h.artist.storeId);
  h.fakes.registerDesign(id, Buffer.from(`artwork:${id}`));
  return id;
}

/** A draft tee with a price, printing `areas`, in black and white. */
async function product(areas: { position: string; widthCm: number; designId: string }[], opts: { name?: string; baseCostCents?: number; retailPriceCents?: number; status?: 'draft' | 'live' } = {}): Promise<string> {
  const [row] = await h.db
    .insert(schema.products)
    .values({
      storeId: h.artist.storeId,
      designId: areas[0].designId,
      blankCode: 'STTU169',
      printServiceCode: 'dtg',
      name: opts.name ?? 'Two-sided tee',
      placements: areas,
      baseCostCents: opts.baseCostCents ?? 1500,
      retailPriceCents: opts.retailPriceCents ?? 3500,
      status: opts.status ?? 'draft',
    })
    .returning({ id: schema.products.id });
  await h.db.insert(schema.productColours).values(COLOURS.map((colourCode) => ({ productId: row.id, colourCode, mockupUrl: 'https://img.test/mockup.webp' })));
  return row.id;
}

async function prepareProduct(productId: string): Promise<string[]> {
  const prepared = await h.printPrep.preparePrintForProduct({ storeId: h.artist.storeId, userId: h.artist.userId, productId });
  assert.ok(prepared.ok, prepared.ok ? '' : prepared.error);
  for (const job of prepared.value.prepared) if (job.jobId) await h.runJob(job.jobId);
  return prepared.value.prepared.map((p) => p.designId);
}

async function approve(designId: string): Promise<void> {
  const version = await h.printPrep.latestVersion(designId);
  assert.ok(version, 'prepared first');
  const result = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: version.id });
  assert.ok(result.ok, result.ok ? '' : result.error);
}

async function packsOf(designId: string) {
  const version = await h.printPrep.latestVersion(designId);
  return version ? h.pipeline.loadCurrentPacks(version.id) : [];
}

const where = (pack: { placement: unknown; technique: string }) => `${pack.technique}:${(pack.placement as { position: string }).position}`;

// -- packs per area -----------------------------------------------------------------------------

test('each area\'s design gets packs for its position: one job per design, a sleeve with its flat proof and no garment photo', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  h.fakes.sleeveProofs.length = 0;
  const front = await newDesign();
  const back = await newDesign();
  const id = await product([
    { position: 'front_chest', widthCm: 28, designId: front },
    { position: 'back', widthCm: 32, designId: back },
    { position: 'sleeve_left', widthCm: 8, designId: front },
  ]);

  const prepared = await h.printPrep.preparePrintForProduct({ storeId: h.artist.storeId, userId: h.artist.userId, productId: id });
  assert.ok(prepared.ok, prepared.ok ? '' : prepared.error);
  assert.deepEqual(
    prepared.value.prepared.map((p) => [p.designId, p.positions]),
    [
      [front, ['front_chest', 'sleeve_left']],
      [back, ['back']],
    ],
  );
  for (const job of prepared.value.prepared) if (job.jobId) await h.runJob(job.jobId);

  const frontPacks = await packsOf(front);
  assert.deepEqual([...new Set(frontPacks.map(where))].sort(), ['dtg_dtf:front_chest', 'dtg_dtf:sleeve_left', 'screen:front_chest', 'screen:sleeve_left']);
  const backPacks = await packsOf(back);
  assert.deepEqual([...new Set(backPacks.map(where))].sort(), ['dtg_dtf:back', 'screen:back']);

  // The sleeve: no garment photo was asked for, its proofs are the flat ones, and no check asks about photos.
  const sleeve = frontPacks.find((p) => where(p) === 'dtg_dtf:sleeve_left')!;
  const proofs = h.pipeline.packFiles(sleeve).filter((f) => f.kind === 'proof');
  assert.deepEqual(proofs.map((f) => f.name).sort(), ['proof-dtg-C001.png', 'proof-dtg-C002.png']);
  assert.ok(proofs.every((f) => f.visibility === 'public' && f.contentType === 'image/png'));
  assert.ok(h.pipeline.packFiles(sleeve).some((f) => f.kind === 'loupe'), 'a loupe needs no photo');
  assert.ok(!h.pipeline.packChecks(sleeve).some((c) => c.id === 'garment_photos' || c.id === 'sleeve_proof'));
  const asked = h.fakes.sleeveProofs.filter((p) => p.side === 'left');
  assert.equal(asked.length, 2 + 2, 'a DTG/DTF proof and a screen proof on each of the two colours');
  for (const input of asked) {
    assert.deepEqual([input.sleeve, input.printWidthCm, input.printHeightCm], ['short', 8, 9.6], 'true size: 8 cm wide, the art 1000 x 1200');
    assert.ok(Buffer.isBuffer(input.print) && input.print.length > 0);
  }
  assert.ok(asked.some((p) => p.garmentHex === GARMENTS.black.hex) && asked.some((p) => p.garmentHex === GARMENTS.white.hex));
  assert.ok(!h.fakes.engine.proofRequests.some((r) => r.widthMm === 80 && r.printBox.w === 0.4), 'the sleeve was never drawn in a garment photo\'s box');
});

// -- the approval page --------------------------------------------------------------------------

test('the approval page shows every area: the photo proofs, and a sleeve\'s flat proof; the other artwork on the products is linked', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  const front = await newDesign();
  const back = await newDesign();
  await product([
    { position: 'front_chest', widthCm: 28, designId: front },
    { position: 'back', widthCm: 32, designId: back },
    { position: 'sleeve_right', widthCm: 8, designId: front },
  ]);
  await prepareProduct((await h.db.select().from(schema.products).where(eq(schema.products.designId, front)))[0].id);

  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId: front }))!;
  assert.equal(view.status, 'ready');
  assert.deepEqual(
    view.areas?.map((a) => [a.position, a.label, a.size, a.sleeve]),
    [
      ['front_chest', 'Front chest', '28 × 33.6 cm', false],
      ['sleeve_right', 'Right sleeve', '8 × 9.6 cm', true],
    ],
  );
  assert.equal(view.placementLabel, 'Front chest · 28 × 33.6 cm + Right sleeve · 8 × 9.6 cm');
  const sleeveKey = view.areas![1].key;
  const sleeveProofs = view.proofs.filter((p) => p.areaKey === sleeveKey);
  assert.deepEqual(sleeveProofs.map((p) => `${p.technique}:${p.garmentCode}`).sort(), ['dtg_dtf:C001', 'dtg_dtf:C002', 'screen:C001', 'screen:C002']);
  assert.ok(sleeveProofs.every((p) => p.flat === true && /right sleeve of the .+, drawn flat at true size$/.test(p.alt)));
  assert.ok(view.proofs.filter((p) => p.areaKey === view.areas![0].key).every((p) => !p.flat));
  assert.equal(view.canApprove, true);
  assert.deepEqual(view.relatedDesigns, [{ designId: back, designName: 'Two-sided tee', areas: ['Back'], approved: false }]);

  // What the page picks for the chosen area and colour.
  const black = view.garments.find((g) => g.code === BLACK)!;
  assert.equal(logic.pickProof(view.proofs, 'dtg_dtf', black.code, sleeveKey)?.flat, true);
  assert.equal(logic.pickProof(view.proofs, 'dtg_dtf', black.code, view.areas![0].key)?.flat, undefined);
  assert.equal(logic.pickArea(view.areas!, null)?.position, 'front_chest', 'the front first');
  assert.equal(logic.placementSummary(view), 'Front chest + Right sleeve');
  assert.match(logic.approvalScope(view.garments, view.areas), /It covers every print area: front chest and right sleeve\.$/);
});

test('while a sleeve proof can\'t be drawn, the page shows a card with its size, approval still works, and pre-press is told why', async () => {
  h.fakes.sleeveProof.mode = 'stub';
  const design = await newDesign();
  const id = await product([{ position: 'sleeve_left', widthCm: 9, designId: design }], { name: 'Sleeve logo tee' });
  await prepareProduct(id);

  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId: design }))!;
  assert.deepEqual(view.areas?.map((a) => [a.label, a.size, a.sleeve]), [['Left sleeve', '9 × 10.8 cm', true]]);
  assert.equal(view.proofs.length, 0, 'no proof could be drawn');
  assert.equal(view.canApprove, true, 'nothing breaks: the size stands in for the proof');
  assert.deepEqual(logic.sleevePlaceholder(view.areas![0]), {
    title: 'Sleeve proof coming',
    size: 'Left sleeve · 9 × 10.8 cm',
    note: 'A sleeve has no garment photo: its proof is drawn flat at true size on a sleeve outline, with its measurements. Its print files are ready.',
  });

  // pre-press sees why there is no proof, without anything being blocked
  for (const pack of await packsOf(design)) {
    const check = h.pipeline.packChecks(pack).find((c) => c.id === 'sleeve_proof');
    assert.equal(check?.state, 'review', h.pipeline.packPlacement(pack).position);
    const colours = (pack.garmentCodes as string[]).map((code) => (code === BLACK ? 'Black' : 'White')).join(', ');
    assert.equal(check?.detail, `No sleeve proof on ${colours}: not implemented: PL-C renderSleeveProof. The artist sees the print's size instead of the proof.`);
  }

  await approve(design);
  const approved = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId: design }))!;
  assert.equal(approved.status, 'approved');
});

test('a worker with no font says so: the sleeve proof check names the missing font and how to fix it, and the error is logged', async () => {
  h.fakes.sleeveProof.mode = 'no_font';
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void errors.push(args.map(String).join(' '));
  try {
    const design = await newDesign();
    const id = await product([{ position: 'sleeve_right', widthCm: 8, designId: design }], { name: 'Right sleeve tee' });
    await prepareProduct(id);
    for (const pack of await packsOf(design)) {
      const check = h.pipeline.packChecks(pack).find((c) => c.id === 'sleeve_proof');
      assert.equal(check?.state, 'review');
      assert.match(check?.detail ?? '', /^No sleeve proof on .+: the worker has no font to label it \(The renderer has no font to write the measurements with\.\)\. Install fontconfig and DejaVu in the worker image, then run the pack again\./);
    }
  } finally {
    console.error = original;
    h.fakes.sleeveProof.mode = 'draw';
  }
  assert.ok(errors.some((line) => /no font for its labels/.test(line)), 'the missing font is logged, not swallowed');
});

// -- publishing -----------------------------------------------------------------------------------

test('publishing needs every area approved: each against its own design, and the sentence names the area that waits', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  const front = await newDesign();
  const back = await newDesign();
  const id = await product([
    { position: 'front_chest', widthCm: 28, designId: front },
    { position: 'back', widthCm: 32, designId: back },
  ]);
  const publish = () => products.publishProduct(h.artist.storeId, id);
  const statusOf = async () => (await h.db.select().from(schema.products).where(eq(schema.products.id, id)))[0].status;

  // The front's files only, and approved: the back still waits.
  const queued = await h.printPrep.preparePrint({ ...h.drop(front), garmentCodes: COLOURS, placements: [{ position: 'front_chest', widthMm: 280 }] });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);
  await approve(front);

  const backMissing = await publish();
  assert.equal(backMissing.ok, false);
  if (backMissing.ok) return;
  assert.equal(backMissing.error, "The print files don't cover the back print of the Two-sided tee yet. Prepare them and approve the artwork first.");
  assert.equal(backMissing.approval?.designId, back);
  assert.deepEqual(backMissing.approval?.prepare, { productId: id, designId: back, blankCode: 'STTU169', colourCodes: COLOURS, position: 'back', widthCm: 32 });
  assert.deepEqual(
    backMissing.approval?.areas.map((a) => [a.label, a.covered, a.reason]),
    [
      ['Front chest', true, null],
      ['Back', false, 'not_prepared'],
    ],
  );

  // The back's files, not approved yet.
  await prepareProduct(id);
  const backUnapproved = await publish();
  assert.equal(backUnapproved.ok, false);
  if (!backUnapproved.ok) assert.equal(backUnapproved.error, 'Approve the artwork for the back print of the Two-sided tee first.');
  assert.equal(await statusOf(), 'draft');

  await approve(back);
  const live = await publish();
  assert.ok(live.ok, live.ok ? '' : live.error);
  assert.equal(await statusOf(), 'live');

  // On a live product, a new area needs its approval before the change is made.
  const sleeve = await products.editProductAreas(h.artist.storeId, id, { add: [{ position: 'sleeve_left', widthCm: 8 }] });
  assert.equal(sleeve.ok, false);
  if (!sleeve.ok) assert.match(sleeve.error, /left sleeve print of the Two-sided tee/);
  const [row] = await h.db.select().from(schema.products).where(eq(schema.products.id, id));
  assert.equal((row.placements as unknown[]).length, 2, 'the live product is as it was');
});

test('a draft goes live at today\'s base cost: re-priced at publish, and refused when its price no longer clears it', async () => {
  // A shop price for the tee: today's one-print DTG base cost (podPrice's placeholder until the owner sets one).
  await h.db.insert(schema.baseCosts).values({ blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 });
  const { podPrice } = await import('@/lib/pricing/pod');
  const today = (await podPrice('STTU169', [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 32 }]))!;
  assert.ok(today.totalCents > 1000);

  h.fakes.sleeveProof.mode = 'draw';
  const front = await newDesign();
  const back = await newDesign();
  // made when the base cost was 10.00, priced at 12.00
  const id = await product(
    [
      { position: 'front_chest', widthCm: 28, designId: front },
      { position: 'back', widthCm: 32, designId: back },
    ],
    { name: 'Old price tee', baseCostCents: 1000, retailPriceCents: 1200 },
  );
  await prepareProduct(id);
  await approve(front);
  await approve(back);

  const refused = await products.publishProduct(h.artist.storeId, id);
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  assert.match(refused.error, /^The base cost is now €\d+\.\d\d \(Garment with one print .+ · Front and back \+€1\.00 · Base .+\), above what your price of €12\.00 allows\. Set a price of at least €\d+\.\d\d before publishing\.$/);
  assert.equal(refused.priceNeeded?.baseCostCents, today.totalCents);
  assert.equal(refused.priceNeeded?.minRetailCents, today.totalCents + 100);

  const priced = await products.setPrice(h.artist.storeId, id, today.totalCents + 500);
  assert.ok(priced.ok, priced.ok ? '' : priced.error);
  const live = await products.publishProduct(h.artist.storeId, id);
  assert.ok(live.ok, live.ok ? '' : live.error);
  assert.equal(live.value.baseCostCents, today.totalCents, 'the fee and the payout work from the base cost it went live at');
  assert.deepEqual(live.value.baseCostLines.map((l) => l.key), ['base', 'second_main_print']);
  await h.db.delete(schema.baseCosts).where(eq(schema.baseCosts.blankCode, 'STTU169'));
});

// -- orders, runs and the job sheet ---------------------------------------------------------------

test('a sale needs the files of every area, each from its own design; a run of the product too; the job sheet lists each area once', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  const front = await newDesign();
  const back = await newDesign();
  const id = await product(
    [
      { position: 'front_chest', widthCm: 28, designId: front },
      { position: 'back', widthCm: 32, designId: back },
      { position: 'sleeve_left', widthCm: 8, designId: front },
    ],
    { name: 'Order tee', status: 'live' },
  );
  await prepareProduct(id);

  const orderId = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId: id, colourCode: BLACK, qty: 2 });
  await h.prepress.markPacksNeededForOrder(orderId);
  const needs = (packs: Awaited<ReturnType<typeof packsOf>>) =>
    packs.filter((p) => (p.neededFor as PackNeed[]).some((n) => n.kind === 'shop_order' && n.orderId === orderId)).map(where).sort();
  assert.deepEqual(needs(await packsOf(front)), ['dtg_dtf:front_chest', 'dtg_dtf:sleeve_left']);
  assert.deepEqual(needs(await packsOf(back)), ['dtg_dtf:back']);

  // A run made from the product: its line carries the other areas with their designs, and pre-press follows them.
  const [runOrder] = await h.db.insert(schema.orders).values({ storeId: h.artist.storeId, orderType: 'bulk', status: 'paid', totalAmount: 90000, productionStatus: 'queued' }).returning();
  await h.db.insert(schema.orderItems).values({ orderId: runOrder.id, productId: id, quantity: 30, priceAtPurchase: 900, colourCode: WHITE, size: 'M' });
  await h.db.insert(schema.bulkOrders).values({
    storeId: h.artist.storeId,
    status: 'in_production',
    orderId: runOrder.id,
    quote: {
      lines: [
        {
          productId: id,
          designId: front,
          blankCode: 'STTU169',
          printServiceCode: 'dtg',
          placement: { position: 'front_chest', widthCm: 28 },
          extraPlacements: [
            { position: 'back', widthCm: 32, designId: back },
            { position: 'sleeve_left', widthCm: 8, designId: front },
          ],
          colourCode: WHITE,
          qty: 30,
        },
      ],
      totalCents: 90000,
      currency: 'EUR',
    },
  });
  await h.prepress.markPacksNeededForOrder(runOrder.id);
  const runNeeds = (packs: Awaited<ReturnType<typeof packsOf>>) =>
    packs.filter((p) => (p.neededFor as PackNeed[]).some((n) => n.kind === 'run' && n.orderId === runOrder.id)).map(where).sort();
  assert.deepEqual(runNeeds(await packsOf(front)), ['dtg_dtf:front_chest', 'dtg_dtf:sleeve_left']);
  assert.deepEqual(runNeeds(await packsOf(back)), ['dtg_dtf:back']);

  // Each design's sheet lists the areas it prints on the product, and only those.
  const sheet = async (designId: string) => (await jobSheets.collectJobSheet(designId))!.source.garments.map((g) => `${g.placement.split(' · ')[0]}:${g.colourName}`).sort();
  assert.deepEqual(await sheet(back), ['Back:Black', 'Back:White']);
  assert.deepEqual(await sheet(front), ['Front chest:Black', 'Front chest:White', 'Left sleeve:Black', 'Left sleeve:White']);

  // An order's job sheet links name both designs.
  const links = (await jobSheets.designsForOrders([orderId])).get(orderId) ?? [];
  assert.deepEqual(links.map((l) => l.designId).sort(), [front, back].sort());
});

test('a screen-printed run of the product counts each position\'s screens from the design printed there', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  const front = await newDesign();
  const back = await newDesign();
  const id = await product(
    [
      { position: 'front_chest', widthCm: 28, designId: front },
      { position: 'back', widthCm: 32, designId: back },
    ],
    { name: 'Run tee' },
  );
  await prepareProduct(id);

  // What a run needs beyond the harness: the blank's methods, sizes, its cost and a shipping zone.
  await h.db.insert(schema.blankPrintServices).values([{ blankCode: 'STTU169', printServiceCode: 'dtg' }, { blankCode: 'STTU169', printServiceCode: 'screen_2c' }]).onConflictDoNothing();
  await h.db.insert(schema.blankSizes).values({ blankCode: 'STTU169', size: 'M' }).onConflictDoNothing();
  await h.db.insert(schema.productSizes).values({ productId: id, size: 'M' });
  await h.db.insert(schema.baseCosts).values({ blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 });
  await h.db.insert(schema.shippingZones).values({ name: 'Spain', countries: ['ES'], flatCents: 450 });
  const bulk = await import('@/lib/services/bulk');
  try {
    const run = await bulk.createBulkQuote({
      storeId: h.artist.storeId,
      shipTo: { name: 'Ana', line1: 'Carrer 1', city: 'Barcelona', postcode: '08001', country: 'ES' },
      lines: [{ productId: id, printServiceCode: 'screen_2c', colourCode: BLACK, sizes: { M: 40 } }],
    });
    assert.ok(run.ok, run.ok ? '' : run.error);
    const line = run.value.lines[0];
    assert.deepEqual(line.extraPlacements, [{ position: 'back', widthCm: 32, designId: back }]);
    // both positions read their own design's screen files: none is a guess
    assert.deepEqual(line.screens?.placements.map((p) => [p.position, p.basis]), [
      ['front_chest', 'pack'],
      ['back', 'pack'],
    ]);
    const backPack = (await packsOf(back)).find((p) => p.technique === 'screen' && (p.garmentCodes as string[]).includes(BLACK));
    assert.equal(line.screens?.placements[1].setId, backPack?.id);
  } finally {
    await h.db.delete(schema.baseCosts).where(eq(schema.baseCosts.blankCode, 'STTU169'));
  }
});

test('preparing a product makes only what is missing: files already made are not built again or replaced', async () => {
  const design = await newDesign();
  const prepare = async (productId: string) => {
    const result = await h.printPrep.preparePrintForProduct({ storeId: h.artist.storeId, userId: h.artist.userId, productId });
    assert.ok(result.ok, result.ok ? '' : result.error);
    return result.value.prepared;
  };

  // A first product in black and white: one job for both.
  const first = await product([{ position: 'front_chest', widthCm: 28, designId: design }], { name: 'First tee' });
  const [made] = await prepare(first);
  assert.ok(made.jobId, 'a job was started');
  await h.runJob(made.jobId);
  const before = (await packsOf(design)).map((p) => p.id).sort();
  assert.ok(before.length > 0);

  // Asked again: everything is there, so nothing starts.
  const [again] = await prepare(first);
  assert.equal(again.jobId, null);
  assert.equal(again.alreadyPrepared, true);
  assert.equal(again.designVersionId, made.designVersionId);

  // A second product of the design that adds French Navy: one job, for French Navy only.
  const navy = await product([{ position: 'front_chest', widthCm: 28, designId: design }], { name: 'Navy tee' });
  await h.db.insert(schema.productColours).values({ productId: navy, colourCode: GARMENTS.navy.code, mockupUrl: 'https://img.test/mockup.webp' });
  const [added] = await prepare(navy);
  assert.ok(added.jobId);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, added.jobId));
  assert.deepEqual((job.input as { garmentCodes: string[] }).garmentCodes, [GARMENTS.navy.code]);
  await h.runJob(added.jobId);
  const after = (await packsOf(design)).map((p) => p.id);
  for (const id of before) assert.ok(after.includes(id), 'the black and white files are still the current ones');
  assert.ok(after.length > before.length, 'and French Navy has its own');

  // A back added to the first product: only the back is made, in the product's colours.
  await h.db.update(schema.products).set({ placements: [{ position: 'front_chest', widthCm: 28, designId: design }, { position: 'back', widthCm: 30, designId: design }] }).where(eq(schema.products.id, first));
  const [back] = await prepare(first);
  assert.ok(back.jobId);
  assert.deepEqual(back.positions, ['front_chest', 'back']);
  const [backJob] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, back.jobId));
  const input = backJob.input as { garmentCodes: string[]; placements: { position: string }[] };
  assert.deepEqual(input.placements.map((p) => p.position), ['back']);
  assert.deepEqual([...input.garmentCodes].sort(), [...COLOURS].sort());
});

test('the prepare details the assistant is given go straight into prepare_print, a moved print included', async () => {
  const { preparePrintTool } = await import('@/lib/tools/print');
  const { randomUUID } = await import('node:crypto');
  const design = await newDesign();
  const id = await product([{ position: 'front_chest', widthCm: 28, designId: design }], { name: 'Moved tee' });
  await h.db.update(schema.products).set({ placements: [{ position: 'front_chest', widthCm: 28, offsetYcm: 3, designId: design }] }).where(eq(schema.products.id, id));
  const approval = await h.printPrep.productApproval(h.artist.storeId, id);
  assert.ok(approval?.prepare, 'there is something to prepare');
  assert.equal(approval.prepare.productId, id);
  assert.equal(approval.prepare.offsetYcm, 3);

  const ctx = { userId: h.artist.userId, clerkId: 'clerk-artist', role: 'artist' as const, storeId: h.artist.storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
  const viaProduct = await preparePrintTool.run(ctx, approval.prepare);
  assert.equal(viaProduct.data.ok, true, viaProduct.data.error);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, viaProduct.data.jobId!));
  assert.deepEqual((job.input as { placements: unknown[] }).placements, [{ position: 'front_chest', widthMm: 280, offsetYMm: 30 }]);

  // without a product, the offset is taken as given
  const { designId, blankCode, colourCodes, position, widthCm, offsetYcm } = approval.prepare;
  const designPath = { designId, blankCode, colourCodes, position, widthCm, offsetYcm };
  const viaDesign = await preparePrintTool.run({ ...ctx, conversationId: randomUUID() }, designPath);
  assert.equal(viaDesign.data.ok, true, viaDesign.data.error);
  assert.equal(viaDesign.data.jobId, viaProduct.data.jobId, 'the same files: the job is reused');
});

test('prepare_print with a product prepares every area at once, one approval page per design', async () => {
  h.fakes.sleeveProof.mode = 'draw';
  const { preparePrintTool } = await import('@/lib/tools/print');
  const { randomUUID } = await import('node:crypto');
  const front = await newDesign();
  const back = await newDesign();
  const id = await product([
    { position: 'front_chest', widthCm: 28, designId: front },
    { position: 'back', widthCm: 32, designId: back },
  ]);
  const ctx = { userId: h.artist.userId, clerkId: 'clerk-artist', role: 'artist' as const, storeId: h.artist.storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
  const result = await preparePrintTool.run(ctx, { productId: id });
  assert.equal(result.data.ok, true, result.data.error);
  assert.deepEqual(result.data.designs?.map((d) => [d.designId, d.positions, d.approvalPage]), [
    [front, ['front_chest'], `/studio/approve/${front}`],
    [back, ['back'], `/studio/approve/${back}`],
  ]);
  assert.equal(result.ui?.cards?.length, 2, 'a proof card for each design');
  const missing = await preparePrintTool.run({ ...ctx, conversationId: randomUUID() }, {});
  assert.deepEqual(missing.data, { ok: false, error: 'Say which product to prepare, or the design, the blank and the colours.' });
});
