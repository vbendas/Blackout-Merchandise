// Two pricing rules for runs (owner decisions, 16 Oct 2026), on PGlite with the fake print engine:
//
// 1. A screen-printed run counts the screens above 8 PER PRINT POSITION, on that position's own design: 10 colours on
//    the back is +2 euros a piece, and the front at 10 colours too is 2 more, +4 in all. Each position is capped at
//    15 and refused above. A position with no print files yet is a guess on its own, and says so.
// 2. A DTG/DTF run pays the shop's extras for more print positions on top of its run price: +1 euro for front and
//    back, +2 euros once for sleeve prints, the values of the shop price table.
//
// Shop products keep what they had: the position extras, and never a charge for colours. Nothing here touches Neon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { GARMENTS, bootstrapPrint, type Harness } from '@/lib/print/test-support';
import { describeRunLine, type ScreenPriceTable } from '@/lib/pricing/screen-print';
import type { ToolContext } from '@/lib/tools/types';

let h: Harness;
let bulk: typeof import('@/lib/services/bulk');
let quotes: typeof import('@/lib/services/quotes');
let pricing: typeof import('@/lib/services/pricing-admin');
let tools: typeof import('@/lib/tools/bulk');
let ctx: ToolContext;

const { black, white } = GARMENTS;
const TEE = 'STTU169';
const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

/** A table that is easy to read: no margin, a second position at the full price, and every count from 6 to 15 at the last tier. */
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

/** 30 pieces: the blank costs 6.00 (the 25 break), and a print of 6 screens or more is 9.00 at that break. */
const GARMENT = 600;
const PRINT = 900;
/** What a DTG or DTF run of 30 pieces costs for one print position: the 25 row, 6.00 + 5.50 + 3.45. */
const RUN_PRICE = 600 + 550 + 345;

const FRONT = { position: 'front_full', widthMm: 380 };
const FRONT_CM = { position: 'front_full', widthCm: 38 };
const BACK = { position: 'back', widthMm: 320 };
const BACK_CM = { position: 'back', widthCm: 32 };

before(async () => {
  h = await bootstrapPrint();
  bulk = await import('@/lib/services/bulk');
  quotes = await import('@/lib/services/quotes');
  pricing = await import('@/lib/services/pricing-admin');
  tools = await import('@/lib/tools/bulk');
  bulk.runHooks.notify = async () => {};
  bulk.runHooks.markPacksNeededForOrder = async () => {};

  await h.db.insert(schema.printServices).values({ code: 'dtf', name: 'DTF' });
  await h.db.insert(schema.blankPrintServices).values(['dtg', 'dtf', 'screen_2c', 'embroidery'].map((printServiceCode) => ({ blankCode: TEE, printServiceCode })));
  await h.db.insert(schema.blankSizes).values(['S', 'M', 'L'].map((size) => ({ blankCode: TEE, size })));
  // The blank's cost is 6.50 (6.00 from 25 pieces). DTG and DTF cost the same, embroidery its own. Screen print has no rows.
  await h.db.insert(schema.baseCosts).values([
    ...['dtg', 'dtf'].flatMap((printServiceCode) => [
      { blankCode: TEE, printServiceCode, qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 },
      { blankCode: TEE, printServiceCode, qtyFrom: 25, garmentCostCents: 600, printCostCents: 550, marginCents: 345 },
    ]),
    { blankCode: TEE, printServiceCode: 'embroidery', qtyFrom: 1, garmentCostCents: 650, printCostCents: 850, marginCents: 450 },
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

/** A run line. Screen print by default, on the front, 30 pieces in black. */
function line(designId: string | undefined, extra: Record<string, unknown> = {}) {
  return {
    blankCode: TEE,
    printServiceCode: 'screen_2c',
    placement: FRONT_CM,
    ...(designId ? { designId } : {}),
    colourCode: black.code,
    sizes: { M: 30 },
    ...extra,
  };
}

async function quote(lines: ReturnType<typeof line>[]) {
  const result = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines, shipTo });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}

/** A design with screen files at these print positions, as the worker would make them: 8 screens everywhere, for the darks and the lights. */
async function preparedAt(positions: { position: string; widthMm: number }[]) {
  h.fakes.engine.options.colourCap = 13;
  const { designId } = await h.newDesign();
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: positions });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);
  return { designId, designVersionId: queued.value.designVersionId };
}

/** The screens each print position of a design's files uses, as the print files say it. */
async function setScreens(designVersionId: string, counts: Record<string, number>): Promise<void> {
  for (const pack of await h.packs(designVersionId)) {
    if (pack.technique !== 'screen' || pack.buildStatus !== 'ready' || h.pipeline.isSuperseded(pack)) continue;
    const position = h.pipeline.packPlacement(pack).position;
    if (position in counts) await h.db.update(schema.productionPacks).set({ screenCount: counts[position] }).where(eq(schema.productionPacks.id, pack.id));
  }
}

/** A run of one front and one back on the same design, at these colours each. */
async function frontAndBack(front: number, back: number) {
  const { designId, designVersionId } = await preparedAt([FRONT, BACK]);
  await setScreens(designVersionId, { front_full: front, back });
  return { designId, designVersionId, lines: () => quote([line(designId, { extraPlacements: [BACK_CM] })]) };
}

const words = (lines: { extras?: Parameters<typeof describeRunLine>[0][] }) => (lines.extras ?? []).map(describeRunLine);

// -- rule 1: the colours above 8, counted for each print position -----------------------------------

test("the owner's example: 10 colours on the back is +€2.00, the front at 10 colours too is 2 more, +€4.00 a piece", async () => {
  const { designVersionId, lines } = await frontAndBack(10, 10);
  const run = await lines();
  const only = run.lines[0];

  assert.deepEqual(words(only), ['Front · 10 colours: +€2.00', 'Back · 10 colours: +€2.00']);
  assert.equal(only.screens?.surchargeCentsPerPiece, 400);
  assert.equal(only.unitCents, GARMENT + 2 * PRINT + 400);
  assert.equal(only.totalCents, 30 * (GARMENT + 2 * PRINT + 400));
  assert.deepEqual(only.screens?.placements.map((p) => [p.position, p.screens, p.surchargeCents, p.basis]), [['front_full', 10, 200, 'pack'], ['back', 10, 200, 'pack']]);

  // the same two prints at 8 colours each: nothing extra, four euros less a piece
  await setScreens(designVersionId, { front_full: 8, back: 8 });
  const plain = (await lines()).lines[0];
  assert.equal(plain.unitCents, GARMENT + 2 * PRINT);
  assert.equal(only.unitCents - plain.unitCents, 400);
  assert.deepEqual(words(plain), ['Front · 8 colours: no surcharge', 'Back · 8 colours: no surcharge']);

  // only the back at 10: +2, not +4 and not one charge on the most
  await setScreens(designVersionId, { front_full: 8, back: 10 });
  const backOnly = (await lines()).lines[0];
  assert.equal(backOnly.unitCents - plain.unitCents, 200);
  assert.deepEqual(words(backOnly), ['Front · 8 colours: no surcharge', 'Back · 10 colours: +€2.00']);
});

test('one position at 8 colours has no surcharge, at 9 a euro, at 15 seven; 16 is refused', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT]);
  const at = async (screens: number) => {
    await setScreens(designVersionId, { front_full: screens });
    return (await quote([line(designId)])).lines[0];
  };

  const eight = await at(8);
  assert.equal(eight.screens?.surchargeCentsPerPiece, 0);
  assert.equal(eight.unitCents, GARMENT + PRINT);
  assert.deepEqual(words(eight), ['Front · 8 colours: no surcharge']);

  const nine = await at(9);
  assert.equal(nine.unitCents, GARMENT + PRINT + 100);
  assert.deepEqual(words(nine), ['Front · 9 colours: +€1.00']);

  const fifteen = await at(15);
  assert.equal(fifteen.unitCents, GARMENT + PRINT + 700);
  assert.deepEqual(words(fifteen), ['Front · 15 colours: +€7.00']);

  await setScreens(designVersionId, { front_full: 16 });
  const refused = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines: [line(designId)], shipTo });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /need 16 colours on Black, more than the 15 we can print\. Ask for fewer colours/);
});

test('positions at 9 and 15 colours add +€1.00 and +€7.00: each on its own count', async () => {
  const { lines } = await frontAndBack(9, 15);
  const only = (await lines()).lines[0];
  assert.deepEqual(words(only), ['Front · 9 colours: +€1.00', 'Back · 15 colours: +€7.00']);
  assert.deepEqual(only.extras?.map((e) => e.cents), [100, 700]);
  assert.equal(only.screens?.surchargeCentsPerPiece, 800);
  assert.equal(only.unitCents, GARMENT + 2 * PRINT + 800);
});

test('a position over 15 colours refuses the run, the other position fine, and the refusal names which one', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT, BACK]);

  await setScreens(designVersionId, { front_full: 6, back: 16 });
  const back = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines: [line(designId, { extraPlacements: [BACK_CM] })], shipTo });
  assert.equal(back.ok, false);
  if (!back.ok) assert.match(back.error, /need 16 colours on Black \(back\), more than the 15 we can print/);

  await setScreens(designVersionId, { front_full: 17, back: 6 });
  const front = await bulk.createBulkQuote({ storeId: h.artist.storeId, lines: [line(designId, { extraPlacements: [BACK_CM] })], shipTo });
  assert.equal(front.ok, false);
  if (!front.ok) assert.match(front.error, /need 17 colours on Black \(front full\), more than the 15 we can print/);

  // both at the cap are fine: 15 is printable
  await setScreens(designVersionId, { front_full: 15, back: 15 });
  const capped = await quote([line(designId, { extraPlacements: [BACK_CM] })]);
  assert.equal(capped.lines[0].screens?.surchargeCentsPerPiece, 1400);
});

test("each position counts on its own design: a back in other artwork has its own colours, and its own surcharge", async () => {
  const front = await preparedAt([FRONT]);
  const back = await preparedAt([BACK]);
  await setScreens(front.designVersionId, { front_full: 10 });
  await setScreens(back.designVersionId, { back: 6 });

  const run = await quote([line(front.designId, { extraPlacements: [{ ...BACK_CM, designId: back.designId }] })]);
  const only = run.lines[0];
  assert.deepEqual(words(only), ['Front · 10 colours: +€2.00', 'Back · 6 colours: no surcharge']);
  assert.equal(only.unitCents, GARMENT + 2 * PRINT + 200);
  assert.deepEqual(only.screens?.placements.map((p) => p.designId), [front.designId, back.designId], 'each position records its own design');

  // the back's artwork at 12: its own +4, the front's +2 unchanged
  await setScreens(back.designVersionId, { back: 12 });
  const more = (await quote([line(front.designId, { extraPlacements: [{ ...BACK_CM, designId: back.designId }] })])).lines[0];
  assert.deepEqual(words(more), ['Front · 10 colours: +€2.00', 'Back · 12 colours: +€4.00']);
  assert.equal(more.unitCents, GARMENT + 2 * PRINT + 600);
});

test('the surcharge is never discounted at the second-position rate, nor marked up by the margin', async () => {
  await pricing.setScreenPriceTable(h.owner, { ...TABLE, additionalPlacementPercent: 50, marginPercent: 20 });
  try {
    const { designVersionId, lines } = await frontAndBack(10, 10);
    const both = (await lines()).lines[0];
    await setScreens(designVersionId, { front_full: 8, back: 8 });
    const plain = (await lines()).lines[0];
    assert.equal(both.unitCents - plain.unitCents, 400, 'the surcharge is the same 4 euros whatever the margin and the second-position rate');
    // and the print itself still follows them: the second position at half price, the margin on both
    const print = PRINT + Math.round(PRINT * 0.5);
    assert.equal(plain.unitCents, GARMENT + print + Math.round(0.2 * (GARMENT + print)));
  } finally {
    await pricing.setScreenPriceTable(h.owner, TABLE);
  }
});

test('the breakdown is saved with the quote: the same lines come back when the run is read again', async () => {
  const { lines } = await frontAndBack(10, 12);
  const run = await lines();
  const read = await bulk.getBulkOrder(h.artist.storeId, run.id);
  assert.deepEqual(read?.lines[0].extras, run.lines[0].extras);
  assert.deepEqual(words(read!.lines[0]), ['Front · 10 colours: +€2.00', 'Back · 12 colours: +€4.00']);
  assert.equal(read?.lines[0].screens?.summary, 'Front · 10 colours: +€2.00; Back · 12 colours: +€4.00 (+€6.00 per piece in all)');
});

// -- the estimate path: no print files yet, position by position -------------------------------------

test('a position with no print files yet is a guess on its own, marked as one; the other keeps its real count', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT]);
  await setScreens(designVersionId, { front_full: 10 });

  const run = await quote([line(designId, { extraPlacements: [BACK_CM] })]);
  const only = run.lines[0];
  assert.deepEqual(only.screens?.placements.map((p) => [p.position, p.screens, p.basis]), [['front_full', 10, 'pack'], ['back', 4, 'estimate']], '2 colours and both whites on a dark garment');
  assert.deepEqual(words(only), ['Front · 10 colours: +€2.00', 'Back · 4 colours (estimate): no surcharge']);
  assert.deepEqual(only.extras?.map((e) => e.estimate), [undefined, true]);
  assert.equal(only.screens?.basis, 'estimate');
  assert.match(only.screens?.note ?? '', /no print files for this design at this print position and size \(back\) yet, so its colour count is an estimate: 4 colours \(2 from the artwork, plus the white underbase and highlight white\)/);
  assert.doesNotMatch(only.screens?.note ?? '', /front/i, 'only the back is a guess');
  assert.equal(only.screens?.summary, 'Front · 10 colours: +€2.00; Back · 4 colours (estimate): no surcharge (+€2.00 per piece in all)');
  // the guess is priced at its own tier (4 screens: 6.00 at the 25 break), the real count at its own (9.00), and only the real count carries the surcharge
  assert.equal(only.unitCents, GARMENT + PRINT + 600 + 200);
});

test('a guess never carries the surcharge, and a light garment guesses fewer screens', async () => {
  const { designId } = await h.newDesign();
  const dark = (await quote([line(designId, { extraPlacements: [BACK_CM] })])).lines[0];
  assert.deepEqual(dark.screens?.placements.map((p) => [p.screens, p.basis, p.surchargeCents]), [[4, 'estimate', 0], [4, 'estimate', 0]]);
  assert.deepEqual(words(dark), ['Front · 4 colours (estimate): no surcharge', 'Back · 4 colours (estimate): no surcharge']);
  const light = (await quote([line(designId, { colourCode: white.code, extraPlacements: [BACK_CM] })])).lines[0];
  assert.deepEqual(light.screens?.placements.map((p) => p.screens), [2, 2]);
  assert.match(light.screens?.note ?? '', /estimate: 2 colours\./, 'no whites to count on a light garment');
});

test('the proof prices every position again: a guess becomes the real count, position by position', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT]);
  await setScreens(designVersionId, { front_full: 10 });
  const run = await quote([line(designId, { extraPlacements: [BACK_CM] })]);
  assert.equal(run.lines[0].unitCents, GARMENT + PRINT + 600 + 200);

  // the back's print files are made before the proof is sent: 10 colours there too
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [BACK] });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);
  await setScreens(designVersionId, { back: 10 });

  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  const again = (await bulk.getBulkOrder(h.artist.storeId, run.id))!;
  assert.deepEqual(words(again.lines[0]), ['Front · 10 colours: +€2.00', 'Back · 10 colours: +€2.00']);
  assert.equal(again.lines[0].screens?.basis, 'pack');
  assert.equal(again.lines[0].unitCents, GARMENT + 2 * PRINT + 400);
  const row = proof.value.spec.find((r) => /^Colours · .* · Black$/.test(r.label));
  assert.equal(row?.value, 'Front · 10 colours: +€2.00; Back · 10 colours: +€2.00 (+€4.00 per piece in all)');
});

test("the proof prices each position on its own design again, not on the line's", async () => {
  const front = await preparedAt([FRONT]);
  const back = await preparedAt([BACK]);
  await setScreens(front.designVersionId, { front_full: 10 });
  await setScreens(back.designVersionId, { back: 12 });
  const run = await quote([line(front.designId, { extraPlacements: [{ ...BACK_CM, designId: back.designId }] })]);
  assert.equal(run.lines[0].unitCents, GARMENT + 2 * PRINT + 200 + 400);

  // the back's artwork needs 14 colours when the proof is sent: only the back moves, by its own 2 euros
  await setScreens(back.designVersionId, { back: 14 });
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  const again = (await bulk.getBulkOrder(h.artist.storeId, run.id))!;
  assert.deepEqual(words(again.lines[0]), ['Front · 10 colours: +€2.00', 'Back · 14 colours: +€6.00']);
  assert.equal(again.lines[0].unitCents, GARMENT + 2 * PRINT + 200 + 600);
  assert.deepEqual(again.lines[0].screens?.placements.map((p) => p.designId), [front.designId, back.designId]);
  assert.equal(again.totalCents, 30 * again.lines[0].unitCents + again.setupCents + again.shippingCents);
});

test('an approval is refused when one position\'s colours changed since the proof, and says which', async () => {
  const { designVersionId, lines } = await frontAndBack(10, 10);
  const run = await lines();
  const proof = await bulk.submitBulkProof(h.artist.storeId, run.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);

  await setScreens(designVersionId, { back: 12 });
  const refused = await bulk.approveBulkProof(h.artist.storeId, proof.value.id, h.artist.userId);
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.match(refused.error, /^The colours changed since this proof was sent/);
    assert.match(
      refused.error,
      /was Front · 10 colours: \+€2\.00; Back · 10 colours: \+€2\.00 \(\+€4\.00 per piece in all\), now Front · 10 colours: \+€2\.00; Back · 12 colours: \+€4\.00 \(\+€6\.00 per piece in all\)/,
    );
  }
  const now = (await bulk.getBulkOrder(h.artist.storeId, run.id))!;
  assert.equal(now.status, 'quoted');
  assert.equal(now.lines[0].unitCents, GARMENT + 2 * PRINT + 600);
});

// -- rule 2: DTG and DTF runs pay the shop's extras for more print positions ------------------------

const SLEEVES = [
  { position: 'sleeve_left', widthCm: 8 },
  { position: 'sleeve_right', widthCm: 8 },
];

test('a DTG or DTF run with one print position pays only its run price', async () => {
  for (const service of ['dtg', 'dtf']) {
    const only = (await quote([line(undefined, { printServiceCode: service })])).lines[0];
    assert.equal(only.unitCents, RUN_PRICE, service);
    assert.equal(only.extras, undefined, 'no extra, so no lines');
    assert.equal(only.screens, undefined);
  }
});

test('front and back on a DTG or DTF run is +€1.00 on top of its price', async () => {
  for (const service of ['dtg', 'dtf']) {
    const both = (await quote([line(undefined, { printServiceCode: service, extraPlacements: [{ position: 'back', widthCm: 30 }] })])).lines[0];
    assert.equal(both.unitCents, RUN_PRICE + 100, service);
    assert.equal(both.totalCents, 30 * (RUN_PRICE + 100));
    assert.deepEqual(both.extras, [{ key: 'second_main_print', label: 'Front and back', cents: 100 }]);
    assert.deepEqual(words(both), ['Front and back: +€1.00']);
  }
});

test('sleeve prints on a DTG or DTF run are +€2.00 ONCE, for one sleeve or both', async () => {
  for (const service of ['dtg', 'dtf']) {
    const one = (await quote([line(undefined, { printServiceCode: service, extraPlacements: [SLEEVES[0]] })])).lines[0];
    assert.equal(one.unitCents, RUN_PRICE + 200, service);
    assert.deepEqual(words(one), ['Sleeve prints: +€2.00']);

    const both = (await quote([line(undefined, { printServiceCode: service, extraPlacements: SLEEVES })])).lines[0];
    assert.equal(both.unitCents, RUN_PRICE + 200, `both sleeves cost what one does (${service})`);
    assert.deepEqual(both.extras, [{ key: 'sleeves', label: 'Sleeve prints', cents: 200 }]);
  }
});

test('front, back and sleeves on a run are the +€1.00 and the +€2.00: €3.00 in all, one line each', async () => {
  const all = (await quote([line(undefined, { printServiceCode: 'dtg', extraPlacements: [{ position: 'back', widthCm: 30 }, ...SLEEVES] })])).lines[0];
  assert.equal(all.unitCents, RUN_PRICE + 300);
  assert.deepEqual(words(all), ['Front and back: +€1.00', 'Sleeve prints: +€2.00']);
  assert.deepEqual(all.extras?.map((e) => e.key), ['second_main_print', 'sleeves']);
});

test("a DTG/DTF run uses the shop's extras as the owner saved them, not numbers of its own", async () => {
  const saved = await pricing.setPodPrices(h.owner, { extras: { secondMainPrintCents: 150, sleevesCents: 350 } });
  assert.ok(saved.ok, saved.ok ? '' : saved.error);
  try {
    const all = (await quote([line(undefined, { printServiceCode: 'dtf', extraPlacements: [{ position: 'back', widthCm: 30 }, SLEEVES[0]] })])).lines[0];
    assert.equal(all.unitCents, RUN_PRICE + 150 + 350);
    assert.deepEqual(words(all), ['Front and back: +€1.50', 'Sleeve prints: +€3.50']);
  } finally {
    await h.db.delete(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'));
  }
});

test('embroidery is as it was: more print positions add nothing', async () => {
  const one = (await quote([line(undefined, { printServiceCode: 'embroidery' })])).lines[0];
  const more = (await quote([line(undefined, { printServiceCode: 'embroidery', extraPlacements: [{ position: 'back', widthCm: 30 }, SLEEVES[0]] })])).lines[0];
  assert.equal(more.unitCents, one.unitCents);
  assert.equal(more.extras, undefined);
  assert.deepEqual(await quotes.quoteRunExtras('embroidery', [{ position: 'front_chest' }, { position: 'back' }]), []);
});

test('a DTG/DTF line keeps its extras through the proof, and the proof says what they are', async () => {
  const mixed = await quote([
    line(undefined, { printServiceCode: 'dtf', extraPlacements: [{ position: 'back', widthCm: 30 }, SLEEVES[0]] }),
    line(undefined, { printServiceCode: 'screen_2c', colourCode: white.code }),
  ]);
  const before = mixed.lines[0];
  const proof = await bulk.submitBulkProof(h.artist.storeId, mixed.id);
  assert.ok(proof.ok, proof.ok ? '' : proof.error);
  const after = (await bulk.getBulkOrder(h.artist.storeId, mixed.id))!;
  assert.deepEqual(after.lines[0].extras, before.extras);
  assert.equal(after.lines[0].unitCents, before.unitCents);
  const row = proof.value.spec.find((r) => /^Print areas · .* · Black$/.test(r.label));
  assert.equal(row?.value, 'Front and back: +€1.00; Sleeve prints: +€2.00 (+€3.00 per piece in all)');
  assert.ok(proof.value.spec.some((r) => /^Colours · .* · White$/.test(r.label)), 'the screen-printed line has its own row');
});

// -- shop products are unchanged -----------------------------------------------------------------

test('shop products: +€1 front and back, +€2 once for sleeves, and the colours of the artwork never matter', async () => {
  const { designVersionId } = await preparedAt([FRONT, BACK]);
  const { podPrice } = await import('@/lib/pricing/pod');
  const front = { position: 'front_full', widthCm: 38 };
  const back = { position: 'back', widthCm: 32 };
  const prices = async () => {
    const out: Record<string, { total: number; keys: string[] }> = {};
    for (const [name, placements] of Object.entries({ front: [front], both: [front, back], sleeves: [front, SLEEVES[0], SLEEVES[1]], all: [front, back, ...SLEEVES] })) {
      const price = await podPrice(TEE, placements);
      assert.ok(price, name);
      out[name] = { total: price.totalCents, keys: price.lines.map((l) => l.key) };
    }
    return out;
  };

  const base = 650 + 600 + 375;
  const eight = await prices();
  assert.deepEqual(eight.front, { total: base, keys: ['base'] });
  assert.deepEqual(eight.both, { total: base + 100, keys: ['base', 'second_main_print'] });
  assert.deepEqual(eight.sleeves, { total: base + 200, keys: ['base', 'sleeves'] });
  assert.deepEqual(eight.all, { total: base + 300, keys: ['base', 'second_main_print', 'sleeves'] });

  // the same artwork at 15 colours on both positions: the shop price does not move, and has no colour line
  await setScreens(designVersionId, { front_full: 15, back: 15 });
  assert.deepEqual(await prices(), eight);
});

test('a shop quote is flat for every quantity, has no colour line, and is not offered for screen print', async () => {
  const placements = [{ position: 'front_full', widthCm: 38 }, { position: 'back', widthCm: 32 }];
  for (const qty of [1, 30, 200]) {
    const quote = await quotes.quoteFor({ blankCode: TEE, printServiceCode: 'dtg', qty, shop: { placements } });
    assert.equal(quote?.breakdown?.totalCents, 650 + 600 + 375 + 100, `qty ${qty}`);
    assert.equal(quote?.unitBaseCostCents, 650 + 600 + 375 + 100);
    assert.deepEqual(quote?.breakdown?.lines.map((l) => l.key), ['base', 'second_main_print']);
  }
  assert.equal(await quotes.quoteFor({ blankCode: TEE, printServiceCode: 'screen_2c', qty: 30, shop: { placements } }), null, 'screen print is for runs');
});

test('the run extras are for DTG and DTF runs with more than one position, and nothing else', async () => {
  const both = [{ position: 'front_chest' }, { position: 'back' }];
  assert.deepEqual((await quotes.quoteRunExtras('dtg', both)).map((l) => l.cents), [100]);
  assert.deepEqual((await quotes.quoteRunExtras('dtf', both)).map((l) => l.cents), [100]);
  assert.deepEqual(await quotes.quoteRunExtras('dtg', [{ position: 'front_chest' }]), [], 'one position');
  assert.deepEqual(await quotes.quoteRunExtras('dtg', [{ position: 'sleeve_left' }]), [], 'one position, even a sleeve');
  assert.deepEqual(await quotes.quoteRunExtras('screen_2c', both), [], 'screen print counts colours instead');
});

// -- the quote tool explains it, position by position ---------------------------------------------------

async function toolQuote(lines: ReturnType<typeof line>[]) {
  const result = await tools.createBulkQuoteTool.run(ctx, { lines, shipTo } as never);
  assert.equal(result.data.ok, true, result.data.error);
  return result;
}

type Notice = { kind: string; tone: string; text: string };
const notices = (result: Awaited<ReturnType<typeof toolQuote>>) => (result.ui?.cards ?? []).filter((c) => c.kind === 'notice') as unknown as Notice[];

test('the tool gives the model each position with its colours, its surcharge and its own design', async () => {
  const front = await preparedAt([FRONT]);
  const back = await preparedAt([BACK]);
  await setScreens(front.designVersionId, { front_full: 10 });
  await setScreens(back.designVersionId, { back: 12 });

  const result = await toolQuote([line(front.designId, { extraPlacements: [{ ...BACK_CM, designId: back.designId }] })]);
  const [fact] = result.data.screenPrint ?? [];
  assert.equal(fact.surchargeCentsPerPiece, 600);
  assert.equal(fact.screens, 12, 'the most on any position');
  assert.equal(fact.effect, 'Front · 10 colours: +€2.00; Back · 12 colours: +€4.00 (+€6.00 per piece in all)');
  assert.deepEqual(
    fact.positions.map((p) => [p.position, p.line, p.designId, p.colours, p.surchargeCentsPerPiece, p.estimate]),
    [
      ['Front', 'Front · 10 colours: +€2.00', front.designId, 10, 200, false],
      ['Back', 'Back · 12 colours: +€4.00', back.designId, 12, 400, false],
    ],
  );
  assert.deepEqual(fact.positions.map((p) => p.fewerScreens), [{ screens: 8, savesCentsPerPiece: 200 }, { screens: 8, savesCentsPerPiece: 400 }]);
  assert.match(result.data.screenRule ?? '', /each colour above 8 adds €1 per piece on each print position/);

  // the notice reads position by position and adds them up
  const [notice] = notices(result);
  assert.equal(notice.tone, 'warning');
  assert.match(notice.text, /Front · 10 colours: \+€2\.00; Back · 12 colours: \+€4\.00\. That is €6\.00 more for each piece/);
  assert.match(notice.text, /With 8 colours or fewer on a position there is no surcharge there/);
  assert.doesNotMatch(notice.text, /pack|separation|plate|psd|pantone|change_screen_count/i);

  // one offer for each design, each naming the position it prints: each position's own design is what the assistant changes
  const offers = (result.ui?.next ?? []).filter((c) => /^Use 8 colours/.test(c.label));
  assert.deepEqual(offers.map((c) => c.label), ['Use 8 colours on the front', 'Use 8 colours on the back']);
  assert.match(offers[1].prompt ?? '', /^Use 8 colours on the back for Run \d+, then quote it again$/);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Use 8 colours on the front', 'Use 8 colours on the back', 'Change the address']);
});

test('positions that print the same design change together: one offer names them both', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT, BACK]);
  await setScreens(designVersionId, { front_full: 10, back: 10 });
  const result = await toolQuote([line(designId, { extraPlacements: [BACK_CM] })]);
  const [fact] = result.data.screenPrint ?? [];
  assert.deepEqual(fact.positions.map((p) => p.designId), [designId, designId]);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Use 8 colours on the front and the back', 'Change the address']);
  assert.match(notices(result)[0].text, /Front · 10 colours: \+€2\.00; Back · 10 colours: \+€2\.00\. That is €4\.00 more for each piece/);
});

test('a position at 8 or fewer gets no offer, and a quote with no surcharge says nothing alarming', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT, BACK]);
  await setScreens(designVersionId, { front_full: 8, back: 6 });
  const result = await toolQuote([line(designId, { extraPlacements: [BACK_CM] })]);
  assert.deepEqual((result.ui?.cards ?? []).map((c) => c.kind), ['bulk_quote']);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Change the address']);
  const [fact] = result.data.screenPrint ?? [];
  assert.equal(fact.fewerScreens, undefined);
  assert.deepEqual(fact.positions.map((p) => p.fewerScreens), [undefined, undefined]);

  // only the back over 8: the offer is for the back alone
  await setScreens(designVersionId, { front_full: 8, back: 9 });
  const more = await toolQuote([line(designId, { extraPlacements: [BACK_CM] })]);
  assert.deepEqual((more.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Use 8 colours on the back', 'Change the address']);
});

test('a guess is marked on its position and the tool offers to prepare the print files', async () => {
  const { designId, designVersionId } = await preparedAt([FRONT]);
  await setScreens(designVersionId, { front_full: 10 });
  const result = await toolQuote([line(designId, { extraPlacements: [BACK_CM] })]);
  const [fact] = result.data.screenPrint ?? [];
  assert.deepEqual(fact.positions.map((p) => [p.position, p.estimate]), [['Front', false], ['Back', true]]);
  assert.equal(fact.positions[1].line, 'Back · 4 colours (estimate): no surcharge');
  assert.equal(result.data.estimate, true);
  assert.ok(notices(result).some((n) => n.tone === 'info' && /\(back\) yet, so its colour count is an estimate/.test(n.text)));
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Use 8 colours on the front', 'Prepare the print files', 'Change the address']);
});

test('a DTG/DTF run with more positions: the tool lists the extras and a notice explains them', async () => {
  const result = await toolQuote([line(undefined, { printServiceCode: 'dtg', extraPlacements: [{ position: 'back', widthCm: 30 }, ...SLEEVES] })]);
  assert.equal(result.data.screenPrint, undefined, 'no screens on a DTG run');
  assert.deepEqual(result.data.printAreas, [{ line: 'Classic tee · Black', extras: ['Front and back: +€1.00', 'Sleeve prints: +€2.00'], extraCentsPerPiece: 300 }]);
  const [notice] = notices(result);
  assert.equal(notice.tone, 'info');
  assert.match(notice.text, /Front and back: \+€1\.00; Sleeve prints: \+€2\.00 \(\+€3\.00 per piece in all\)\. DTG and DTF runs pay the same extras as shop products for more print positions\./);
  assert.deepEqual((result.ui?.next ?? []).map((c) => c.label), ['Send the proof', 'Change the address'], 'nothing to offer: no screens');

  // one position: nothing to explain
  const one = await toolQuote([line(undefined, { printServiceCode: 'dtg' })]);
  assert.equal(one.data.printAreas, undefined);
  assert.deepEqual((one.ui?.cards ?? []).map((c) => c.kind), ['bulk_quote']);
});

test('a line can ask for more print positions: extraPlacements, at most three, each position once', async () => {
  const parse = (extraPlacements: unknown) => tools.createBulkQuoteTool.input.safeParse({ lines: [{ ...line(undefined, { printServiceCode: 'dtf' }), extraPlacements }], shipTo });
  assert.equal(parse([{ position: 'back', widthCm: 30 }]).success, true);
  assert.equal(parse([{ position: 'back', widthCm: 30, designId: randomUUID() }, ...SLEEVES]).success, true);
  assert.equal(parse([{ position: 'back', widthCm: 30 }, ...SLEEVES, { position: 'front_left_chest', widthCm: 8 }]).success, false, 'four more is too many');
  assert.equal(parse([{ position: 'back', widthCm: 30, designId: 'not-an-id' }]).success, false);

  // and the quote prices them: a DTF run with a back is the run price and the shop's extra
  const result = await toolQuote([line(undefined, { printServiceCode: 'dtf', extraPlacements: [{ position: 'back', widthCm: 30 }] })]);
  // 30 pieces at the run price and the extra, and the run's flat shipping (450 for each 20 pieces)
  assert.equal(result.data.totalCents, 30 * (RUN_PRICE + 100) + 450 * Math.ceil(30 / 20) + (result.data.setupCents ?? 0));
});

test('what the tool says stays in the artist\'s words: colours, no codes', async () => {
  const text = [tools.createBulkQuoteTool.description, tools.getBulkOrderTool.description].join(' ');
  assert.match(text, /counted separately for each print position on its own design/);
  assert.match(text, /a back of 10 and a front of 10 add €2 \+ €2 = €4 per piece/);
  assert.match(text, /pays the shop.s extras for them on top of its price: \+€1 front and back, \+€2 once for sleeve prints/);
  assert.match(text, /printAreas/);
  assert.doesNotMatch(text, /pantone/i);
});
