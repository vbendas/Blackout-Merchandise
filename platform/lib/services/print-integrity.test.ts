// Print prep under real-world order: an order for a colour nobody prepared, jobs that build fewer colours,
// the production gate's placement and colour checks, the artist's approval standing behind pre-press's,
// a corrected upload that stops part way, a file refresh racing other changes, and orders that need nothing
// or name another shop's art. Fake engine, pack, storage and queue on PGlite.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser } from '@/scripts/test/pglite';
import type { PackFile, PackNeed, PrintJobInput } from '@/lib/print/types';
import type { PackRow, StoredManifest } from '@/lib/print/pipeline';
import { GARMENTS, bootstrapPrint, readFakePsd, seedDesign, seedProduct, seedRun, seedShopOrder, writeFakePsd, type Harness } from '@/lib/print/test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const { black, navy, white } = GARMENTS;

async function reload(id: string): Promise<PackRow> {
  const [row] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, id));
  return row;
}

const current = async (versionId: string) => h.pipeline.loadCurrentPacks(versionId);
const orderIds = (pack: PackRow) => (pack.neededFor as (PackNeed & { orderId?: string })[]).map((n) => n.orderId);
const approve = (designId: string, versionId: string) => h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId });

/** Prepares a drop of these colours and runs its job, as the worker would. */
async function prepareColours(designId: string, codes: string[]): Promise<string> {
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), garmentCodes: codes });
  assert.ok(queued.ok, JSON.stringify(queued));
  await h.runJob(queued.value.jobId);
  return queued.value.designVersionId;
}

async function runQueued(kind: string): Promise<void> {
  const queued = await h.db.select().from(schema.printJobs).where(and(eq(schema.printJobs.kind, kind), eq(schema.printJobs.status, 'queued')));
  for (const job of queued) await h.runJob(job.id);
}

/** Pre-press enters a code for every colour ink of a screen pack and the worker rewrites the files. */
async function codeAllInks(pack: PackRow): Promise<void> {
  let code = 300;
  for (const ink of (pack.manifest as StoredManifest).inks.filter((i) => i.role === 'ink')) {
    assert.ok((await h.pantone.assignPantone(h.owner, { packId: pack.id, plateIndex: ink.index, code: `${code++} C` })).ok);
  }
  await runQueued('reupload');
}

test('an order for a colour nobody prepared builds it beside the colours already made, and no order loses its files', async () => {
  const { designId, productId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code]);
  assert.ok((await approve(designId, versionId)).ok);
  const [first] = (await current(versionId)).filter((p) => p.technique === 'dtg_dtf');

  const blackSale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: black.code });
  await h.prepress.markPacksNeededForOrder(blackSale);
  assert.deepEqual(orderIds(await reload(first.id)), [blackSale]);

  // Navy was never prepared: the new build keeps black and white, so it can replace the pack they print from.
  const navySale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: navy.code });
  await h.prepress.markPacksNeededForOrder(navySale);
  const [job] = (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.status, 'queued'))).filter((j) => (j.input as PrintJobInput).designId === designId);
  assert.deepEqual([...(job.input as PrintJobInput).garmentCodes].sort(), [black.code, navy.code, white.code].sort());
  assert.equal((job.input as PrintJobInput).designVersionId, versionId, 'on the art the order was sold with');
  await h.runJob(job.id);

  const dtg = (await current(versionId)).filter((p) => p.technique === 'dtg_dtf');
  assert.equal(dtg.length, 1, 'one DTG/DTF pack prints every colour');
  assert.deepEqual([...(dtg[0].garmentCodes as string[])].sort(), [black.code, navy.code, white.code].sort());
  assert.deepEqual([...orderIds(dtg[0])].sort(), [blackSale, navySale].sort(), 'both orders wait on the pack that prints their colour');
  assert.ok(h.pipeline.isSuperseded(await reload(first.id)));

  // The artist approved black and white, not navy: the page asks again, and they are told an order waits.
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.status, 'ready');
  const asks = (await h.db.select().from(schema.notifications).where(eq(schema.notifications.event, 'print.reapproval'))).filter(
    (n) => (n.payload as { designId?: string }).designId === designId,
  );
  assert.equal(asks.length, 1);
  assert.match((asks[0].payload as { message: string }).message, /An order is waiting on a colour or print position you have not approved yet/);

  // Pre-press approves the pack. Black goes ahead on the artist's approval; navy waits for theirs.
  assert.ok((await h.prepress.approvePack(h.owner, dtg[0].id)).ok);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(blackSale), { ok: true, value: null });
  const waiting = await h.prepress.assertPacksApprovedForOrder(navySale);
  assert.ok(!waiting.ok && /hasn't approved the print proof .* for every colour and position/.test(waiting.error), JSON.stringify(waiting));
  assert.ok((await approve(designId, versionId)).ok);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(navySale), { ok: true, value: null });
});

test('a job for fewer colours never retires a pack that prints others', async () => {
  const { designId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code]);
  const before = await current(versionId);

  // The artist prepares navy on its own afterwards.
  await prepareColours(designId, [navy.code]);
  const after = await current(versionId);
  for (const pack of before) assert.ok(after.some((p) => p.id === pack.id), `${pack.technique} ${pack.screenSetKey ?? ''} is still current`);
  assert.ok(after.some((p) => p.technique === 'dtg_dtf' && (p.garmentCodes as string[]).includes(navy.code)));
  assert.ok(after.some((p) => p.technique === 'screen' && (p.garmentCodes as string[]).includes(navy.code)));
});

test('the production gate wants a pack for every placement and colour the order asks for, not just the design', async () => {
  const { designId, productId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code, navy.code]);
  const [dtg] = (await current(versionId)).filter((p) => p.technique === 'dtg_dtf');
  assert.ok((await h.prepress.approvePack(h.owner, dtg.id)).ok);

  // The same design on a second product printed smaller: its pack doesn't exist yet.
  const small = await seedProduct(h.db, { storeId: h.artist.storeId, designId, name: 'Small print tee', placement: { position: 'front_chest', widthCm: 20 } });
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: black.code });
  await h.db.insert(schema.orderItems).values({ orderId: sale, productId: small, quantity: 1, priceAtPurchase: 2500, colourCode: black.code, size: 'L' });
  await h.prepress.markPacksNeededForOrder(sale);

  const gate = await h.prepress.assertPacksApprovedForOrder(sale);
  assert.deepEqual(gate, { ok: false, error: 'The print files for this order are being prepared. Pre-press checks them before production can start.' });
  const [job] = (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.status, 'queued'))).filter((j) => (j.input as PrintJobInput).designId === designId);
  assert.equal((job.input as PrintJobInput).placements[0].widthMm, 200);
  await h.runJob(job.id);

  const smallPack = (await current(versionId)).find((p) => p.technique === 'dtg_dtf' && (p.placement as { widthMm: number }).widthMm === 200)!;
  const unapproved = await h.prepress.assertPacksApprovedForOrder(sale);
  assert.ok(!unapproved.ok && /^Pre-press hasn't approved the print files yet/.test(unapproved.error), JSON.stringify(unapproved));
  assert.ok((await h.prepress.approvePack(h.owner, smallPack.id)).ok);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(sale), { ok: true, value: null }, 'never approved through the print approval: pre-press approval stands alone');
});

test('a run line that also prints the back needs screen files for the back, built on the same art, before production', async () => {
  const { designId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code]);
  assert.ok((await approve(designId, versionId)).ok);
  const run = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [{ colourCode: black.code, qty: 40, printServiceCode: 'screen_2c', extraPlacements: [{ position: 'back', widthCm: 30 }] }],
  });
  await h.prepress.markPacksNeededForOrder(run.orderId);

  // The front was prepared and is attached; nothing was made for the back, so pre-press starts it.
  const front = (await current(versionId)).find((p) => p.technique === 'screen')!;
  assert.deepEqual(orderIds(await reload(front.id)), [run.orderId]);
  const [job] = (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.status, 'queued'))).filter((j) => (j.input as PrintJobInput).designId === designId);
  assert.ok(job, 'a build for the back');
  const input = job.input as PrintJobInput;
  assert.deepEqual(input.placements, [{ position: 'back', widthMm: 300 }]);
  assert.deepEqual(input.techniques, ['screen']);
  assert.equal(input.designVersionId, versionId, 'on the art the run was sold with');
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(run.orderId), {
    ok: false,
    error: 'The print files for this order are being prepared. Pre-press checks them before production can start.',
  });

  await h.runJob(job.id);
  const back = (await current(versionId)).find((p) => p.technique === 'screen' && (p.placement as { position: string }).position === 'back')!;
  assert.ok(back, 'the back has its own screen pack');
  assert.deepEqual(orderIds(await reload(back.id)), [run.orderId], 'the run waits on it');
  const gate = await h.prepress.assertPacksApprovedForOrder(run.orderId);
  assert.ok(!gate.ok && /^Pre-press hasn't approved the print files yet/.test(gate.error), JSON.stringify(gate));
});

test('a re-run that changes the proof stops pre-press signing the version off until the artist approves again', async () => {
  const { designId, productId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code, navy.code]);
  assert.ok((await approve(designId, versionId)).ok);
  const darks = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: black.code, qty: 40, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  void productId;

  h.fakes.pack.options.proofState = 'failed';
  try {
    const queued = await h.prepress.rerunPack(h.owner, darks.id, { lpi: 45 });
    assert.ok(queued.ok, JSON.stringify(queued));
    await h.runJob(queued.value.jobId);
  } finally {
    h.fakes.pack.options.proofState = 'passed';
  }
  const replaced = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;
  assert.notEqual(replaced.id, darks.id);
  await codeAllInks(replaced);

  const refused = await h.prepress.approvePack(h.owner, replaced.id);
  assert.deepEqual(refused, { ok: false, error: "The artist was asked to approve a changed proof and hasn't yet. Approve the pack once they have." });
  const gate = await h.prepress.assertPacksApprovedForOrder(run.orderId);
  assert.ok(!gate.ok);

  assert.ok((await approve(designId, versionId)).ok);
  assert.ok((await h.prepress.approvePack(h.owner, (await reload(replaced.id)).id)).ok);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(run.orderId), { ok: true, value: null });
});

test('a corrected upload that stops after its build has already asked the artist again, and the repeat finishes the rest', async () => {
  const { designId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code]);
  assert.ok((await approve(designId, versionId)).ok);
  const darks = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;

  const psdFile = (darks.files as PackFile[]).find((f) => f.kind === 'screen_psd')!;
  const psd = readFakePsd(await h.fakes.storage.getObject(psdFile.key));
  const film = new Uint8Array(Buffer.from(psd.plates[1].data, 'base64'));
  for (let i = 9; i < 15; i++) film[i] = 255;
  psd.plates[1].data = Buffer.from(film).toString('base64');
  const key = `prepress-uploads/${darks.id}/${randomUUID()}/corrected.psd`;
  await h.fakes.storage.putObject({ key, data: writeFakePsd(psd), contentType: 'application/octet-stream', visibility: 'private' });

  // Storage fails on the training pair, the last step: the job fails part way.
  const put = h.fakes.storage.putObject;
  let failOnce = true;
  h.fakes.storage.putObject = async (input) => {
    if (failOnce && input.key.includes('/training/')) {
      failOnce = false;
      throw new Error('storage hiccup');
    }
    return put(input);
  };
  h.fakes.pack.options.proofState = 'failed';
  const queued = await h.fakes.deps.jobs!.enqueuePrintJob({
    kind: 'reupload',
    input: { ...h.pipeline.packInfo(darks)!.jobInput, techniques: ['screen'], reupload: { packId: darks.id, key } },
    createdBy: h.owner.userId,
  });
  try {
    await assert.rejects(h.runJob(queued.jobId), /storage hiccup/);
    const [approval] = await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId));
    assert.ok(approval.invalidatedAt, 'the artist was asked again before the step that failed');

    // The worker tries again: nothing is built twice, and the rest is done.
    await h.db.update(schema.printJobs).set({ status: 'queued' }).where(eq(schema.printJobs.id, queued.jobId));
    const result = (await h.runJob(queued.jobId)) as { upload?: { ok: boolean; outcome?: { newPackId: string; needsReapproval: boolean } } };
    assert.ok(result.upload?.ok, JSON.stringify(result));
    assert.equal(result.upload?.outcome?.needsReapproval, true);
    assert.ok(h.pipeline.isSuperseded(await reload(darks.id)), 'the corrected pack took over');
    assert.equal((await current(versionId)).filter((p) => p.screenSetKey === 'darks').length, 1);
  } finally {
    h.fakes.storage.putObject = put;
    h.fakes.pack.options.proofState = 'passed';
  }
});

test('a file refresh keeps what happened to the pack while it ran, and bakes a code typed meanwhile', async () => {
  const { designId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code]);
  const darks = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;
  const inks = (darks.manifest as StoredManifest).inks.filter((i) => i.role === 'ink');
  assert.ok(inks.length >= 2);
  assert.ok((await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: inks[0].index, code: '101 C' })).ok);

  // While the refresh writes the PSD, pre-press types a second code and the pack is sent back.
  const write = h.fakes.pack.pack.writeScreenPsd;
  let interrupted = false;
  h.fakes.pack.pack.writeScreenPsd = async (input) => {
    if (!interrupted) {
      interrupted = true;
      assert.ok((await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: inks[1].index, code: '102 C' })).ok);
      const row = await reload(darks.id);
      const manifest = row.manifest as StoredManifest;
      await h.db
        .update(schema.productionPacks)
        .set({ auditStatus: 'sent_back', manifest: { ...manifest, pipeline: { ...manifest.pipeline!, sendBack: { note: 'Bigger, please.', by: 'Pat', at: new Date().toISOString() } } } })
        .where(eq(schema.productionPacks.id, darks.id));
    }
    return write(input);
  };
  try {
    await runQueued('reupload');
  } finally {
    h.fakes.pack.pack.writeScreenPsd = write;
  }

  const after = await reload(darks.id);
  const info = h.pipeline.packInfo(after)!;
  assert.equal(after.auditStatus, 'sent_back');
  assert.equal(info.sendBack?.note, 'Bigger, please.');
  const codes = Object.fromEntries((after.manifest as StoredManifest).inks.map((i) => [i.index, i.pantone]));
  assert.equal(codes[inks[0].index], 'PANTONE 101 C');
  assert.equal(codes[inks[1].index], 'PANTONE 102 C', 'the code typed during the refresh is kept');
  assert.equal(info.bakedPantones[String(inks[1].index)], 'PANTONE 102 C', 'and the files were written again with it');
  assert.equal(h.pipeline.filesNeedRefresh(after), false);
});

test('an embroidered shop product, or an order naming another shop’s art, needs nothing from pre-press', async () => {
  const { designId } = await h.newDesign();
  const embroidered = await seedProduct(h.db, { storeId: h.artist.storeId, designId, name: 'Embroidered cap', printServiceCode: 'embroidery' });
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId: embroidered, colourCode: black.code });
  await h.prepress.markPacksNeededForOrder(sale);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(sale), { ok: true, value: null });

  const other = await seedUser(h.db, { email: 'other-art@merchfrom.test', withStore: true });
  const theirs = await seedDesign(h.db, other.storeId!);
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId: theirs, lines: [{ colourCode: black.code, qty: 30, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  const jobs = (await h.db.select().from(schema.printJobs)).filter((j) => [designId, theirs].includes((j.input as PrintJobInput).designId));
  assert.equal(jobs.length, 0, 'no build started for either');
});

test('one change to a pack at a time: a second re-run waits for the first, the same one twice is one job', async () => {
  const { designId } = await h.newDesign();
  const versionId = await prepareColours(designId, [black.code, white.code]);
  const darks = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;

  const first = await h.prepress.rerunPack(h.owner, darks.id, { lpi: 45 });
  assert.ok(first.ok, JSON.stringify(first));
  const again = await h.prepress.rerunPack(h.owner, darks.id, { lpi: 45 });
  assert.deepEqual(again, first, 'the same request reuses its job');
  assert.deepEqual(await h.prepress.rerunPack(h.owner, darks.id, { lpi: 50 }), {
    ok: false,
    error: 'This pack is already being run again. Wait for that run to finish, then change the new pack.',
  });

  await h.runJob(first.ok ? first.value.jobId : '');
  const next = (await current(versionId)).find((p) => p.screenSetKey === 'darks')!;
  assert.ok((await h.prepress.rerunPack(h.owner, next.id, { lpi: 50 })).ok, 'the new pack can be changed once the first run is done');
});
