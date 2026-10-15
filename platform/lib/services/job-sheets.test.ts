// The job sheet, one per design: what it collects (every garment that uses the design, the files to
// use, the screen sets, the pieces waiting in open orders, the audit sign-off), when it is made again
// (only when what it says changes), and who may open it. On PGlite with fakes for the engine, the pack
// writers (except where the real renderer is wanted), storage and queue; nothing here touches Neon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import * as schema from '@db/schema';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import { COLLAR_DISTANCE_UNSET_NOTE, PLACEMENTS } from '@/lib/mockups/placements';
import { isValidKey } from '@/lib/services/print-storage';
import type { ToolContext } from '@/lib/tools/types';
import type { PackFile } from '@/lib/print/types';
import { pdfLines, shows } from '@/lib/print/pack/test-pdf';
import { bootstrapPrint, seedRun, seedShopOrder, type Harness, type TestDb } from '@/lib/print/test-support';

let h: Harness;
let jobSheets: typeof import('@/lib/services/job-sheets');
let owner: Actor;

before(async () => {
  h = await bootstrapPrint();
  jobSheets = await import('@/lib/services/job-sheets');
  owner = h.owner;
  // A second blank (a hoodie), for a design on more than one garment.
  await h.db.insert(schema.blanks).values({ code: 'STSU177', name: 'Heavy hoodie', type: 'Hoodies' });
  await h.db.insert(schema.blankColours).values([
    { blankCode: 'STSU177', colourCode: 'C002' },
    { blankCode: 'STSU177', colourCode: 'C727' },
  ]);
});

after(async () => {
  await h.close();
});

// -- helpers -------------------------------------------------------------------------------

const TEE = 'Classic tee';
const ref = (orderId: string) => `ORD-${orderId.slice(0, 8).toUpperCase()}`;

/** 'Run 3': a run is named by its place among the shop's runs, and every test here adds some. */
async function runLabelOf(bulkOrderId: string): Promise<string> {
  const { runNumberFor } = await import('@/lib/services/runs');
  return `Run ${await runNumberFor(bulkOrderId)}`;
}

/** A design prepared for the default drop (darks and lights screen sets, one DTG/DTF pack) whose product is on sale. */
async function liveDesign(opts: { colours?: string[] } = {}) {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  await h.db.update(schema.products).set({ status: 'live' }).where(eq(schema.products.id, productId));
  await setColours(productId, opts.colours ?? ['C002', 'C727', 'C001']);
  const packs = await h.packs(designVersionId);
  return {
    designId,
    productId,
    designVersionId,
    darks: packs.find((p) => p.screenSetKey === 'darks')!,
    lights: packs.find((p) => p.screenSetKey === 'lights')!,
    dtg: packs.find((p) => p.technique === 'dtg_dtf')!,
  };
}

async function setColours(productId: string, codes: string[]): Promise<void> {
  await h.db.delete(schema.productColours).where(eq(schema.productColours.productId, productId));
  await h.db.insert(schema.productColours).values(codes.map((colourCode) => ({ productId, colourCode })));
}

/** A paid order with exactly these items, in the production stage given. */
async function seedOrder(
  db: TestDb,
  input: { productionStatus?: 'queued' | 'printing' | 'packed' | 'shipped' | 'delivered'; status?: 'paid' | 'pending'; items: { productId: string; colourCode: string; size: string; qty: number }[] },
): Promise<string> {
  const [order] = await db
    .insert(schema.orders)
    .values({ storeId: h.artist.storeId, orderType: 'pod', status: input.status ?? 'paid', totalAmount: 2500, productionStatus: input.productionStatus ?? 'queued', fanEmail: 'fan@merchfrom.test' })
    .returning({ id: schema.orders.id });
  await db.insert(schema.orderItems).values(input.items.map((i) => ({ orderId: order.id, productId: i.productId, quantity: i.qty, priceAtPurchase: 2500, colourCode: i.colourCode, size: i.size })));
  return order.id;
}

async function collect(designId: string) {
  const collected = await jobSheets.collectJobSheet(designId);
  assert.ok(collected, 'the design has a sheet');
  return collected;
}

const rowOf = (rows: Awaited<ReturnType<typeof collect>>['source']['garments'], colour: string, method: string, blank = TEE) =>
  rows.find((g) => g.blankName === blank && g.colourCode === colour && g.methodLabel === method);

const sheetObjects = (designId: string) => h.fakes.storage.keys(`job-sheets/${designId}/`);

const fileOf = (files: PackFile[], kind: PackFile['kind'], garmentCode?: string) => files.find((f) => f.kind === kind && (garmentCode === undefined || f.garmentCode === garmentCode))!.name;

// -- the garments table ----------------------------------------------------------------------

test('one sheet covers every shop product and run line: several blanks and colours, DTG/DTF and screen together, each with its file', async () => {
  const { designId, productId, darks, lights, dtg } = await liveDesign();
  // A hoodie on sale too (moved 8 cm lower than the standard position), and a shop product that is only a draft.
  await h.db.insert(schema.products).values({
    storeId: h.artist.storeId,
    designId,
    blankCode: 'STSU177',
    printServiceCode: 'dtg',
    name: 'Underwriter hoodie',
    placement: { position: 'front_chest', widthCm: 32, offsetYcm: 8 },
    status: 'live',
  });
  const [hoodie] = await h.db.select().from(schema.products).where(and(eq(schema.products.designId, designId), eq(schema.products.blankCode, 'STSU177')));
  await setColours(hoodie.id, ['C002']);
  const draft = await h.db.insert(schema.products).values({ storeId: h.artist.storeId, designId, blankCode: 'STTU169', printServiceCode: 'dtg', name: 'Draft tee', placement: { position: 'front_chest', widthCm: 28 } }).returning({ id: schema.products.id });
  await setColours(draft[0].id, ['C002']);

  // A paid run: black and white by screen, French Navy by DTG/DTF.
  const run = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [
      { colourCode: 'C002', qty: 60, printServiceCode: 'screen_2c' },
      { colourCode: 'C001', qty: 20, printServiceCode: 'screen_2c' },
      { colourCode: 'C727', qty: 10, printServiceCode: 'dtg' },
    ],
  });

  const { source } = await collect(designId);
  const rows = source.garments;
  const dtgFiles = dtg.files as PackFile[];
  // No standard collar distance is set yet, so a placement says "Standard position", and how far a product moved it.
  const placement = 'Front chest · 28 cm wide · Standard position';

  // The shop product prints DTG/DTF in all three colours, with the colour's PNG; a draft is not on the sheet.
  for (const code of ['C002', 'C727', 'C001']) {
    const row = rowOf(rows, code, 'DTG/DTF')!;
    assert.ok(row, `${code} on DTG/DTF`);
    assert.equal(row.file, fileOf(dtgFiles, 'dtg_png', code));
    assert.equal(row.placement, placement);
    assert.equal(row.method, 'dtg_dtf');
    assert.equal(row.blankCode, 'STTU169');
  }
  assert.deepEqual(rowOf(rows, 'C002', 'DTG/DTF')!.usedBy, ['Shop · Underwriter tee']);
  assert.ok(!rows.some((g) => g.usedBy.some((u) => u.includes('Draft tee'))), 'a draft product is not on the sheet');
  assert.ok(!rows.some((g) => g.usedBy.some((u) => u.includes('Bulk run'))), 'a run’s backing product is not a shop product');

  // The run line that prints DTG/DTF on a colour the shop product also prints shares its row.
  const runLabel = await runLabelOf(run.bulkOrderId);
  assert.deepEqual(rowOf(rows, 'C727', 'DTG/DTF')!.usedBy, [runLabel, 'Shop · Underwriter tee']);

  // Screen: black in the darks set, white in the lights set, each with its set's PSD.
  const black = rowOf(rows, 'C002', 'Screen · Darks')!;
  assert.deepEqual([black.method, black.setName, black.file, black.usedBy], ['screen', 'Darks', fileOf(darks.files as PackFile[], 'screen_psd'), [runLabel]]);
  const white = rowOf(rows, 'C001', 'Screen · Lights')!;
  assert.deepEqual([white.setName, white.file], ['Lights', fileOf(lights.files as PackFile[], 'screen_psd')]);
  assert.ok(!rowOf(rows, 'C727', 'Screen · Darks'), 'French Navy is not printed by screen in this run');

  // A second garment with no print file yet says so, and says how far its print was moved from the standard position.
  const hood = rowOf(rows, 'C002', 'DTG/DTF', 'Heavy hoodie')!;
  assert.deepEqual([hood.blankCode, hood.placement, hood.file, hood.note, hood.usedBy], ['STSU177', 'Front chest · 32 cm wide · Standard position, 8 cm lower', null, 'No print file yet', ['Shop · Underwriter hoodie']]);
  assert.deepEqual(source.placementNotes, [COLLAR_DISTANCE_UNSET_NOTE], 'and the sheet says why it gives no distance below the collar');

  // No product other than the shop's and the run's, no duplicates.
  assert.equal(rows.length, 3 + 2 + 1, 'three DTG/DTF colours, two screen colours and the hoodie');
  assert.ok(productId);
});

test('a shop product with a method that makes no print file (embroidery) is listed, without a file', async () => {
  const { designId, productId } = await liveDesign({ colours: ['C002'] });
  await h.db.update(schema.products).set({ printServiceCode: 'embroidery' }).where(eq(schema.products.id, productId));
  const { source } = await collect(designId);
  const row = source.garments.find((g) => g.colourCode === 'C002')!;
  assert.deepEqual([row.method, row.methodLabel, row.file], ['none', 'Embroidery', null]);
  assert.equal(row.note, 'No print file is made for this method.');
});

test('a colour with nothing to print on it is listed as a screen row that says so', async () => {
  h.fakes.engine.options.nothingPrintsOnDarks = true;
  let designId: string;
  try {
    ({ designId } = await liveDesign());
  } finally {
    h.fakes.engine.options.nothingPrintsOnDarks = false;
  }
  await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 5, printServiceCode: 'screen_2c' }] });
  const { source } = await collect(designId);
  const row = rowOf(source.garments, 'C002', 'Screen · Darks')!;
  assert.deepEqual([row.file, row.note], [null, 'Nothing prints on this colour.']);
  const empty = source.screenSets.find((s) => s.setName === 'Darks')!;
  assert.deepEqual([empty.inks.length, empty.file], [0, null]);
  assert.match(empty.note ?? '', /nothing prints on Black, French Navy/);
});

test('a design nothing is prepared for has a sheet that says so, with its garments marked as having no file yet', async () => {
  const { designId, productId } = await h.newDesign();
  await h.db.update(schema.products).set({ status: 'live' }).where(eq(schema.products.id, productId));
  await setColours(productId, ['C002']);
  const { source, filename } = await collect(designId);
  assert.equal(source.design.versionNumber, null);
  assert.equal(source.design.approvedAt, null);
  assert.equal(source.design.code, `MF-${designId.replace(/-/g, '').slice(0, 6).toUpperCase()}`);
  assert.equal(source.packStatus, 'No print files yet');
  assert.deepEqual([source.screenSets, source.dtgPacks, source.proofs, source.checks, source.audits], [[], [], [], [], []]);
  assert.deepEqual(source.garments.map((g) => [g.colourCode, g.file, g.note, g.placement]), [['C002', null, 'No print file yet', 'Front chest · 28 cm wide · Standard position']]);
  assert.match(filename, /^MF-[0-9A-F]{6}-job-sheet\.pdf$/);

  // A design that does not exist has no sheet.
  assert.equal(await jobSheets.collectJobSheet('3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44'), null);
  assert.equal(await jobSheets.collectJobSheet('not-an-id'), null);
});

test('a placement says how far below the collar it is once the standard collar distance is set, and only "Standard position" until then', async () => {
  const { designId } = await liveDesign({ colours: ['C002'] });
  // A second tee product with its print moved 2 cm lower than standard (no pack for it: only its wording is looked at).
  const lower = await h.db
    .insert(schema.products)
    .values({ storeId: h.artist.storeId, designId, blankCode: 'STTU169', printServiceCode: 'dtg', name: 'Lower tee', placement: { position: 'front_chest', widthCm: 28, offsetYcm: 2 }, status: 'live' })
    .returning({ id: schema.products.id });
  await setColours(lower[0].id, ['C002']);
  const placements = (source: Awaited<ReturnType<typeof collect>>['source']) => source.garments.filter((g) => g.method === 'dtg_dtf').map((g) => [g.usedBy[0], g.placement]);

  // Not measured: the standard position, and the offset when there is one, with the note that says why.
  const unset = await collect(designId);
  assert.deepEqual(placements(unset.source), [
    ['Shop · Underwriter tee', 'Front chest · 28 cm wide · Standard position'],
    ['Shop · Lower tee', 'Front chest · 28 cm wide · Standard position, 2 cm lower'],
  ]);
  assert.deepEqual(unset.source.placementNotes, [COLLAR_DISTANCE_UNSET_NOTE]);
  assert.deepEqual([unset.source.screenSets[0].placement, unset.source.dtgPacks[0].placement], Array(2).fill('Front chest · 28 cm wide · Standard position'));

  // Measured on a real garment (a fixture value, set for this test only): the real distance, standard plus offset.
  const area = PLACEMENTS['T-shirts'].positions.front_chest!;
  area.collarDistanceCm = 6.5;
  try {
    const measured = await collect(designId);
    assert.deepEqual(placements(measured.source), [
      ['Shop · Underwriter tee', 'Front chest · 28 cm wide · 6.5 cm below the collar'],
      ['Shop · Lower tee', 'Front chest · 28 cm wide · 8.5 cm below the collar'],
    ]);
    assert.deepEqual(measured.source.placementNotes, [], 'nothing to explain once every distance is known');
    assert.deepEqual([measured.source.screenSets[0].placement, measured.source.dtgPacks[0].placement], Array(2).fill('Front chest · 28 cm wide · 6.5 cm below the collar'));
    assert.notEqual(measured.contentHash, unset.contentHash, 'a sheet made before the distance was set is not the one made after');
  } finally {
    delete area.collarDistanceCm;
  }
  // Unset again: back to the first sheet, found by its hash.
  assert.equal((await collect(designId)).contentHash, unset.contentHash);
});

// -- what else is on the sheet ----------------------------------------------------------------

test('the sheet carries the screen sets, the DTG/DTF files, the proofs, the checks and the audit state of the design’s packs', async () => {
  await h.db.delete(schema.pantoneLibrary);
  const { designId, darks, dtg } = await liveDesign();
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
  const { source, filename } = await collect(designId);

  assert.deepEqual([source.design.code, source.design.name, source.design.versionNumber, source.design.shopName], ['MF-UNDERWRITER-TEE', 'Underwriter tee', 1, 'artist']);
  assert.equal(filename, 'MF-UNDERWRITER-TEE-v1-job-sheet.pdf');
  assert.equal(source.packStatus, '0 of 3 files approved by pre-press');

  // Screen sets in press order, with the pack's recipe and the ink system it was built with.
  assert.deepEqual(source.screenSets.map((s) => [s.setName, s.colours, s.inks.length, s.method]), [
    ['Darks', ['Black', 'French Navy'], 6, 'spot'],
    ['Lights', ['White'], 4, 'spot'],
  ]);
  const set = source.screenSets[0];
  assert.deepEqual(set.inks.map((i) => i.role), ['underbase', 'ink', 'ink', 'ink', 'ink', 'highlight']);
  assert.deepEqual([set.underbaseChokeMm, set.trapMm, set.system.pressHeads, set.system.underbase.flash.seconds], [0.2, 0.25, 8, 4]);
  assert.equal(set.file, fileOf(darks.files as PackFile[], 'screen_psd'));
  assert.ok(set.printSize?.endsWith('ppi'));
  assert.equal(set.placement, 'Front chest · 28 cm wide · Standard position');
  assert.equal(set.blankName, TEE);

  // The DTG/DTF files, a PNG per garment colour.
  assert.equal(source.dtgPacks.length, 1);
  assert.deepEqual(source.dtgPacks[0].files.map((f) => [f.colourCode, f.file]), ['C002', 'C727', 'C001'].map((c) => [c, fileOf(dtg.files as PackFile[], 'dtg_png', c)]));
  assert.equal(source.dtgPacks[0].fadeLpi, 45);

  // A proof per garment colour and technique, found by its hash; checks and audit per pack.
  assert.equal(source.proofs.length, 6);
  assert.deepEqual(source.proofs.filter((p) => p.label === 'DTG/DTF').map((p) => p.colourName), ['Black', 'French Navy', 'White']);
  assert.deepEqual([...new Set(source.proofs.map((p) => p.label))].sort(), ['DTG/DTF', 'Screen · Darks', 'Screen · Lights']);
  for (const proof of source.proofs) assert.ok(h.fakes.storage.objects.has(proof.key), proof.key);
  assert.deepEqual(source.checks.map((c) => c.label), [
    'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm',
    'Screen · Lights · Classic tee (STTU169) · Front chest · 28 cm',
    'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm',
  ]);
  assert.ok(source.checks.every((c) => c.checks.length > 0));
  assert.deepEqual(source.audits.map((a) => [a.state, a.by, a.at]), [['idle', null, null], ['idle', null, null], ['idle', null, null]]);

  // A code typed for a film shows on the sheet at once (the sheet reads the pack as it is), and approving shows who signed.
  const ink = (darks.manifest as { inks: { index: number; role: string }[] }).inks.find((i) => i.role === 'ink')!;
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: ink.index, code: '237 c' })).ok);
  assert.equal((await collect(designId)).source.screenSets[0].inks.find((i) => i.index === ink.index)!.pantone, 'PANTONE 237 C');
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  const signed = (await collect(designId)).source;
  const audit = signed.audits.find((a) => a.label.startsWith('DTG/DTF'))!;
  assert.deepEqual([audit.state, audit.by], ['approved', 'Pat Presser']);
  assert.ok(audit.at);
  assert.equal(signed.packStatus, '1 of 3 files approved by pre-press');
});

test('the sheet is for the version the artist approved, else the newest with files, and carries the approval date', async () => {
  const { designId, designVersionId } = await liveDesign();
  assert.equal((await collect(designId)).source.design.approvedAt, null, 'not approved: no date');

  assert.ok((await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId })).ok);
  const approved = (await collect(designId)).source.design;
  assert.equal(approved.versionNumber, 1);
  const [approval] = await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId));
  assert.equal(approved.approvedAt, approval.approvedAt.toISOString());

  // New artwork makes version 2 with files of its own; the sheet stays on the version the artist approved, which orders print from.
  h.fakes.setArt(designId, Buffer.from('a redrawn design'));
  const second = await h.prepare(designId);
  assert.notEqual(second.designVersionId, designVersionId);
  assert.equal((await collect(designId)).source.design.versionNumber, 1);

  // Once they approve version 2 the sheet moves to it.
  assert.ok((await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: second.designVersionId })).ok);
  const moved = (await collect(designId)).source.design;
  assert.equal(moved.versionNumber, 2);
  assert.notEqual(moved.approvedAt, approved.approvedAt);

  // A design never approved shows its newest version with files, and no date.
  const other = await h.newDesign();
  await h.prepare(other.designId);
  h.fakes.setArt(other.designId, Buffer.from('another redraw'));
  await h.prepare(other.designId);
  const unapproved = (await collect(other.designId)).source.design;
  assert.deepEqual([unapproved.versionNumber, unapproved.approvedAt], [2, null]);
});

// -- pieces waiting ------------------------------------------------------------------------

test('pieces waiting are added up by garment, colour and size from every open order: shop sales and runs, with their references', async () => {
  const { designId, productId } = await liveDesign({ colours: ['C002', 'C727'] });
  const hoodieRow = await h.db
    .insert(schema.products)
    .values({ storeId: h.artist.storeId, designId, blankCode: 'STSU177', printServiceCode: 'dtg', name: 'Underwriter hoodie', placement: { position: 'front_chest', widthCm: 32 }, status: 'live' })
    .returning({ id: schema.products.id });
  const hoodieId = hoodieRow[0].id;
  await setColours(hoodieId, ['C002']);

  // Two shop sales and a run of the design, all open; one is already printing.
  const sale1 = await seedOrder(h.db, { items: [{ productId, colourCode: 'C002', size: 'M', qty: 2 }, { productId, colourCode: 'C002', size: 'L', qty: 1 }, { productId, colourCode: 'C727', size: 'S', qty: 1 }] });
  const sale2 = await seedOrder(h.db, { productionStatus: 'printing', items: [{ productId, colourCode: 'C002', size: 'M', qty: 3 }, { productId: hoodieId, colourCode: 'C002', size: 'XL', qty: 1 }] });
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 60, printServiceCode: 'screen_2c' }, { colourCode: 'C727', qty: 10, printServiceCode: 'screen_2c' }] });

  // What is not open is not counted: packed, shipped, delivered, unpaid, and another design's order.
  await seedOrder(h.db, { productionStatus: 'packed', items: [{ productId, colourCode: 'C002', size: 'M', qty: 100 }] });
  await seedOrder(h.db, { productionStatus: 'shipped', items: [{ productId, colourCode: 'C002', size: 'M', qty: 100 }] });
  await seedOrder(h.db, { productionStatus: 'delivered', items: [{ productId, colourCode: 'C002', size: 'M', qty: 100 }] });
  await seedOrder(h.db, { status: 'pending', productionStatus: 'queued', items: [{ productId, colourCode: 'C002', size: 'M', qty: 100 }] });
  const elsewhere = await h.newDesign();
  await seedShopOrder(h.db, { storeId: h.artist.storeId, productId: elsewhere.productId, qty: 100 });

  const { source } = await collect(designId);
  const { pieces } = source;
  assert.equal(pieces.orders, 3, 'two shop sales and one run');
  assert.equal(pieces.total, 2 + 1 + 1 + 3 + 1 + 60 + 10);
  assert.deepEqual(pieces.sizes, ['S', 'M', 'L', 'XL'], 'small to large');

  const black = pieces.rows.find((r) => r.blankName === TEE && r.colourCode === 'C002')!;
  assert.deepEqual(black.sizes, { M: 2 + 3 + 60, L: 1 });
  assert.equal(black.total, 66);
  const runLabel = `${await runLabelOf(run.bulkOrderId)} · ${ref(run.orderId)}`;
  assert.deepEqual([...black.from].sort((a, b) => a.ref.localeCompare(b.ref)), [{ ref: ref(sale1), qty: 3 }, { ref: ref(sale2), qty: 3 }, { ref: runLabel, qty: 60 }].sort((a, b) => a.ref.localeCompare(b.ref)));
  const navy = pieces.rows.find((r) => r.blankName === TEE && r.colourCode === 'C727')!;
  assert.deepEqual([navy.sizes, navy.total], [{ S: 1, M: 10 }, 11]);
  assert.deepEqual([...navy.from].map((f) => f.ref).sort(), [ref(sale1), runLabel].sort());
  const hood = pieces.rows.find((r) => r.blankName === 'Heavy hoodie')!;
  assert.deepEqual([hood.colourCode, hood.sizes, hood.total, hood.from], ['C002', { XL: 1 }, 1, [{ ref: ref(sale2), qty: 1 }]]);
  assert.equal(pieces.rows.length, 3, 'a row per garment and colour');
});

test('an archived product with an open sale stays on the sheet for that sale; one with none does not', async () => {
  const { designId, productId } = await liveDesign({ colours: ['C002', 'C727'] });
  await seedOrder(h.db, { items: [{ productId, colourCode: 'C727', size: 'M', qty: 1 }] });
  await h.db.update(schema.products).set({ status: 'archived' }).where(eq(schema.products.id, productId));
  const archived = (await collect(designId)).source.garments;
  assert.deepEqual(archived.filter((g) => g.methodLabel === 'DTG/DTF').map((g) => g.colourCode), ['C727'], 'only the colour with an open sale');

  await h.db.update(schema.orders).set({ productionStatus: 'packed' }).where(eq(schema.orders.status, 'paid'));
  assert.deepEqual((await collect(designId)).source.garments, [], 'once packed, nothing asks for it');
  const empty = (await collect(designId)).source.pieces;
  assert.deepEqual([empty.rows, empty.total, empty.orders, empty.sizes], [[], 0, 0, []]);
});

// -- when the sheet is made again ----------------------------------------------------------

test('the PDF is made when a sheet is asked for, kept by the hash of what it says, and made again only when that changes', async () => {
  const { designId, productId, dtg } = await liveDesign({ colours: ['C002'] });
  const drawn = () => h.fakes.pack.sheets.length;
  const before = drawn();

  const first = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(first.cached, false);
  assert.equal(drawn(), before + 1);
  assert.match(first.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(first.filename, 'MF-UNDERWRITER-TEE-v1-job-sheet.pdf');
  assert.equal(sheetObjects(designId).length, 1);
  const key = jobSheets.jobSheetKey(designId, first.contentHash);
  assert.ok(isValidKey(key), 'a key print storage accepts');
  assert.deepEqual(sheetObjects(designId), [key]);
  assert.equal(h.fakes.storage.objects.get(key)!.visibility, 'private', 'a sheet carries Pantone codes');
  assert.equal(h.fakes.storage.objects.get(key)!.contentType, 'application/pdf');

  // Asked again with nothing changed: the stored PDF, drawn by nobody.
  const again = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(again.cached, true);
  assert.equal(drawn(), before + 1);
  assert.deepEqual([again.contentHash, again.bytes.equals(first.bytes)], [first.contentHash, true]);
  assert.equal(sheetObjects(designId).length, 1);

  // An order arrives: the pieces waiting change, so the sheet is made again.
  const sale = await seedOrder(h.db, { items: [{ productId, colourCode: 'C002', size: 'M', qty: 2 }] });
  const afterOrder = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(afterOrder.cached, false);
  assert.notEqual(afterOrder.contentHash, first.contentHash);
  assert.equal(drawn(), before + 2);
  assert.equal(h.fakes.pack.sheets.at(-1)!.pieces.total, 2);

  // The order changes (more pieces): again.
  await h.db.update(schema.orderItems).set({ quantity: 5 }).where(eq(schema.orderItems.orderId, sale));
  const afterChange = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(afterChange.cached, false);
  assert.equal(h.fakes.pack.sheets.at(-1)!.pieces.total, 5);
  assert.equal(drawn(), before + 3);

  // A garment is added to the product (a colour): again, with the new row.
  await setColours(productId, ['C002', 'C727']);
  const afterGarment = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(afterGarment.cached, false);
  assert.equal(drawn(), before + 4);
  assert.deepEqual(h.fakes.pack.sheets.at(-1)!.garments.map((g) => g.colourCode), ['C002', 'C727']);

  // A pack is signed off: again.
  const worker = await h.staff({ prepress: 'work' });
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  const afterAudit = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(afterAudit.cached, false);
  assert.equal(drawn(), before + 5);

  // The order is packed: its pieces are done, so the sheet changes.
  await h.db.update(schema.orders).set({ productionStatus: 'packed' }).where(eq(schema.orders.id, sale));
  const afterPacked = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.equal(afterPacked.cached, false);
  assert.equal(h.fakes.pack.sheets.at(-1)!.pieces.total, 0);
  assert.equal(drawn(), before + 6);

  // Something that is not on this design's sheet leaves it alone: another design's order, a draft product.
  const other = await h.newDesign();
  await seedShopOrder(h.db, { storeId: h.artist.storeId, productId: other.productId, qty: 9 });
  const untouched = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.deepEqual([untouched.cached, untouched.contentHash], [true, afterPacked.contentHash]);
  assert.equal(drawn(), before + 6);

  // Back to what it said before: that PDF is still there, so it is found, not drawn again.
  await h.db.update(schema.orders).set({ productionStatus: 'queued' }).where(eq(schema.orders.id, sale));
  await h.db.update(schema.orderItems).set({ quantity: 5 }).where(eq(schema.orderItems.orderId, sale));
  await setColours(productId, ['C002', 'C727']);
  const back = (await jobSheets.getDesignJobSheet(owner, designId))!;
  assert.deepEqual([back.cached, back.contentHash], [true, afterAudit.contentHash]);
  assert.equal(drawn(), before + 6);

  // Every version made lives under the design's folder, each named by its hash.
  assert.equal(sheetObjects(designId).length, 6);
});

test('the clock is not part of what a sheet says: collecting twice gives one hash', async () => {
  const { designId } = await liveDesign({ colours: ['C002'] });
  const a = await collect(designId);
  await new Promise((resolve) => setTimeout(resolve, 15));
  const b = await collect(designId);
  assert.equal(a.contentHash, b.contentHash);
  assert.deepEqual(a.source, b.source);
});

test('a cache that cannot be read or written never stops a sheet', async () => {
  const { designId } = await liveDesign({ colours: ['C002'] });
  const broken = {
    ...h.fakes.storage,
    statObject: async () => {
      throw new Error('storage is down');
    },
    putObject: async (input: Parameters<typeof h.fakes.storage.putObject>[0]) => {
      if (input.key.startsWith('job-sheets/')) throw new Error('storage is down');
      return h.fakes.storage.putObject(input);
    },
  };
  h.pipeline.overridePrintDeps({ ...h.fakes.deps, storage: broken });
  const errors: unknown[][] = [];
  const log = console.error;
  console.error = (...args: unknown[]) => void errors.push(args);
  try {
    const sheet = await jobSheets.getDesignJobSheet(owner, designId);
    assert.ok(sheet && !sheet.cached && sheet.bytes.length > 0);
    assert.ok(errors.length >= 2, 'both failures are logged');
  } finally {
    console.error = log;
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
  assert.deepEqual(sheetObjects(designId), []);
});

test('a proof that cannot be read leaves a gap, not a missing sheet', async () => {
  const { designId } = await liveDesign({ colours: ['C002'] });
  const { source } = await collect(designId);
  const gone = source.proofs[0].key;
  const flaky = {
    ...h.fakes.storage,
    getObject: async (key: string) => {
      if (key === gone) throw new Error('not there');
      return h.fakes.storage.getObject(key);
    },
  };
  h.pipeline.overridePrintDeps({ ...h.fakes.deps, storage: flaky });
  const log = console.error;
  console.error = () => undefined;
  try {
    const sheet = await jobSheets.getDesignJobSheet(owner, designId);
    assert.ok(sheet);
    assert.equal(h.fakes.pack.sheets.at(-1)!.proofs.length, source.proofs.length - 1);
  } finally {
    console.error = log;
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
});

// -- who may open it -------------------------------------------------------------------------

test('only Pre-press or Production View, or the owner, may open a sheet; nothing is read or drawn for anyone else', async () => {
  const { designId } = await liveDesign({ colours: ['C002'] });
  const drawnBefore = h.fakes.pack.sheets.length;
  const artist: Actor = { userId: h.artist.userId, role: 'artist' };
  const refused = [
    artist,
    await h.staff({}),
    await h.staff({ shop_orders: 'manage', runs: 'manage', support: 'manage' }),
    await h.staff({ prepress: 'manage' }, { suspended: true }),
    await h.staff({ production: 'work' }, { suspended: true }),
  ];
  for (const actor of refused) {
    await assert.rejects(jobSheets.getDesignJobSheet(actor, designId), (err) => err instanceof PermissionError, `${actor.role} ${JSON.stringify(actor.permissions)}`);
  }
  assert.equal(h.fakes.pack.sheets.length, drawnBefore, 'nothing was drawn for them');
  assert.deepEqual(sheetObjects(designId), [], 'and nothing stored');

  for (const actor of [owner, await h.staff({ prepress: 'view' }), await h.staff({ production: 'view' }), await h.staff({ prepress: 'work', production: 'manage' })]) {
    const sheet = await jobSheets.getDesignJobSheet(actor, designId);
    assert.ok(sheet && sheet.bytes.length > 0, JSON.stringify(actor.permissions));
  }
  assert.equal(await jobSheets.getDesignJobSheet(owner, '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44'), null, 'no such design');
});

// -- links from orders ---------------------------------------------------------------------

test('an order links to the sheet of each design it prints, by the design’s name', async () => {
  const one = await h.newDesign();
  const two = await h.newDesign();
  await h.db.update(schema.products).set({ name: 'Zebra tee' }).where(eq(schema.products.id, two.productId));
  await h.db.update(schema.products).set({ name: 'Anchor tee' }).where(eq(schema.products.id, one.productId));
  const both = await seedOrder(h.db, { items: [{ productId: one.productId, colourCode: 'C002', size: 'M', qty: 1 }, { productId: two.productId, colourCode: 'C002', size: 'M', qty: 1 }, { productId: two.productId, colourCode: 'C727', size: 'M', qty: 1 }] });
  const single = await seedOrder(h.db, { items: [{ productId: one.productId, colourCode: 'C002', size: 'M', qty: 1 }] });
  // A run's order too: its backing products belong to the design.
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId: two.designId, lines: [{ colourCode: 'C002', qty: 5, printServiceCode: 'screen_2c' }] });

  const links = await jobSheets.designsForOrders([both, single, run.orderId, both, 'ffffffff-ffff-4fff-8fff-ffffffffffff']);
  assert.deepEqual(links.get(both), [{ designId: one.designId, name: 'Anchor tee' }, { designId: two.designId, name: 'Zebra tee' }]);
  assert.deepEqual(links.get(single), [{ designId: one.designId, name: 'Anchor tee' }]);
  assert.deepEqual(links.get(run.orderId)?.map((l) => l.designId), [two.designId]);
  assert.equal(links.size, 3, 'an order that does not exist has none');
  assert.equal((await jobSheets.designsForOrders([])).size, 0);

  // The production list carries the same links.
  const production = await import('@/lib/services/production');
  const listed = await production.listProduction({});
  assert.deepEqual(listed.find((r) => r.orderId === both)?.designs, links.get(both));
  assert.deepEqual(listed.find((r) => r.orderId === single)?.designs.map((d) => d.designId), [one.designId]);

  // The order card's "Job sheet" buttons: staff who may open sheets get one per design, artists none.
  const { jobSheetActions } = await import('@/lib/tools/job-sheet-actions');
  const base = 'https://merchfrom.com/api/job-sheets';
  const worker = await h.staff({ production: 'view' });
  assert.deepEqual(await jobSheetActions(worker, both), [
    { label: 'Job sheet · Anchor tee', href: `${base}/${one.designId}` },
    { label: 'Job sheet · Zebra tee', href: `${base}/${two.designId}` },
  ]);
  assert.deepEqual(await jobSheetActions(owner, single), [{ label: 'Job sheet', href: `${base}/${one.designId}` }]);
  assert.deepEqual(await jobSheetActions({ role: 'artist' }, single), [], 'an artist never gets the link');
  assert.deepEqual(await jobSheetActions(await h.staff({ support: 'work' }), single), [], 'nor staff outside Pre-press and Production');
  assert.deepEqual(await jobSheetActions(owner, 'ffffffff-ffff-4fff-8fff-ffffffffffff'), []);
});

test('the order card of get_order and the production tools carries the job sheet links for staff who may open sheets, never for the artist', async () => {
  const commerce = await import('@/lib/tools/commerce');
  const adminTools = await import('@/lib/tools/admin');
  const { designId, productId } = await liveDesign({ colours: ['C002'] });
  const orderId = await seedOrder(h.db, { items: [{ productId, colourCode: 'C002', size: 'M', qty: 1 }] });
  const link = `https://merchfrom.com/api/job-sheets/${designId}`;
  let counter = 0;
  const ctx = (role: 'artist' | 'staff' | 'admin', opts: { permissions?: Actor['permissions']; storeId?: string | null } = {}): ToolContext => ({
    userId: h.artist.userId,
    clerkId: `clerk-${++counter}`,
    role,
    storeId: opts.storeId ?? null,
    conversationId: '00000000-0000-4000-8000-0000000000bb',
    idempotencyKey: `key-${counter}`,
    locale: 'en',
    permissions: opts.permissions ?? null,
  });
  type Card = { kind: string; actions?: { label: string; href?: string }[] };
  const actionsOf = async (c: ToolContext): Promise<Card['actions']> => {
    const result = await commerce.getOrderTool.run(c, { orderId });
    const card = (result.ui?.cards ?? []).find((x) => x.kind === 'order') as Card | undefined;
    assert.ok(card, 'the order opened');
    return card.actions;
  };

  assert.deepEqual(await actionsOf(ctx('staff', { permissions: { shop_orders: 'view', production: 'view' } })), [{ label: 'Job sheet', href: link }]);
  assert.deepEqual(await actionsOf(ctx('staff', { permissions: { shop_orders: 'view', prepress: 'view' } })), [{ label: 'Job sheet', href: link }]);
  assert.deepEqual(await actionsOf(ctx('admin')), [{ label: 'Job sheet', href: link }]);
  assert.equal(await actionsOf(ctx('staff', { permissions: { shop_orders: 'view' } })), undefined, 'Shop orders alone may read the order, not the sheet');
  assert.equal(await actionsOf(ctx('artist', { storeId: h.artist.storeId })), undefined, 'the artist reads their own order without it');

  // The production tools show the order card again after they act on it, with the link.
  const tracked = await adminTools.setTrackingTool.run(ctx('staff', { permissions: { production: 'work' } }), { orderId, carrier: 'DHL', code: 'JD0146' });
  const card = (tracked.ui?.cards ?? []).find((x) => x.kind === 'order') as Card | undefined;
  assert.deepEqual(card?.actions, [{ label: 'Job sheet', href: link }]);
});

test('every pack page of a design links to the same job sheet: one per design, not one per pack', async () => {
  const { designId, darks, lights, dtg } = await liveDesign({ colours: ['C002'] });
  const viewer = await h.staff({ prepress: 'view' });
  const urls = new Set<string | null>();
  for (const pack of [darks, lights, dtg]) {
    const detail = (await h.prepress.getPackDetail(viewer, pack.id))!;
    urls.add(detail.jobSheetUrl);
  }
  assert.deepEqual([...urls], [`/api/job-sheets/${designId}`]);
});

// -- the real renderer ----------------------------------------------------------------------

test('the PDF renders from a real design: landscape, with every section, its proofs as images, and it opens again', async () => {
  // Real proof images, so the thumbnails are drawn; the engine's other output stays fake.
  const photo = await sharp({ create: { width: 300, height: 360, channels: 3, background: '#8a8a8a' } }).webp().toBuffer();
  const engine = h.fakes.engine.engine;
  const kept = { dtg: engine.renderDtgProof, screen: engine.renderScreenProof };
  engine.renderDtgProof = async (_layer, request) => ({ garmentCode: request.garment.code, technique: 'dtg_dtf', image: photo, width: 300, height: 360 });
  engine.renderScreenProof = async (_set, request) => ({ garmentCode: request.garment.code, technique: 'screen', image: photo, width: 300, height: 360 });
  const { renderJobSheet } = await import('@/lib/print/pack');
  try {
    const { designId, productId, dtg } = await liveDesign();
    const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
    assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
    const sale = await seedOrder(h.db, { items: [{ productId, colourCode: 'C002', size: 'M', qty: 2 }, { productId, colourCode: 'C001', size: 'XL', qty: 1 }] });
    const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 60, printServiceCode: 'screen_2c' }, { colourCode: 'C001', qty: 20, printServiceCode: 'screen_2c' }] });

    h.pipeline.overridePrintDeps({ ...h.fakes.deps, pack: { ...h.fakes.pack.pack, renderJobSheet } });
    const sheet = (await jobSheets.getDesignJobSheet(owner, designId))!;
    assert.equal(sheet.bytes.subarray(0, 5).toString('latin1'), '%PDF-');

    const doc = await PDFDocument.load(sheet.bytes);
    assert.ok(doc.getPageCount() >= 3);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      assert.ok(Math.abs(width - 841.89) < 0.5 && Math.abs(height - 595.28) < 0.5, 'A4 landscape');
    }
    assert.equal(doc.getTitle(), 'Job sheet MF-UNDERWRITER-TEE · v1');
    assert.equal(sheet.bytes.toString('latin1').match(/\/DCTDecode/g)?.length, 6, 'a thumbnail for each of the six proofs');

    const lines = pdfLines(sheet.bytes);
    for (const phrase of [
      'MF-UNDERWRITER-TEE · v1',
      'Garments (5)',
      'Classic tee',
      'Screen · Darks',
      'Screen · Lights',
      'DTG/DTF',
      fileOf(dtg.files as PackFile[], 'dtg_png', 'C002'),
      'Darks · 6 screens · spot colours',
      'Lights · 4 screens · spot colours',
      '1 of 3 files approved by pre-press',
      'Pat Presser',
      'Pieces waiting',
      `${await runLabelOf(run.bulkOrderId)} · ${ref(run.orderId)} (60)`,
      `${ref(sale)} (2)`,
      'Audit sign-off',
    ]) {
      assert.ok(shows(lines, phrase), `the sheet says "${phrase}"`);
    }
    // 2 + 1 + 60 + 20 pieces, by size.
    assert.ok(shows(lines, '83 pieces in 2 open orders'));
  } finally {
    engine.renderDtgProof = kept.dtg;
    engine.renderScreenProof = kept.screen;
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
});

test('PRINT_MOCK answers every request with the sample sheet, from no database and no storage', async () => {
  process.env.PRINT_MOCK = '1';
  try {
    const before = h.fakes.pack.sheets.length;
    const sheet = await jobSheets.getDesignJobSheet(owner, '00000000-0000-4000-8000-000000000000');
    assert.ok(sheet && sheet.bytes.length > 0);
    assert.equal(sheet.filename, 'MF-UNDERWRITER-v3-job-sheet.pdf');
    assert.equal(h.fakes.pack.sheets.length, before + 1);
    assert.equal(h.fakes.pack.sheets.at(-1)!.design.code, 'MF-UNDERWRITER');
    // The sample's proofs are drawn, not read from files.
    assert.equal(h.fakes.pack.sheets.at(-1)!.proofs.length, 6);
    // Access is still checked.
    await assert.rejects(jobSheets.getDesignJobSheet({ userId: h.artist.userId, role: 'artist' }, '00000000-0000-4000-8000-000000000000'), (err) => err instanceof PermissionError);
  } finally {
    delete process.env.PRINT_MOCK;
  }
});
