// A screen-printed run is priced by the screens its design really uses (Print-Prep-Plan section 10):
// the count comes from the design's print files for that garment colour, the white underbase and the
// highlight white included; with no files yet the quote is an estimate and says why; the fixed
// surcharge applies from the 9th screen to the 15th, and 16 is refused; the run is priced again when
// the proof is sent, and an approval is refused if the screens changed since. The price table is
// edited by staff with Manage access to Catalogue and pricing. Fake engine, pack writers, storage and
// queue on PGlite (lib/print/test-support.ts): nothing here touches Neon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { GARMENTS, bootstrapPrint, seedRun, type Harness } from '@/lib/print/test-support';
import type { ScreenPriceTable } from '@/lib/pricing/screen-print';
import type { ToolContext } from '@/lib/tools/types';

let h: Harness;
let bulk: typeof import('@/lib/services/bulk');
let quotes: typeof import('@/lib/services/quotes');
let pricing: typeof import('@/lib/services/pricing-admin');
let tools: typeof import('@/lib/tools/bulk');
let ctx: ToolContext;

const { black, navy, white } = GARMENTS;
const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

/** A table that is easy to read: no margin, so a piece is the blank, the print and the fixed charge. */
const TABLE: ScreenPriceTable = {
  breaks: [1, 25, 100],
  tiers: [
    { fromScreens: 1, printCents: [400, 300, 200] },
    { fromScreens: 3, printCents: [700, 600, 500] },
    { fromScreens: 6, printCents: [1000, 900, 800] },
  ],
  setupCentsPerScreen: 0,
  additionalPlacementPercent: 100,
  marginPercent: 0,
  sizeBands: [{ fromWidthCm: 0, percent: 100 }],
};

before(async () => {
  h = await bootstrapPrint();
  bulk = await import('@/lib/services/bulk');
  quotes = await import('@/lib/services/quotes');
  pricing = await import('@/lib/services/pricing-admin');
  tools = await import('@/lib/tools/bulk');
  bulk.runHooks.notify = async () => {};
  bulk.runHooks.markPacksNeededForOrder = async () => {};

  // What a run needs beyond the print harness's one blank: the services it offers, sizes, what the blank costs, a shipping zone.
  await h.db.insert(schema.blankPrintServices).values([
    { blankCode: 'STTU169', printServiceCode: 'dtg' },
    { blankCode: 'STTU169', printServiceCode: 'screen_2c' },
  ]);
  await h.db.insert(schema.blankSizes).values(['S', 'M', 'L'].map((size) => ({ blankCode: 'STTU169', size })));
  // The garment cost is the blank's: 6.50, and 6.00 from 25 pieces. A screen row, which the seed no longer has, says 99.99 and must be ignored.
  await h.db.insert(schema.baseCosts).values([
    { blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 },
    { blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 25, garmentCostCents: 600, printCostCents: 550, marginCents: 345 },
    { blankCode: 'STTU169', printServiceCode: 'screen_2c', qtyFrom: 1, garmentCostCents: 9999, printCostCents: 520, marginCents: 156 },
  ]);
  await h.db.insert(schema.shippingZones).values({ name: 'Spain', countries: ['ES'], flatCents: 450 });

  const saved = await pricing.setScreenPriceTable(h.owner, TABLE);
  assert.ok(saved.ok, saved.ok ? '' : saved.error);

  ctx = { userId: h.artist.userId, clerkId: 'clerk-artist', role: 'artist', storeId: h.artist.storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
});

after(async () => {
  await h.close();
});

// -- helpers -------------------------------------------------------------------------------

function line(designId: string | undefined, colourCode: string, extra: Record<string, unknown> = {}) {
  return {
    blankCode: 'STTU169',
    printServiceCode: 'screen_2c',
    placement: { position: 'front_chest', widthCm: 28 },
    ...(designId ? { designId } : {}),
    colourCode,
    sizes: { M: 30 },
    ...extra,
  };
}

async function quote(lines: ReturnType<typeof line>[]) {
  const result = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines, shipTo });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}

/** A design prepared for the default drop (darks and lights screen sets), as the worker would. */
async function prepared(colourCap?: number) {
  if (colourCap !== undefined) h.fakes.engine.options.colourCap = colourCap;
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  return { designId, designVersionId };
}

/** Another screen count for the design's screen files, the way the assistant asks for it, and the job run. */
async function withScreens(designId: string, screens: number): Promise<void> {
  const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens });
  assert.ok(changed.ok, changed.ok ? '' : changed.error);
  await h.runJob(changed.value.jobId);
}

// -- the count comes from the print files -------------------------------------------------

test('the screens come from the design\'s print files for that garment colour, both whites included', async () => {
  const { designId, designVersionId } = await prepared(4);
  const packs = await h.packs(designVersionId);
  const darks = packs.find((p) => p.screenSetKey === 'darks')!;
  const lights = packs.find((p) => p.screenSetKey === 'lights')!;
  assert.equal(darks.screenCount, 6, 'underbase, four colours and the highlight white');
  assert.equal(lights.screenCount, 4);

  const run = await quote([line(designId, black.code), line(designId, white.code)]);
  const [onBlack, onWhite] = run.lines;
  assert.equal(onBlack.screens?.basis, 'pack');
  assert.equal(onBlack.screens?.count, 6);
  assert.equal(onBlack.screens?.summary, '6 screens: no surcharge');
  assert.equal(onBlack.screens?.placements[0].setId, darks.id);
  // 6 screens, 30 pieces: tier 6 at the 25 break is 9.00, on a blank that costs 6.00 from 25
  assert.equal(onBlack.unitCents, 600 + 900);
  assert.equal(onBlack.totalCents, 30 * 1500);

  assert.equal(onWhite.screens?.count, 4);
  assert.equal(onWhite.screens?.placements[0].setId, lights.id);
  assert.equal(onWhite.unitCents, 600 + 600);
});

test('the service the artist picked does not set the count: screen_2c on a design that needs 6 screens is priced at 6', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code, { printServiceCode: 'screen_2c' })]);
  assert.equal(run.lines[0].screens?.count, 6);
  assert.equal(run.lines[0].printServiceCode, 'screen_2c');
  // the old way: the 2-colour guess alone would have been 4 screens at 6.00 + 6.00
  assert.notEqual(run.lines[0].unitCents, 600 + 600);
});

test('a garment colour that shares a screen set shares its count', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code), line(designId, navy.code)]);
  assert.deepEqual(run.lines.map((l) => l.screens?.count), [6, 6]);
  assert.equal(run.lines[0].screens?.placements[0].setId, run.lines[1].screens?.placements[0].setId);
});

test('the blank\'s garment cost comes from its other rows; a screen row is never read', async () => {
  const { designId } = await prepared(4);
  const small = await quote([line(designId, black.code, { sizes: { M: 5 } })]);
  // 5 pieces: the 6.50 break, the tier 6 price at the first break, 10.00
  assert.equal(small.lines[0].unitCents, 650 + 1000);
  assert.ok(small.lines[0].unitCents < 9999, 'the 99.99 screen row was not used');
});

// -- the fixed surcharge ------------------------------------------------------------------

test('8 screens carry no surcharge; 9 add a euro a piece; 12 add four; 15 add seven; the line says so', async () => {
  const { designId } = await prepared(13);

  const at = async (screens: number | null) => {
    if (screens !== null) await withScreens(designId, screens);
    const run = await quote([line(designId, black.code)]);
    return run.lines[0];
  };

  const eight = await at(null);
  assert.equal(eight.screens?.count, 8);
  assert.equal(eight.screens?.surchargeCentsPerPiece, 0);
  assert.equal(eight.screens?.summary, '8 screens: no surcharge');
  assert.equal(eight.unitCents, 600 + 900);

  const nine = await at(9);
  assert.equal(nine.screens?.count, 9);
  assert.equal(nine.screens?.surchargeCentsPerPiece, 100);
  assert.equal(nine.screens?.summary, '9 screens: +€1 per piece');
  assert.equal(nine.unitCents, 600 + 900 + 100, '9 screens use the last tier plus the fixed charge');

  const twelve = await at(12);
  assert.equal(twelve.screens?.summary, '12 screens: +€4 per piece');
  assert.equal(twelve.unitCents, 600 + 900 + 400);
  assert.equal(twelve.totalCents, 30 * (600 + 900 + 400));

  const fifteen = await at(15);
  assert.equal(fifteen.screens?.count, 15);
  assert.equal(fifteen.screens?.summary, '15 screens: +€7 per piece');
  assert.equal(fifteen.unitCents, 600 + 900 + 700);
});

test('a design that needs more than 15 screens is refused, and the answer says why in plain words', async () => {
  const { designId, designVersionId } = await prepared(4);
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  await h.db.update(schema.productionPacks).set({ screenCount: 16 }).where(eq(schema.productionPacks.id, darks.id));

  const refused = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines: [line(designId, black.code)], shipTo });
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.match(refused.error, /need 16 screens/);
    assert.match(refused.error, /more than the 15 we can print/);
    assert.match(refused.error, /Ask for fewer screens/);
    assert.doesNotMatch(refused.error, /pack|separation|plate|psd|pantone/i);
  }
  // the lights set is fine
  const fine = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines: [line(designId, white.code)], shipTo });
  assert.ok(fine.ok);
});

// -- no files yet: an estimate, with the reason ---------------------------------------------

test('with no print files the line is an estimate: the colours named by the service, and the whites on a dark garment', async () => {
  const { designId } = await h.newDesign();
  const run = await quote([line(designId, black.code), line(designId, white.code)]);
  const [onBlack, onWhite] = run.lines;

  assert.equal(onBlack.screens?.basis, 'estimate');
  assert.equal(onBlack.screens?.count, 4, '2 colours, the white underbase and the highlight white');
  assert.equal(onBlack.screens?.summary, 'Estimate: 4 screens: no surcharge');
  assert.match(onBlack.screens?.note ?? '', /print files for this design on Black aren't ready yet/);
  assert.match(onBlack.screens?.note ?? '', /screen count is an estimate: 4 screens \(2 colours, plus the white underbase and highlight white\)/);
  assert.match(onBlack.screens?.note ?? '', /follows the real count once the print files are ready/);
  assert.equal(onBlack.unitCents, 600 + 600);

  assert.equal(onWhite.screens?.count, 2, 'no underbase on a light garment');
  assert.equal(onWhite.unitCents, 600 + 300);
});

test('a line with no artwork says so', async () => {
  const run = await quote([line(undefined, black.code)]);
  assert.equal(run.lines[0].screens?.basis, 'estimate');
  assert.match(run.lines[0].screens?.note ?? '', /This line has no artwork yet, so its screen count is an estimate/);
});

test('files for another print position or size do not stand in: the line is an estimate, and the reason names the position', async () => {
  const { designId } = await prepared(4);
  // a different print width is a different position: there are files for the design, but none for this
  const narrow = await quote([line(designId, black.code, { placement: { position: 'front_chest', widthCm: 20 } })]);
  assert.equal(narrow.lines[0].screens?.basis, 'estimate');
  assert.match(narrow.lines[0].screens?.note ?? '', /There are no print files for this design at this print position and size yet, so its screen count is an estimate/);
  const back = await quote([line(designId, black.code, { placement: { position: 'back', widthCm: 32 } })]);
  assert.match(back.lines[0].screens?.note ?? '', /no print files for this design at this print position and size yet/);
});

test('files that do not cover the garment colour do not stand in either, and the reason names the colour', async () => {
  const { designId } = await h.newDesign();
  h.fakes.engine.options.colourCap = 4;
  // made for Black only
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), garmentCodes: [black.code] });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);

  const onBlack = await quote([line(designId, black.code)]);
  assert.equal(onBlack.lines[0].screens?.basis, 'pack');
  const onWhite = await quote([line(designId, white.code)]);
  assert.equal(onWhite.lines[0].screens?.basis, 'estimate');
  assert.match(onWhite.lines[0].screens?.note ?? '', /The print files for this design don't cover White yet, so its screen count is an estimate: 2 screens/);
});

test('a colour the design prints nothing on is an estimate with that reason, not a count of nothing', async () => {
  h.fakes.engine.options.nothingPrintsOnDarks = true;
  try {
    const { designId } = await prepared(4);
    const onBlack = await quote([line(designId, black.code)]);
    assert.equal(onBlack.lines[0].screens?.basis, 'estimate');
    assert.match(onBlack.lines[0].screens?.note ?? '', /The print files for this design print nothing on Black, so its screen count is an estimate/);
    // the lights still have their screens
    assert.equal((await quote([line(designId, white.code)])).lines[0].screens?.basis, 'pack');
  } finally {
    h.fakes.engine.options.nothingPrintsOnDarks = false;
  }
});

test('a guess never carries the surcharge', async () => {
  const { designId } = await h.newDesign();
  const run = await quote([line(designId, black.code)]);
  assert.equal(run.lines[0].screens?.surchargeCentsPerPiece, 0);
});

test('files being made again are used for now and flagged: the count may change', async () => {
  const { designId } = await prepared(13);
  const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 12 });
  assert.ok(changed.ok);

  // The job is queued, not run: the files that are there say 8, and the quote says that may change.
  const waiting = await quote([line(designId, black.code)]);
  assert.equal(waiting.lines[0].screens?.basis, 'estimate');
  assert.equal(waiting.lines[0].screens?.count, 8);
  assert.match(waiting.lines[0].screens?.note ?? '', /being prepared again, so the screen count may change/);
  assert.match(waiting.lines[0].screens?.note ?? '', /For now the quote uses 8 screens/);

  await h.runJob(changed.value.jobId);
  const done = await quote([line(designId, black.code)]);
  assert.equal(done.lines[0].screens?.basis, 'pack');
  assert.equal(done.lines[0].screens?.count, 12);
});

test('print files nobody has approved yet are used, and the line says so; once approved it does not', async () => {
  const { designId, designVersionId } = await prepared(4);
  const before = await quote([line(designId, black.code)]);
  assert.equal(before.lines[0].screens?.basis, 'pack');
  assert.equal(before.lines[0].screens?.placements[0].approved, false);
  assert.match(before.lines[0].screens?.note ?? '', /haven't been approved yet/);

  const approved = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId });
  assert.ok(approved.ok, approved.ok ? '' : approved.error);
  const after = await quote([line(designId, black.code)]);
  assert.equal(after.lines[0].screens?.placements[0].approved, true);
  assert.equal(after.lines[0].screens?.note, undefined);
});

// -- several print positions ------------------------------------------------------------------

test('a second print position is priced with its own screens and the second-position rate', async () => {
  await pricing.setScreenPriceTable(h.owner, { ...TABLE, additionalPlacementPercent: 80 });
  try {
    const { designId } = await h.newDesign();
    // front and back both prepared: 6 screens on a dark garment each
    h.fakes.engine.options.colourCap = 4;
    const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [{ position: 'front_chest', widthMm: 280 }, { position: 'back', widthMm: 320 }] });
    assert.ok(queued.ok, queued.ok ? '' : queued.error);
    await h.runJob(queued.value.jobId);

    const run = await quote([line(designId, black.code, { extraPlacements: [{ position: 'back', widthCm: 32 }] })]);
    const only = run.lines[0];
    assert.deepEqual(only.screens?.placements.map((p) => [p.position, p.screens, p.basis]), [['front_chest', 6, 'pack'], ['back', 6, 'pack']]);
    // both 6 screens at 9.00 (25 break): the first pays in full, the second 80%
    assert.equal(only.unitCents, 600 + 900 + 720);
    assert.equal(only.screens?.summary, 'front chest 6 screens, back 6 screens: no surcharge');
    assert.deepEqual(only.extraPlacements, [{ position: 'back', widthCm: 32 }]);
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('a position with no files yet is guessed while the other is read: the line is an estimate', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code, { extraPlacements: [{ position: 'back', widthCm: 32 }] })]);
  const only = run.lines[0];
  assert.deepEqual(only.screens?.placements.map((p) => [p.position, p.basis]), [['front_chest', 'pack'], ['back', 'estimate']]);
  assert.equal(only.screens?.basis, 'estimate');
  assert.match(only.screens?.note ?? '', /There are no print files for this design at this print position and size \(back\) yet, so its screen count is an estimate: 4 screens/);
});

test('a second position that the blank does not take or a repeat is refused; on a DTG line it adds the shop extra', async () => {
  const { designId } = await h.newDesign();
  const base = { storeId: h.artist.storeId, shipTo };
  const sleeve = await bulk.createBulkQuote({ ...base, lines: [line(designId, black.code, { extraPlacements: [{ position: 'sleeve', widthCm: 8 }] })] });
  assert.equal(sleeve.ok, false);
  if (!sleeve.ok) assert.match(sleeve.error, /"sleeve" is not a print position for T-shirts\. Say which sleeve: sleeve_left or sleeve_right\./);

  const repeat = await bulk.createBulkQuote({ ...base, lines: [line(designId, black.code, { extraPlacements: [{ position: 'front_chest', widthCm: 10 }] })] });
  assert.deepEqual(repeat, { ok: false, error: 'A garment can have each print position once.' });

  // DTG/DTF prints the back in the same pass: the run's price for the garment with one print, plus the shop's extra for front and back.
  const { podPrice } = await import('@/lib/pricing/pod');
  const shop = await podPrice('STTU169', [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 30 }]);
  const extra = (shop?.lines ?? []).filter((l) => l.key !== 'base').reduce((sum, l) => sum + l.cents, 0);
  assert.ok(extra > 0, 'front and back has an extra');
  const dtg = await bulk.createBulkQuote({ ...base, lines: [line(designId, black.code, { printServiceCode: 'dtg', extraPlacements: [{ position: 'back', widthCm: 30 }] })] });
  const one = await bulk.createBulkQuote({ ...base, lines: [line(designId, black.code, { printServiceCode: 'dtg' })] });
  assert.ok(dtg.ok && one.ok, dtg.ok ? (one.ok ? '' : one.error) : dtg.error);
  assert.equal(dtg.value.lines[0].unitCents, one.value.lines[0].unitCents + extra);
  assert.deepEqual(dtg.value.lines[0].extraPlacements, [{ position: 'back', widthCm: 30 }]);

  const huge = await bulk.createBulkQuote({ ...base, lines: [line(designId, black.code, { extraPlacements: [{ position: 'back', widthCm: 100 }] })] });
  assert.deepEqual(huge, { ok: false, error: 'A print position must be between 2 and 60 cm wide.' });

  const tooMany = await bulk.createBulkQuote({
    ...base,
    lines: [line(designId, black.code, { extraPlacements: ['back', 'front_full', 'front_left_chest', 'centre'].map((position) => ({ position, widthCm: 10 })) })],
  });
  assert.equal(tooMany.ok, false);
});

// -- setup ----------------------------------------------------------------------------------

test('setup is charged once for each set of screens: colours that share one count once', async () => {
  await pricing.setScreenPriceTable(h.owner, { ...TABLE, setupCentsPerScreen: 1000 });
  try {
    const { designId } = await prepared(4);
    // Black and French Navy share the 6 darks screens; White has its own 4
    const run = await quote([line(designId, black.code), line(designId, navy.code), line(designId, white.code)]);
    assert.equal(run.setupCents, (6 + 4) * 1000);
    const linesTotal = run.lines.reduce((sum, l) => sum + l.totalCents, 0);
    assert.equal(run.totalCents, linesTotal + run.setupCents + run.shippingCents);

    // a guess shares by design, position and lightness: Black and Navy are one dark set, White another light
    const { designId: bare } = await h.newDesign();
    const guessed = await quote([line(bare, black.code), line(bare, navy.code), line(bare, white.code)]);
    assert.equal(guessed.setupCents, (4 + 2) * 1000);
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('no setup fee until one is set', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code)]);
  assert.equal(run.setupCents, 0);
});

// -- the proof and the approval -----------------------------------------------------------------

test('the proof says "Screen print" and gives each line its screens', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code), line(designId, white.code)]);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  const spec = proof.value.spec;
  assert.equal(spec.find((row) => row.label === 'Print method')?.value, 'Screen print');
  assert.equal(spec.find((row) => /^Screens · .* · Black$/.test(row.label))?.value, '6 screens: no surcharge');
  assert.equal(spec.find((row) => /^Screens · .* · White$/.test(row.label))?.value, '4 screens: no surcharge');
});

test('the run is priced again when the proof is sent: a guess becomes the real count once the files exist', async () => {
  const { designId } = await h.newDesign();
  const run = await quote([line(designId, black.code)]);
  assert.equal(run.lines[0].screens?.basis, 'estimate');
  assert.equal(run.lines[0].unitCents, 600 + 600);

  // the artist prepares the print files before sending the proof: 6 screens on Black
  h.fakes.engine.options.colourCap = 4;
  await h.prepare(designId);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);

  const again = await bulk.getBulkOrder(h.artist.storeId, run.id);
  assert.equal(again?.lines[0].screens?.basis, 'pack');
  assert.equal(again?.lines[0].screens?.count, 6);
  assert.equal(again?.lines[0].unitCents, 600 + 900);
  assert.equal(again?.totalCents, 30 * 1500 + again!.setupCents + again!.shippingCents);
  const total = proof.value.spec.find((row) => row.label === 'Total');
  assert.equal(total?.value, `€${(again!.totalCents / 100).toFixed(2)}`, 'the proof shows the new total');
});

test('an unchanged run keeps its price through the proof', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code)]);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);
  const after = await bulk.getBulkOrder(h.artist.storeId, run.id);
  assert.equal(after?.totalCents, run.totalCents);
  assert.deepEqual(after?.lines[0].screens, run.lines[0].screens);
});

test('the price table changing does not move a quote that is waiting on approval; the screens changing does', async () => {
  const { designId } = await prepared(13);
  const run = await quote([line(designId, black.code)]);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);
  const sentTotal = (await bulk.getBulkOrder(h.artist.storeId, run.id))!.totalCents;

  // dearer prices after the proof was sent: the artist approves the price they were shown
  await pricing.setScreenPriceTable(h.owner, { ...TABLE, tiers: TABLE.tiers.map((t) => ({ ...t, printCents: t.printCents.map((c) => c + 500) })) });
  try {
    const approved = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
    assert.ok(approved.ok, approved.ok ? '' : approved.error);
    const afterApproval = await bulk.getBulkOrder(h.artist.storeId, run.id);
    assert.equal(afterApproval?.status, 'awaiting_payment');
    assert.equal(afterApproval?.totalCents, sentTotal);
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('an approval is refused when the screens changed since the proof: the quote is updated and the proof goes back', async () => {
  const { designId } = await prepared(13);
  const run = await quote([line(designId, black.code)]);
  assert.equal(run.lines[0].screens?.count, 8);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);

  // fewer or more screens after the proof was sent
  await withScreens(designId, 12);
  const refused = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.match(refused.error, /^The screens changed since this proof was sent/);
    assert.match(refused.error, /was 8 screens: no surcharge, now 12 screens: \+€4 per piece/);
    assert.match(refused.error, /send the proof again/);
  }

  const now = await bulk.getBulkOrder(h.artist.storeId, run.id);
  assert.equal(now?.status, 'quoted', 'back to the quote stage');
  assert.equal(now?.lines[0].screens?.count, 12);
  assert.equal(now?.lines[0].unitCents, 600 + 900 + 400);
  const latest = await h.db.select().from(schema.proofs).where(eq(schema.proofs.bulkOrderId, run.id));
  assert.equal(latest[0].status, 'changes_requested');
  assert.match(latest[0].notes ?? '', /The screens changed/);

  // sent again and approved, the artist signs off the new price
  const second = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(second.ok, second.ok ? '' : second.error);
  const approved = await bulk.approveBulkProof(h.artist.storeId, second.value.id, h.artist.userId);
  assert.ok(approved.ok, approved.ok ? '' : approved.error);
  assert.equal((await bulk.getBulkOrder(h.artist.storeId, run.id))?.status, 'awaiting_payment');
});

test('an approval waits while the design\'s screen files are being made again: the count can still change, so nothing is signed', async () => {
  const { designId } = await prepared(13);
  const run = await quote([line(designId, black.code)]);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);

  // 12 screens asked for after the proof was sent; the job is queued, not run: the files still say 8
  const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 12 });
  assert.ok(changed.ok);
  const waiting = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.deepEqual(waiting, {
    ok: false,
    error: 'The print files for this design are being prepared, so the screen count, and the price, can still change. Approve the proof once they are ready.',
  });
  const still = await bulk.getBulkOrder(h.artist.storeId, run.id);
  assert.equal(still?.status, 'proof_pending', 'nothing moved: the proof stays out');
  assert.equal(still?.lines[0].screens?.count, 8);

  // once the files are made, the new count stops the approval as any change does
  await h.runJob(changed.value.jobId);
  const refused = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.ok(!refused.ok && /^The screens changed since this proof was sent/.test(refused.error), JSON.stringify(refused));
});

test('a guess that became the real count after the proof also stops the approval', async () => {
  const { designId } = await h.newDesign();
  const run = await quote([line(designId, black.code)]);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);

  h.fakes.engine.options.colourCap = 4;
  await h.prepare(designId);
  const refused = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.equal(refused.ok, false);
  assert.equal((await bulk.getBulkOrder(h.artist.storeId, run.id))?.status, 'quoted');
});

test('a guess that turns out to be the real count does not hold up the approval', async () => {
  // with 2 colour inks the real separation is the guess: 4 screens on a dark garment (2 colours and both whites)
  const { designId } = await h.newDesign();
  const run = await quote([line(designId, black.code)]);
  assert.equal(run.lines[0].screens?.basis, 'estimate');
  assert.equal(run.lines[0].screens?.count, 4);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);

  h.fakes.engine.options.colourCap = 2;
  try {
    await h.prepare(designId);
    const approved = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
    assert.ok(approved.ok, approved.ok ? '' : approved.error);
    assert.equal((await bulk.getBulkOrder(h.artist.storeId, run.id))?.status, 'awaiting_payment');
  } finally {
    h.fakes.engine.options.colourCap = 4;
  }
});

test('a run of DTG or DTF has nothing to move: the proof and the approval go as before', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code, { printServiceCode: 'dtg' })]);
  assert.equal(run.lines[0].screens, undefined);
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok);
  assert.equal(proof.value.spec.find((row) => row.label === 'Print method')?.value, 'DTG');
  assert.ok(!proof.value.spec.some((row) => row.label.startsWith('Screens')));
  const approved = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.ok(approved.ok);
});

test('a DTG run keeps the setup it was quoted with when its proof is sent, as before screen pricing', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code, { printServiceCode: 'dtg' })]);
  const [service] = await h.db.select({ setupCents: schema.printServices.setupCents }).from(schema.printServices).where(eq(schema.printServices.code, 'dtg'));
  await h.db.update(schema.printServices).set({ setupCents: (service?.setupCents ?? 0) + 2500 }).where(eq(schema.printServices.code, 'dtg'));
  try {
    const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
    assert.ok(proof.ok);
    const after = await bulk.getBulkOrder(h.artist.storeId, run.id);
    assert.deepEqual([after?.setupCents, after?.totalCents], [run.setupCents, run.totalCents]);
  } finally {
    await h.db.update(schema.printServices).set({ setupCents: service?.setupCents ?? 0 }).where(eq(schema.printServices.code, 'dtg'));
  }
});

// -- other pricing paths ----------------------------------------------------------------------

test('DTG keeps its price from the base costs, untouched by the screen table', async () => {
  const { designId } = await prepared(4);
  const run = await quote([line(designId, black.code, { printServiceCode: 'dtg' })]);
  // 30 pieces: the 25 row, 6.00 + 5.50 + 3.45
  assert.equal(run.lines[0].unitCents, 600 + 550 + 345);
});

test('get_quote-style pricing of a screen service is an estimate with the screens it assumed', async () => {
  const dark = await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'screen_2c', qty: 30, colourCode: black.code });
  assert.ok(dark);
  assert.equal(dark.estimate, true);
  assert.equal(dark.screens, 4);
  assert.equal(dark.unitBaseCostCents, 600 + 600);
  assert.deepEqual(dark.breaks.map((b) => b.qtyFrom), [1, 25, 100]);
  assert.equal(dark.breaks[0].unitCents, 650 + 700, 'one piece: the 6.50 blank and tier 3 at the first break');

  const light = await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'screen_2c', qty: 30, colourCode: white.code });
  assert.equal(light?.screens, 2);
  // with no colour a dark garment is assumed: a guess does not undercharge
  assert.equal((await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'screen_2c', qty: 30 }))?.screens, 4);
  // DTG is not an estimate
  assert.equal((await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'dtg', qty: 30 }))?.estimate, undefined);
});

test('get_quote says a screen price is an estimate, with its screens, and offers a run quote rather than a shop price', async () => {
  const { getQuoteTool } = await import('@/lib/tools/products');
  const screen = await getQuoteTool.run(ctx, { blankCode: 'STTU169', printServiceCode: 'screen_2c', qty: 30, colourCode: white.code });
  assert.deepEqual([screen.data.ok, screen.data.estimate, screen.data.screens], [true, true, 2]);
  const card = screen.ui?.cards?.[0] as { note?: string } | undefined;
  assert.match(card?.note ?? '', /Estimate for 2 screens: a run quote counts the screens from the design's print files/);
  assert.deepEqual(screen.ui?.next?.map((c) => c.label), ['Quote a run']);
  // a dark garment, or none named, counts the two whites
  assert.equal((await getQuoteTool.run(ctx, { blankCode: 'STTU169', printServiceCode: 'screen_2c', qty: 30 })).data.screens, 4);
  // DTG is a price, not an estimate
  const dtg = await getQuoteTool.run(ctx, { blankCode: 'STTU169', printServiceCode: 'dtg', qty: 30 });
  assert.deepEqual([dtg.data.ok, dtg.data.estimate, dtg.data.screens], [true, undefined, undefined]);
  assert.deepEqual(dtg.ui?.next?.map((c) => c.label), ['Set a price']);
});

test('a supplier order buys a screen-printed run\'s blanks at the blank\'s own cost, not at nothing', async () => {
  const { designId } = await h.newDesign();
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: black.code, qty: 30, printServiceCode: 'screen_2c' }] });
  const { draftSupplierOrder } = await import('@/lib/services/supplier');
  const drafted = await draftSupplierOrder({ orderIds: [run.orderId] });
  assert.ok(drafted.ok, drafted.ok ? '' : drafted.error);
  // 30 blanks: the 6.00 break of the blank's own rows (the 99.99 screen row is a leftover and never read)
  assert.deepEqual(
    drafted.value.lines.map((l) => [l.blankCode, l.qty, l.unitCostCents]),
    [['STTU169', 30, 600]],
  );
  assert.equal(drafted.value.totalCostCents, 30 * 600);
});

test('a screen row an old seed left behind is never a blank\'s "from" price', async () => {
  const { getBlank, listBlanks } = await import('@/lib/services/blanks');
  const where = and(eq(schema.baseCosts.blankCode, 'STTU169'), eq(schema.baseCosts.printServiceCode, 'screen_2c'), eq(schema.baseCosts.qtyFrom, 1));
  const [stale] = await h.db.select().from(schema.baseCosts).where(where);
  // make the leftover the cheapest row: 2.00 a piece
  await h.db.update(schema.baseCosts).set({ garmentCostCents: 100, printCostCents: 100, marginCents: 0 }).where(where);
  try {
    // DTG at one piece: 6.50 + 6.00 + 3.75
    assert.equal((await getBlank('STTU169'))?.fromPriceCents, 1625);
    const listed = (await listBlanks({ q: 'STTU169' })).items.find((b) => b.code === 'STTU169');
    assert.equal(listed?.fromPriceCents, 1625);
  } finally {
    await h.db.update(schema.baseCosts).set({ garmentCostCents: stale.garmentCostCents, printCostCents: stale.printCostCents, marginCents: stale.marginCents }).where(where);
  }
});

test('the blank\'s garment cost is its own, by quantity, whatever service has no rows', async () => {
  assert.equal(await quotes.blankGarmentCost('STTU169', 1), 650);
  assert.equal(await quotes.blankGarmentCost('STTU169', 24), 650);
  assert.equal(await quotes.blankGarmentCost('STTU169', 25), 600);
  assert.equal(await quotes.blankGarmentCost('NOPE', 25), null);
});

test('a service the blank does not offer, or a blank with no pricing, has no screen quote', async () => {
  assert.equal(await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'screen_3c', qty: 30 }), null);
  assert.equal(await quotes.quoteFor({ blankCode: 'STTU169', printServiceCode: 'screen_9c', qty: 30 }), null);
  await h.db.insert(schema.blanks).values({ code: 'STNP000', name: 'Unpriced', type: 'T-shirts' });
  await h.db.insert(schema.blankPrintServices).values({ blankCode: 'STNP000', printServiceCode: 'screen_2c' });
  assert.equal(await quotes.quoteFor({ blankCode: 'STNP000', printServiceCode: 'screen_2c', qty: 30 }), null);
  const line0 = await quotes.quoteScreenLine({ blankCode: 'STNP000', printServiceCode: 'screen_2c', colourCode: black.code, qty: 30, designId: null, placements: [{ position: 'front_chest', widthCm: 28 }] });
  assert.deepEqual(line0, { ok: false, error: 'No pricing configured for STNP000 with screen_2c.' });
});

test('base costs for a screen service are refused: nothing would read them', async () => {
  const refused = await pricing.setBaseCost({ blankCode: 'STTU169', printServiceCode: 'screen_2c', garmentCostCents: 600, printCostCents: 400, marginCents: 300 });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /priced by screen count in the screen-print price table/);
  const fine = await pricing.setBaseCost({ blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 500, garmentCostCents: 600, printCostCents: 400, marginCents: 300 });
  assert.ok(fine.ok);
});

// -- the price table: who edits it, what is kept ------------------------------------------------

test('until a table is saved the placeholder is used, and it says so', async () => {
  await h.db.delete(schema.appSettings).where(eq(schema.appSettings.key, 'screen_print_price_table'));
  try {
    const state = await pricing.getScreenPriceTableState();
    assert.equal(state.placeholder, true);
    assert.equal(state.updatedAt, null);
    const { defaultScreenPriceTable } = await import('@/lib/pricing/screen-print');
    assert.deepEqual(state.table, defaultScreenPriceTable());

    // and a run is quoted from it: 1 colour... the old screen_1c price for 1 screen
    const { designId } = await h.newDesign();
    const run = await quote([line(designId, white.code, { printServiceCode: 'screen_2c', sizes: { M: 1 } })]);
    // light garment, 2 colours: 2 screens, 5.20 at the first break, 30% margin on the 6.50 blank
    assert.equal(run.lines[0].screens?.count, 2);
    assert.equal(run.lines[0].unitCents, 650 + 520 + Math.round(0.3 * (650 + 520)));
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('the owner and staff with Manage access to Catalogue and pricing save the table; others are refused', async () => {
  const table = { ...TABLE, marginPercent: 12 };
  const view = await h.staff({ catalogue: 'view' });
  const work = await h.staff({ catalogue: 'work', prepress: 'manage' });
  const manage = await h.staff({ catalogue: 'manage' });
  const artist: Parameters<typeof pricing.setScreenPriceTable>[0] = { userId: h.artist.userId, role: 'artist' };

  for (const [who, actor] of [['artist', artist], ['view', view], ['work', work]] as const) {
    const refused = await pricing.setScreenPriceTable(actor, table);
    assert.deepEqual(refused, { ok: false, error: "You don't have Manage access to Catalogue and pricing." }, who);
  }
  assert.equal((await pricing.getScreenPriceTable()).marginPercent, 0, 'nothing was saved');

  const saved = await pricing.setScreenPriceTable(manage, table);
  assert.ok(saved.ok, saved.ok ? '' : saved.error);
  assert.equal(saved.ok && saved.value.placeholder, false);
  assert.equal((await pricing.getScreenPriceTable()).marginPercent, 12);
  const log = await h.db.select().from(schema.staffActivity).where(and(eq(schema.staffActivity.actorId, manage.userId), eq(schema.staffActivity.action, 'pricing.screen_table')));
  assert.equal(log.length, 1);
  assert.equal(log[0].area, 'catalogue');

  const owner = await pricing.setScreenPriceTable(h.owner, TABLE);
  assert.ok(owner.ok);
  assert.equal((await pricing.getScreenPriceTable()).marginPercent, 0);
});

test('a table that does not make sense is refused with the box to look at, and nothing is saved', async () => {
  const wrong = await pricing.setScreenPriceTable(h.owner, { ...TABLE, marginPercent: 'a lot' });
  assert.equal(wrong.ok, false);
  assert.equal(!wrong.ok && wrong.field, 'margin');
  const backwards = await pricing.setScreenPriceTable(h.owner, { ...TABLE, tiers: [{ fromScreens: 1, printCents: [400, 300, 200] }, { fromScreens: 3, printCents: [100, 100, 100] }] });
  assert.equal(backwards.ok, false);
  assert.match(!backwards.ok ? backwards.error : '', /More screens should not cost less/);
  assert.equal((await pricing.getScreenPriceTable()).marginPercent, 0);
});

test('a saved row that no longer passes the checks is ignored, so runs always have a price', async () => {
  await h.db.update(schema.appSettings).set({ valueJson: { version: 1, table: { breaks: [5] } } }).where(eq(schema.appSettings.key, 'screen_print_price_table'));
  const errors: unknown[][] = [];
  const log = console.error;
  console.error = (...args: unknown[]) => void errors.push(args);
  try {
    const state = await pricing.getScreenPriceTableState();
    assert.equal(state.placeholder, true);
    assert.equal(state.table.breaks[0], 1);
  } finally {
    console.error = log;
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
  assert.ok(errors.some((e) => String(e[0]).includes('the saved screen-print price table is not valid')));
});

// -- the run tool explains it ---------------------------------------------------------------------

async function toolQuote(lines: ReturnType<typeof line>[]) {
  const result = await tools.createBulkQuoteTool.run(ctx, { lines, shipTo } as never);
  assert.equal(result.data.ok, true, result.data.error);
  return result;
}

test('the quote tool gives the model each screen line\'s count and effect, and says nothing alarming when there is no surcharge', async () => {
  const { designId } = await prepared(4);
  const result = await toolQuote([line(designId, black.code)]);
  const [fact] = result.data.screenPrint ?? [];
  assert.equal(fact.screens, 6);
  assert.equal(fact.effect, '6 screens: no surcharge');
  assert.equal(fact.estimate, false);
  assert.equal(fact.surchargeCentsPerPiece, 0);
  assert.equal(fact.fewerScreens, undefined);
  assert.equal(fact.designId, designId);
  assert.equal(result.data.estimate, false);
  assert.match(result.data.screenRule ?? '', /each screen above 8 adds €1 per piece, up to 15 screens/);
  // no notice, no chip about screens
  assert.deepEqual((result.ui?.cards ?? []).map((c) => c.kind), ['bulk_quote']);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Change the address']);
});

test('with a surcharge the tool explains it in a notice and offers fewer screens', async () => {
  const { designId } = await prepared(13);
  await withScreens(designId, 11);
  const result = await toolQuote([line(designId, black.code)]);
  const [fact] = result.data.screenPrint ?? [];
  assert.equal(fact.effect, '11 screens: +€3 per piece');
  assert.equal(fact.surchargeCentsPerPiece, 300);
  assert.deepEqual(fact.fewerScreens, { screens: 8, savesCentsPerPiece: 300 });
  assert.equal(fact.designId, designId, 'what change_screen_count needs');

  const notice = (result.ui?.cards ?? []).find((c) => c.kind === 'notice') as { tone: string; text: string } | undefined;
  assert.ok(notice);
  assert.equal(notice.tone, 'warning');
  assert.match(notice.text, /prints from 11 screens, so each piece costs €3 more/);
  assert.match(notice.text, /Each screen above 8 adds €1 per piece/);
  assert.match(notice.text, /the look changes and you would approve the new proof again/);
  assert.doesNotMatch(notice.text, /pack|separation|plate|psd|pantone|change_screen_count/i);

  const labels = (result.ui?.next ?? []).map((c) => c.label);
  assert.deepEqual(labels, ['Send the proof', 'Use 8 screens instead', 'Change the address']);
  const offer = (result.ui?.next ?? []).find((c) => c.label === 'Use 8 screens instead');
  assert.match(offer?.prompt ?? '', /^Use 8 screens for Run \d+, then quote it again$/);
});

test('with a guess the tool says it is an estimate and offers to prepare the print files', async () => {
  const { designId } = await h.newDesign();
  const result = await toolQuote([line(designId, black.code)]);
  assert.equal(result.data.estimate, true);
  const notice = (result.ui?.cards ?? []).find((c) => c.kind === 'notice') as { tone: string; text: string } | undefined;
  assert.equal(notice?.tone, 'info');
  assert.match(notice?.text ?? '', /screen count is an estimate/);
  assert.ok((result.ui?.next ?? []).some((c) => c.label === 'Prepare the print files'));
});

test('a design that needs more than 15 screens is refused by the tool, which offers fewer', async () => {
  const { designId, designVersionId } = await prepared(4);
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  await h.db.update(schema.productionPacks).set({ screenCount: 17 }).where(eq(schema.productionPacks.id, darks.id));
  const result = await tools.createBulkQuoteTool.run(ctx, { lines: [line(designId, black.code)], shipTo } as never);
  assert.equal(result.data.ok, false);
  assert.match(result.data.error ?? '', /need 17 screens on Black, more than the 15 we can print/);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Use 8 screens instead']);
  assert.match(result.ui?.next?.[0].prompt ?? '', /^Use 8 screens for this design, then quote the run again$/);
  // any other refusal offers nothing
  const other = await tools.createBulkQuoteTool.run(ctx, { lines: [line(designId, 'C999')], shipTo } as never);
  assert.equal(other.data.ok, false);
  assert.equal(other.ui?.next, undefined);
});

test('a DTG run has no screens to explain', async () => {
  const { designId } = await prepared(4);
  const result = await toolQuote([line(designId, black.code, { printServiceCode: 'dtg' })]);
  assert.equal(result.data.screenPrint, undefined);
  assert.equal(result.data.estimate, undefined);
  assert.deepEqual((result.ui?.cards ?? []).map((c) => c.kind), ['bulk_quote']);
});

test('setup shows in the data when there is one', async () => {
  await pricing.setScreenPriceTable(h.owner, { ...TABLE, setupCentsPerScreen: 500 });
  try {
    const { designId } = await prepared(4);
    const result = await toolQuote([line(designId, black.code)]);
    assert.equal(result.data.setupCents, 6 * 500);
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('sending the proof tells the model when the price moved, and approving after a change offers the proof again', async () => {
  const { designId } = await h.newDesign();
  const quoted = await toolQuote([line(designId, black.code)]);
  const card = quoted.ui?.cards?.find((c) => c.kind === 'bulk_quote') as { bulkOrderId: string };

  // the print files appear before the proof is sent
  h.fakes.engine.options.colourCap = 4;
  await h.prepare(designId);
  const sent = await tools.submitBulkProofTool.run(ctx, { bulkOrderId: card.bulkOrderId } as never);
  assert.equal(sent.data.ok, true, sent.data.error);
  assert.ok(sent.data.priceChanged, 'the price moved from the estimate to the real count');
  assert.ok((sent.data.priceChanged?.toCents ?? 0) > (sent.data.priceChanged?.fromCents ?? 0));
  assert.ok((sent.ui?.cards ?? []).some((c) => c.kind === 'notice' && /The price is now/.test((c as { text: string }).text)));
  assert.equal(sent.data.screenPrint?.[0].estimate, false);

  // the screens change before the artist approves
  h.fakes.engine.options.colourCap = 13;
  await withScreens(designId, 12);
  const proof = await h.db.select().from(schema.proofs).where(eq(schema.proofs.bulkOrderId, card.bulkOrderId));
  const refused = await tools.approveBulkProofTool.run(ctx, { bulkOrderId: card.bulkOrderId, proofId: proof[0].id } as never);
  assert.equal(refused.data.ok, false);
  assert.match(refused.data.error ?? '', /^The screens changed since this proof was sent/);
  assert.deepEqual((refused.ui?.next ?? []).map((c) => c.label), ['Send the proof again']);
});

test('tool text about screens stays in the artist\'s words', async () => {
  const text = [tools.createBulkQuoteTool.description, tools.submitBulkProofTool.description].join(' ');
  assert.match(text, /change_screen_count/);
  assert.match(text, /each screen above 8 adds €1 per piece, up to 15/);
  assert.doesNotMatch(text, /pantone/i);
});
