// Pre-press: the queue entry rules, the audit actions and their permission gates,
// corrected uploads (the re-approval rule), re-runs, sending a
// pack back, and the production gate. Fakes for engine, pack, storage and queue.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import type { PackFile, PackNeed, PrintJobInput } from '@/lib/print/types';
import type { PackRow, StoredManifest } from '@/lib/print/pipeline';
import { bootstrapPrint, readFakePsd, seedRun, seedShopOrder, writeFakePsd, type FakePsd, type Harness } from '@/lib/print/test-support';

let h: Harness;
let artist: Actor;

before(async () => {
  h = await bootstrapPrint();
  artist = { userId: h.artist.userId, role: 'artist' };
});

after(async () => {
  await h.close();
});

// -- helpers -------------------------------------------------------------

async function prepared(opts: { approve?: boolean } = {}) {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  if (opts.approve) {
    const done = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId });
    assert.ok(done.ok, JSON.stringify(done));
  }
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

/** The library remembers codes across designs; a test about unnamed inks starts without any. */
async function emptyLibrary(): Promise<void> {
  await h.db.delete(schema.pantoneLibrary);
}

async function reload(pack: PackRow): Promise<PackRow> {
  const [row] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, pack.id));
  return row;
}

const needsOf = (pack: PackRow) => pack.neededFor as (PackNeed & { orderId: string })[];

async function runQueued(kind: string): Promise<number> {
  const queued = await h.db.select().from(schema.printJobs).where(and(eq(schema.printJobs.kind, kind), eq(schema.printJobs.status, 'queued')));
  for (const job of queued) await h.runJob(job.id);
  return queued.length;
}

/** Pre-press enters a code for every colour ink and the worker rewrites the files. */
async function codeAllInks(pack: PackRow, actor: Actor = h.owner): Promise<void> {
  let code = 237;
  for (const ink of (pack.manifest as StoredManifest).inks.filter((i) => i.role === 'ink')) {
    const done = await h.pantone.assignPantone(actor, { packId: pack.id, plateIndex: ink.index, code: `${code++} C` });
    assert.ok(done.ok, JSON.stringify(done));
  }
  await runQueued('reupload');
}

async function psdBytes(pack: PackRow): Promise<Buffer> {
  const file = (pack.files as PackFile[]).find((f) => f.kind === 'screen_psd')!;
  return h.fakes.storage.getObject(file.key);
}

function edited(bytes: Buffer, change: (psd: FakePsd) => void): Buffer {
  const psd = readFakePsd(bytes);
  change(psd);
  return writeFakePsd(psd);
}

/** Film 2 gets heavier inside the print area (the fake plates are 8 x 8 with the art in the middle 6 x 6): a visible change to what that ink prints. */
const heavierFilm2 = (psd: FakePsd) => {
  const data = new Uint8Array(Buffer.from(psd.plates[1].data, 'base64'));
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) data[y * 8 + x] = 255;
  psd.plates[1].data = Buffer.from(data).toString('base64');
};

/** The browser's part of an upload: the file goes straight to storage under a key made for this pack. */
async function stored(pack: PackRow, bytes: Buffer, name = 'corrected.psd'): Promise<string> {
  const key = `prepress-uploads/${pack.id}/${randomUUID()}/${name}`;
  await h.fakes.storage.putObject({ key, data: bytes, contentType: 'application/octet-stream', visibility: 'private' });
  return key;
}

/** An upload as the route does it: the file is in storage, the service is asked, and a worker picks the job up a moment later. */
async function uploadCorrection(actor: Actor, pack: PackRow, bytes: Buffer, name?: string) {
  const key = await stored(pack, bytes, name);
  h.fakes.queue.worker = { kinds: new Set(['reupload']), delayMs: 5 };
  try {
    return { key, result: await h.prepress.uploadCorrectedPsd(actor, pack.id, key) };
  } finally {
    h.fakes.queue.worker = null;
    await Promise.all(h.fakes.queue.pending);
  }
}

const jobsFor = async (key: string) => (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.kind, 'reupload'))).filter((j) => (j.input as PrintJobInput).reupload?.key === key);

const approvalOf = async (designId: string) => (await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId)))[0];
/** The artist's inbox notes of one kind about one design (the database is shared by every test in the file). */
const notesFor = async (event: string, designId: string) =>
  (await h.db.select().from(schema.notifications).where(and(eq(schema.notifications.userId, h.artist.userId), eq(schema.notifications.event, event)))).filter(
    (n) => (n.payload as { designId?: string }).designId === designId,
  );

// -- the queue -----------------------------------------------------------

test('a pack enters the queue when the first order needs it: DTG/DTF for a shop sale, screen for a screen-printed run', async () => {
  const { designId, productId, darks, lights, dtg } = await prepared();
  const queueIds = async (tab: 'waiting' | 'being_fixed' | 'approved' | 'sent_back' = 'waiting') => (await h.prepress.listPrepressQueue(h.owner, { tab })).rows.map((r) => r.packId);

  // Built, but no order needs anything yet: nothing to audit.
  for (const pack of [darks, lights, dtg]) assert.equal((await reload(pack)).auditStatus, 'idle');
  const waitingNow = [...(await queueIds('waiting')), ...(await queueIds('being_fixed')), ...(await queueIds('approved')), ...(await queueIds('sent_back'))];
  assert.ok(![darks.id, lights.id, dtg.id].some((id) => waitingNow.includes(id)), 'idle packs are not in the queue');

  // A shop sale always prints DTG/DTF.
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: 'C002', qty: 2 });
  await h.prepress.markPacksNeededForOrder(sale);
  const [shopPack, screenA, screenB] = await Promise.all([reload(dtg), reload(darks), reload(lights)]);
  assert.equal(shopPack.auditStatus, 'waiting');
  assert.equal(needsOf(shopPack).length, 1);
  assert.equal(needsOf(shopPack)[0].kind, 'shop_order');
  assert.equal(needsOf(shopPack)[0].orderId, sale);
  assert.deepEqual([screenA.auditStatus, screenB.auditStatus], ['idle', 'idle'], 'a shop sale never needs screens');

  const row = (await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting' })).rows.find((r) => r.packId === dtg.id)!;
  assert.equal(row.fileLabel, 'DTG/DTF');
  assert.equal(row.neededForLabel, 'Shop sale');
  assert.equal(row.garmentsLabel, 'Black, French Navy, White');
  assert.equal(row.screensLabel, '–');
  assert.equal(row.methodLabel, 'Full colour');
  assert.deepEqual(row.checks, { state: 'review', label: '1 to review' });
  assert.equal(row.designName, 'Underwriter tee · v1');
  assert.equal(row.initials, 'UT');

  // Marking the same order again changes nothing.
  await h.prepress.markPacksNeededForOrder(sale);
  assert.equal(needsOf(await reload(dtg)).length, 1);

  // A run that prints DTG/DTF needs the DTG/DTF pack, not the screens.
  const dtgRun = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C727', qty: 30, printServiceCode: 'dtg' }] });
  await h.prepress.markPacksNeededForOrder(dtgRun.orderId);
  const afterDtgRun = await reload(dtg);
  assert.deepEqual(needsOf(afterDtgRun).map((n) => n.kind), ['shop_order', 'run']);
  assert.equal((needsOf(afterDtgRun)[1] as { qty: number }).qty, 30);
  assert.equal((await reload(darks)).auditStatus, 'idle');

  // A screen-printed run needs the sets that cover its colours, with the pieces for each.
  const screenRun = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [
      { colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' },
      { colourCode: 'C001', qty: 40, printServiceCode: 'screen_2c' },
    ],
  });
  await h.prepress.markPacksNeededForOrder(screenRun.orderId);
  const [d2, l2, g2] = await Promise.all([reload(darks), reload(lights), reload(dtg)]);
  assert.equal(d2.auditStatus, 'waiting');
  assert.equal(l2.auditStatus, 'waiting');
  assert.deepEqual(needsOf(d2).map((n) => [n.kind, (n as { qty?: number }).qty]), [['run', 120]]);
  assert.deepEqual(needsOf(l2).map((n) => [n.kind, (n as { qty?: number }).qty]), [['run', 40]]);
  assert.equal(needsOf(g2).length, 2, 'the screen run does not add to the DTG/DTF pack');

  const { runNumberFor } = await import('@/lib/services/runs');
  const runNo = await runNumberFor(screenRun.bulkOrderId);
  const rows = (await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting' })).rows;
  assert.equal(rows.find((r) => r.packId === darks.id)?.neededForLabel, `Run ${runNo} · 120 pieces`);
  assert.equal(rows.find((r) => r.packId === lights.id)?.neededForLabel, `Run ${runNo} · 40 pieces`);
  assert.equal(rows.find((r) => r.packId === darks.id)?.fileLabel, 'Screen print · Darks');
  assert.equal(rows.find((r) => r.packId === darks.id)?.screensLabel, '6 of 8');
  assert.equal(rows.find((r) => r.packId === dtg.id)?.neededForLabel, 'Shop sale +1 more');

  // An approved pack stays approved when another order needs it.
  const approved = await h.prepress.approvePack(h.owner, dtg.id);
  assert.ok(approved.ok);
  const another = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: 'C001' });
  await h.prepress.markPacksNeededForOrder(another);
  const still = await reload(dtg);
  assert.equal(still.auditStatus, 'approved');
  assert.equal(needsOf(still).length, 3);

  const counts = (await h.prepress.listPrepressQueue(h.owner, { tab: 'approved' })).counts;
  assert.ok(counts.approved >= 1 && counts.waiting >= 2);
  assert.ok((await queueIds('approved')).includes(dtg.id));
  const filtered = await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting', search: 'zzz-nothing' });
  assert.deepEqual(filtered.rows, []);
  assert.ok((await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting', search: 'darks' })).rows.some((r) => r.packId === darks.id));
});

test('marking what an order needs never throws into the payment path', async () => {
  await assert.doesNotReject(h.prepress.markPacksNeededForOrder('not-a-uuid'));
  await assert.doesNotReject(h.prepress.markPacksNeededForOrder('5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11'));

  // A design with nothing prepared makes it try to queue a build; a broken queue must not leak out.
  const { designId, productId } = await h.newDesign();
  h.fakes.artByUrl.set('https://art.test/print.png', Buffer.from('stored print art'));
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId });
  const broken = {
    ...h.fakes.deps,
    jobs: {
      hashJobInput: () => 'x',
      enqueuePrintJob: async () => {
        throw new Error('the queue is down');
      },
    },
  };
  h.pipeline.overridePrintDeps(broken);
  try {
    await assert.doesNotReject(h.prepress.markPacksNeededForOrder(sale));
  } finally {
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
  assert.equal(designId.length > 0, true);
});

test('an order for a design nobody prepared starts a build, and joins the queue when it lands', async () => {
  const { designId, productId } = await h.newDesign();
  h.fakes.artByUrl.set('https://art.test/print.png', Buffer.from('stored print art'));
  let finalised = 0;
  h.pipeline.overridePrintDeps({ ...h.fakes.deps, finaliseArt: async (...args) => (finalised++, h.fakes.deps.finaliseArt!(...args)) });
  try {
    const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: 'C002' });

    await h.prepress.markPacksNeededForOrder(sale);
    const jobs = await h.db.select().from(schema.printJobs);
    const mine = jobs.filter((j) => (j.input as PrintJobInput).designId === designId);
    assert.equal(mine.length, 1);
    assert.deepEqual((mine[0].input as PrintJobInput).techniques, ['dtg_dtf'], 'a shop sale only needs the DTG/DTF files');
    assert.deepEqual((mine[0].input as PrintJobInput).garmentCodes, ['C002']);
    assert.equal(finalised, 0, 'the payment path never starts a paid 4K render');

    // Production cannot start yet.
    const early = await h.prepress.assertPacksApprovedForOrder(sale);
    assert.deepEqual(early, { ok: false, error: 'The print files for this order are being prepared. Pre-press checks them before production can start.' });
    assert.equal((await h.db.select().from(schema.printJobs)).filter((j) => (j.input as PrintJobInput).designId === designId).length, 1, 'asking again does not start a second build');

    await h.runJob(mine[0].id);
    const version = await h.printPrep.latestVersion(designId);
    const packs = await h.packs(version!.id);
    assert.equal(packs.length, 1);
    assert.equal(packs[0].technique, 'dtg_dtf');
    assert.equal(packs[0].auditStatus, 'waiting', 'the waiting order found its pack');
    assert.equal(needsOf(packs[0])[0].orderId, sale);
    assert.equal((await h.db.select().from(schema.printJobs)).filter((j) => (j.input as PrintJobInput).designId === designId).length, 1, 'finding it started no further build');
  } finally {
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
});

// -- the production gate ---------------------------------------------------

test('production cannot start on a pack nobody approved', async () => {
  const { designId, productId, darks, lights, dtg } = await prepared();
  const production = await import('@/lib/services/production');

  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: 'C002' });
  await h.prepress.markPacksNeededForOrder(sale);

  const blocked = await h.prepress.assertPacksApprovedForOrder(sale);
  assert.ok(!blocked.ok);
  assert.match(blocked.ok ? '' : blocked.error, /^Pre-press hasn't approved the print files yet: Underwriter tee \(DTG\/DTF\)\.$/);
  const stuck = await production.advance(sale);
  assert.ok(!stuck.ok && /Pre-press hasn't approved/.test(stuck.error), JSON.stringify(stuck));
  const [still] = await h.db.select().from(schema.orders).where(eq(schema.orders.id, sale));
  assert.equal(still.productionStatus, 'queued');

  assert.ok((await h.prepress.approvePack(h.owner, dtg.id)).ok);
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(sale), { ok: true, value: null });
  const moved = await production.advance(sale);
  assert.ok(moved.ok, JSON.stringify(moved));
  assert.equal(moved.ok && moved.value.productionStatus, 'printing');

  // Later steps are not gated, and setTracking never was.
  assert.ok((await production.advance(sale)).ok);

  // A screen run needs every set it prints from: both must be approved.
  const run = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [
      { colourCode: 'C002', qty: 50, printServiceCode: 'screen_2c' },
      { colourCode: 'C001', qty: 20, printServiceCode: 'screen_2c' },
    ],
  });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await codeAllInks(darks);
  await codeAllInks(lights);
  assert.ok((await h.prepress.approvePack(h.owner, darks.id)).ok);
  const half = await h.prepress.assertPacksApprovedForOrder(run.orderId);
  assert.ok(!half.ok && /screen print, lights/.test(half.error), JSON.stringify(half));
  assert.ok(!(await production.advance(run.orderId)).ok);
  assert.ok((await h.prepress.approvePack(h.owner, lights.id)).ok);
  assert.ok((await production.advance(run.orderId)).ok);
});

test('an order with nothing for pre-press to check is not held up', async () => {
  const production = await import('@/lib/services/production');
  const { storeId } = h.artist;

  // A run quoted on a service that is neither screen nor DTG/DTF (embroidery) needs no pack.
  const { designId } = await h.newDesign();
  const embroidery = await seedRun(h.db, { storeId, designId, lines: [{ colourCode: 'C002', qty: 10, printServiceCode: 'embroidery' }] });
  assert.deepEqual(await h.prepress.assertPacksApprovedForOrder(embroidery.orderId), { ok: true, value: null });

  // An order that is not paid keeps its own explanation.
  const [pending] = await h.db.insert(schema.orders).values({ storeId, totalAmount: 100, status: 'pending' }).returning();
  const early = await production.advance(pending.id);
  assert.ok(!early.ok && /not paid/.test(early.error), JSON.stringify(early));
  const missing = await production.advance('5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11');
  assert.deepEqual(missing, { ok: false, error: 'Order not found.' });
});

// -- approving a pack ------------------------------------------------------

test('a screen pack is approved once every colour ink has its code and the files carry it; the design’s job sheet shows the sign-off', async () => {
  await emptyLibrary();
  const { darks, designId } = await prepared();
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });

  // Four colour inks without codes: the pressroom could not mix them.
  const early = await h.prepress.approvePack(worker, darks.id);
  assert.deepEqual(early, { ok: false, error: 'Enter the Pantone code for films 2, 3, 4, 5 first: the pressroom mixes each ink from its code.' });
  assert.equal((await reload(darks)).auditStatus, 'idle');

  // Each code is remembered and queues one refresh of the files.
  const colourInks = (darks.manifest as StoredManifest).inks.filter((i) => i.role === 'ink');
  for (const [i, ink] of colourInks.entries()) {
    const done = await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: ink.index, code: `${237 + i} c` });
    assert.ok(done.ok, JSON.stringify(done));
  }
  const queued = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.kind, 'reupload'));
  const refreshJobs = queued.filter((j) => (j.input as PrintJobInput).reupload?.packId === darks.id);
  assert.equal(refreshJobs.length, 1, 'four codes, one refresh');
  assert.equal(refreshJobs[0].status, 'queued');
  const psdKey = (darks.files as PackFile[]).find((f) => f.kind === 'screen_psd')!.key;
  assert.equal((refreshJobs[0].input as PrintJobInput).reupload?.key, psdKey);

  // The files still show the old names, so approving waits for the refresh.
  const waiting = await h.prepress.approvePack(worker, darks.id);
  assert.deepEqual(waiting, { ok: false, error: 'The film names are being updated with the new Pantone codes. Try again in a minute.' });

  await h.runJob(refreshJobs[0].id);
  const layers = readFakePsd(await psdBytes(await reload(darks))).plates.map((p) => p.name);
  assert.deepEqual(
    layers.map((name) => name.replace(/ · .*/, '')),
    ['1/6  Underbase', '2/6  PANTONE 237 C', '3/6  PANTONE 238 C', '4/6  PANTONE 239 C', '5/6  PANTONE 240 C', '6/6  Highlight white'],
  );
  const refreshed = await reload(darks);
  assert.equal(refreshed.auditStatus, 'idle', 'a refresh is not a new pack: same row, same state');
  assert.equal(refreshed.id, darks.id);

  const approved = await h.prepress.approvePack(worker, darks.id);
  assert.ok(approved.ok, JSON.stringify(approved));
  const after = await reload(darks);
  assert.equal(after.auditStatus, 'approved');
  assert.equal(after.auditedBy, worker.userId);
  assert.ok(after.auditedAt);

  // Signing writes none of the pack's files again: the sign-off is read from the pack row by the design's job
  // sheet (one per design), which says who signed and when.
  assert.deepEqual((after.files as PackFile[]).map((f) => f.sha256), (refreshed.files as PackFile[]).map((f) => f.sha256));
  const manifestFile = (after.files as PackFile[]).find((f) => f.kind === 'manifest')!;
  const written = JSON.parse(h.fakes.storage.objects.get(manifestFile.key)!.data.toString('utf8')) as StoredManifest;
  assert.ok(!written.files.some((f) => (f.kind as string) === 'job_sheet'), 'the job sheet is not among a pack’s files');
  assert.equal(written.pipeline, undefined);
  const { collectJobSheet } = await import('@/lib/services/job-sheets');
  const sheet = (await collectJobSheet(designId))!;
  const audit = sheet.source.audits.find((a) => a.label.startsWith('Screen · Darks'))!;
  assert.deepEqual([audit.state, audit.by, audit.at], ['approved', 'Pat Presser', after.auditedAt!.toISOString()]);
  assert.equal(sheet.source.packStatus, '1 of 3 files approved by pre-press');
  assert.deepEqual(h.fakes.activity.filter((a) => a.entry.action === 'pack.approve' && a.entry.itemId === darks.id).map((a) => a.actorId), [worker.userId]);

  // Approving twice is fine.
  assert.ok((await h.prepress.approvePack(worker, darks.id)).ok);
});

test('a failed check blocks approval; a sent-back or replaced pack cannot be approved', async () => {
  h.fakes.pack.options.failCheck = 'plates';
  let broken: Awaited<ReturnType<typeof prepared>>;
  try {
    broken = await prepared();
  } finally {
    h.fakes.pack.options.failCheck = null;
  }
  const blocked = await h.prepress.approvePack(h.owner, broken.dtg.id);
  assert.deepEqual(blocked, { ok: false, error: 'A check failed (plates). Run the pack again or upload a corrected PSD first.' });
  assert.equal((await reload(broken.dtg)).auditStatus, 'idle');
  const row = (await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting' })).rows;
  assert.ok(!row.some((r) => r.packId === broken.dtg.id), 'idle packs are not in the queue');

  assert.deepEqual(await h.prepress.approvePack(h.owner, '5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11'), { ok: false, error: 'Pack not found.' });
  assert.deepEqual(await h.prepress.approvePack(h.owner, 'nonsense'), { ok: false, error: 'Pack not found.' });

  // Sent back: it stays out of production until the artist answers.
  const { dtg } = await prepared();
  assert.ok((await h.prepress.sendBackToArtist(h.owner, dtg.id, 'The lettering is too thin to print.')).ok);
  const refused = await h.prepress.approvePack(h.owner, dtg.id);
  assert.deepEqual(refused, { ok: false, error: 'This pack was sent back to the artist. It can be approved once they answer.' });
});

// -- permission gates --------------------------------------------------------

test('every staff action checks Pre-press access and leaves no trace when refused', async () => {
  const { darks, dtg } = await prepared();
  const viewer = await h.staff({ prepress: 'view' });
  const worker = await h.staff({ prepress: 'work' });
  const manager = await h.staff({ prepress: 'manage' });
  const elsewhere = await h.staff({ production: 'manage', runs: 'manage' });
  const suspended = await h.staff({ prepress: 'manage' }, { suspended: true });
  const psd = await psdBytes(darks);

  const jobsBefore = (await h.db.select().from(schema.printJobs)).length;
  const libraryBefore = (await h.db.select().from(schema.pantoneLibrary)).length;
  const activityBefore = h.fakes.activity.length;

  // Nobody without Work access can act.
  const cannotWork: [string, Actor][] = [['an artist', artist], ['a viewer', viewer], ['staff on another area', elsewhere], ['a suspended account', suspended]];
  for (const [who, actor] of cannotWork) {
    const denial = "You don't have Work access to Pre-press.";
    assert.deepEqual(await h.prepress.approvePack(actor, dtg.id), { ok: false, error: denial }, `approve: ${who}`);
    assert.deepEqual(await h.prepress.rerunPack(actor, dtg.id, {}), { ok: false, error: denial }, `rerun: ${who}`);
    assert.deepEqual(await h.prepress.uploadCorrectedPsd(actor, darks.id, await stored(darks, psd)), { ok: false, error: denial }, `upload: ${who}`);
    assert.deepEqual(await h.prepress.sendBackToArtist(actor, dtg.id, 'No.'), { ok: false, error: denial }, `send back: ${who}`);
    assert.deepEqual(await h.pantone.assignPantone(actor, { packId: darks.id, plateIndex: 2, code: '186 C' }), { ok: false, error: denial }, `assign: ${who}`);
  }
  assert.equal((await reload(dtg)).auditStatus, 'idle');
  assert.equal((await h.db.select().from(schema.printJobs)).length, jobsBefore, 'no job was queued');
  assert.equal((await h.db.select().from(schema.pantoneLibrary)).length, libraryBefore, 'no code was remembered');
  assert.equal(h.fakes.activity.length, activityBefore, 'and nothing was logged');

  // Reading needs View.
  for (const [who, actor] of [['an artist', artist], ['staff on another area', elsewhere], ['a suspended account', suspended]] as [string, Actor][]) {
    await assert.rejects(h.prepress.listPrepressQueue(actor, { tab: 'waiting' }), PermissionError, `queue: ${who}`);
    await assert.rejects(h.prepress.getPackDetail(actor, dtg.id), PermissionError, `detail: ${who}`);
    await assert.rejects(h.pantone.listPantoneLibrary(actor), PermissionError, `library: ${who}`);
  }
  for (const actor of [viewer, worker, manager, h.owner]) {
    await assert.doesNotReject(h.prepress.listPrepressQueue(actor, { tab: 'waiting' }));
    assert.ok(await h.prepress.getPackDetail(actor, dtg.id));
  }
  assert.deepEqual([(await h.prepress.getPackDetail(viewer, dtg.id))?.canWork, (await h.prepress.getPackDetail(viewer, dtg.id))?.canManage], [false, false]);
  assert.deepEqual([(await h.prepress.getPackDetail(worker, dtg.id))?.canWork, (await h.prepress.getPackDetail(worker, dtg.id))?.canManage], [true, false]);
  assert.deepEqual([(await h.prepress.getPackDetail(manager, dtg.id))?.canWork, (await h.prepress.getPackDetail(manager, dtg.id))?.canManage], [true, true]);

  // Work is enough to approve, re-run, send back and enter codes, and each is logged against the actor.
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  assert.ok((await h.prepress.rerunPack(worker, dtg.id, {})).ok);
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: '186 C' })).ok);
  const logged = h.fakes.activity.slice(activityBefore).map((a) => [a.actorId === worker.userId, a.entry.area, a.entry.action, a.entry.itemType]);
  assert.deepEqual(logged, [[true, 'prepress', 'pack.approve', 'production_pack'], [true, 'prepress', 'pack.rerun', 'production_pack'], [true, 'prepress', 'pantone.assign', 'production_pack']]);

  // The ink system needs Manage.
  const profile = (await h.inkSystem.getActiveInkSystem()).profile;
  assert.deepEqual(await h.inkSystem.updateInkSystem(worker, { ...profile, pressHeads: 6 }), { ok: false, error: "You don't have Manage access to Pre-press." });
  assert.deepEqual(await h.inkSystem.updateInkSystem(artist, { ...profile, pressHeads: 6 }), { ok: false, error: "You don't have Manage access to Pre-press." });
  const saved = await h.inkSystem.updateInkSystem(manager, { ...profile, pressHeads: 6 });
  assert.ok(saved.ok);
  assert.equal(saved.ok && saved.value.profile.pressHeads, 6);
  assert.ok(h.fakes.activity.some((a) => a.actorId === manager.userId && a.entry.action === 'ink_system.update'));
});

// -- sending a pack back -------------------------------------------------------

test('sending a pack back withdraws the approval, tells the artist, and holds the pack out of production', async () => {
  const { designId, designVersionId, productId, dtg } = await prepared({ approve: true });
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId, colourCode: 'C002' });
  await h.prepress.markPacksNeededForOrder(sale);

  assert.deepEqual(await h.prepress.sendBackToArtist(worker, dtg.id, '   '), { ok: false, error: 'Write a note for the artist: say what needs to change.' });
  assert.deepEqual(await h.prepress.sendBackToArtist(worker, dtg.id, 'x'.repeat(1001)), { ok: false, error: 'Keep the note under 1,000 characters.' });
  // The artist reads the note, and clients never see Pantone codes.
  const noPantone = { ok: false, error: 'Artists never see Pantone codes. Name the colour in plain words instead, such as deep purple.' };
  assert.deepEqual(await h.prepress.sendBackToArtist(worker, dtg.id, 'Swap the red for PANTONE 186 C.'), noPantone);
  assert.deepEqual(await h.prepress.sendBackToArtist(worker, dtg.id, 'Use pms 186 instead.'), noPantone);
  assert.deepEqual(await h.prepress.sendBackToArtist(worker, dtg.id, '2685 C is too dark on navy.'), noPantone);

  const note = 'The thin lines in the lettering will close up. Please send a bolder version.';
  assert.ok((await h.prepress.sendBackToArtist(worker, dtg.id, note)).ok);

  const row = await reload(dtg);
  assert.equal(row.auditStatus, 'sent_back');
  assert.equal(row.auditedBy, worker.userId);
  assert.deepEqual({ note: (row.manifest as StoredManifest).pipeline?.sendBack?.note, by: (row.manifest as StoredManifest).pipeline?.sendBack?.by }, { note, by: 'Pat Presser' });
  const approval = await approvalOf(designId);
  assert.ok(approval.invalidatedAt);
  assert.equal(approval.invalidatedReason, `Pre-press asked for a change: ${note}`);

  // The artist hears about it, in their inbox, with a prompt that opens the proofs.
  const [inbox] = await notesFor('print.sent_back', designId);
  const payload = inbox.payload as { message: string; prompt: string; note: string };
  assert.equal(payload.message, `Our pre-press team sent Underwriter tee back: ${note}`);
  assert.equal(payload.prompt, `Show me the print proof for design ${designId}`);
  assert.equal(inbox.channel, 'inapp');

  // The approval page shows the note and cannot be approved until they change something.
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.canApprove, false);
  assert.equal(view?.status, 'ready');
  assert.deepEqual(view?.warnings.slice(0, 1), [`Our pre-press team asked for a change: ${note}`]);
  const refused = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId });
  assert.deepEqual(refused, { ok: false, error: `Our pre-press team asked for a change first: ${note}` });

  // The order cannot be produced from it.
  assert.ok(!(await h.prepress.assertPacksApprovedForOrder(sale)).ok);

  // The artist sends new artwork: the order moves to the new version's pack and leaves the old one.
  h.fakes.setArt(designId, Buffer.from('a bolder drawing'));
  const next = await h.prepare(designId);
  const newDtg = (await h.packs(next.designVersionId)).find((p) => p.technique === 'dtg_dtf')!;
  assert.equal((await reload(newDtg)).auditStatus, 'waiting');
  assert.equal(needsOf(await reload(newDtg))[0].orderId, sale);
  assert.deepEqual((await reload(dtg)).neededFor, [], 'the order no longer waits on the pack that was sent back');
});

// -- running a pack again --------------------------------------------------------

test('running a pack again queues a job with the new settings, then replaces the pack', async () => {
  const { designId, designVersionId, darks, lights, dtg } = await prepared({ approve: true });
  const worker = await h.staff({ prepress: 'work' });
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  assert.equal((await reload(darks)).auditStatus, 'waiting');

  const settings = { method: 'sim_process' as const, maxScreens: 6, lpi: 60, angleDeg: 15, underbaseChokeMm: 0.3, trapMm: 0.1, inkSubstitutions: [{ plateIndex: 3, hex: '#112233' }] };
  const queued = await h.prepress.rerunPack(worker, darks.id, settings);
  assert.ok(queued.ok);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, queued.ok ? queued.value.jobId : ''));
  const input = job.input as PrintJobInput;
  assert.equal(job.kind, 'rerun');
  assert.deepEqual(input.techniques, ['screen']);
  assert.deepEqual(input.rerun, { packId: darks.id, settings });
  assert.equal(input.recipe.method, 'sim_process');
  assert.equal(input.recipe.maxScreens, 6);
  assert.deepEqual([input.recipe.halftone.lpi, input.recipe.halftone.angleDeg], [60, 15]);
  assert.deepEqual([input.recipe.underbaseChokeMm, input.recipe.trapMm], [0.3, 0.1]);
  assert.deepEqual(input.recipe.lockedInks, ['#ED90DC', '#112233', '#5456AC', '#3E0E61'], 'film 3 takes the new colour');
  assert.equal((await reload(darks)).auditStatus, 'being_fixed', 'the auditor has started on it');

  // The same settings while it is queued: still the one job.
  assert.equal((await h.prepress.rerunPack(worker, darks.id, settings) as { ok: true; value: { jobId: string } }).value.jobId, job.id);

  const checksBefore = h.fakes.pack.checkCalls.length;
  await h.runJob(job.id);
  const current = await h.pipeline.loadCurrentPacks(designVersionId);
  const newDarks = current.find((p) => p.screenSetKey === 'darks')!;
  assert.notEqual(newDarks.id, darks.id);
  assert.equal(newDarks.screenCount, 6, 'underbase, four colours and the highlight white');
  assert.equal(newDarks.correctedFromPackId, darks.id);
  assert.equal(newDarks.auditStatus, 'being_fixed');
  assert.deepEqual(needsOf(newDarks).map((n) => n.orderId), [run.orderId]);
  assert.equal((await reload(dtg)).id, dtg.id);
  assert.ok(current.some((p) => p.id === dtg.id), 'DTG/DTF was not part of this job');
  assert.ok(!current.some((p) => p.id === darks.id || p.id === lights.id));

  // The screen packs were checked against the proof the artist approved.
  assert.ok(h.fakes.pack.checkCalls.slice(checksBefore).filter((c) => c.technique === 'screen').every((c) => c.hadApprovedProof));

  // The proof did not change, so the artist's approval stands.
  assert.equal((await approvalOf(designId)).invalidatedAt, null);
  assert.equal((await notesFor('print.reapproval', designId)).length, 0);
});

test('re-run settings are checked, and a run that changes the proof asks the artist again', async () => {
  const { designId, darks, dtg } = await prepared({ approve: true });
  const worker = await h.staff({ prepress: 'work' });
  const ask = (settings: Parameters<typeof h.prepress.rerunPack>[2], pack = darks) => h.prepress.rerunPack(worker, pack.id, settings);
  const error = async (settings: Parameters<typeof h.prepress.rerunPack>[2], pack = darks) => {
    const r = await ask(settings, pack);
    return r.ok ? 'ok' : r.error;
  };

  assert.equal(await error({ lpi: 500 }), 'Lines per inch must be between 20 and 100.');
  assert.equal(await error({ angleDeg: 120 }), 'The angle must be between 0 and 90 degrees.');
  assert.equal(await error({ maxScreens: 16 }), 'Screens must be a whole number from 1 to 15.');
  assert.equal(await error({ maxScreens: 4.5 }), 'Screens must be a whole number from 1 to 15.');
  assert.equal(await error({ underbaseChokeMm: 5 }), 'The underbase choke must be between 0 and 2 mm.');
  assert.equal(await error({ trapMm: -1 }), 'The trap must be between 0 and 2 mm.');
  assert.equal(await error({ method: 'bogus' as never }), 'The method must be spot, index or simulated process.');
  assert.equal(await error({ inkSubstitutions: [{ plateIndex: 1, hex: '#112233' }] }), "Film 1 is not a colour ink, so it can't be changed.");
  assert.equal(await error({ inkSubstitutions: [{ plateIndex: 3, hex: 'blue' }] }), 'blue is not a colour. Use a code like #5456AC.');
  assert.equal(await error({ inkSubstitutions: [{ plateIndex: 3, hex: '#112233' }] }, dtg), 'Inks can only be changed on a screen pack.');
  assert.equal(
    await error({ maxScreens: 5, inkSubstitutions: [{ plateIndex: 3, hex: '#112233' }] }),
    'Changing inks keeps all 6 films, more than the 5 screens asked for. Change the inks first, then the screen count.',
  );
  assert.deepEqual(await h.prepress.rerunPack(worker, '5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11', {}), { ok: false, error: 'Pack not found.' });

  // A change that moves the proof beyond the threshold withdraws the approval.
  h.fakes.pack.options.proofState = 'review';
  try {
    const queued = await ask({ lpi: 45, inkSubstitutions: [{ plateIndex: 3, hex: '#112233' }] });
    assert.ok(queued.ok);
    await h.runJob(queued.ok ? queued.value.jobId : '');
  } finally {
    h.fakes.pack.options.proofState = 'passed';
  }
  const approval = await approvalOf(designId);
  assert.ok(approval.invalidatedAt);
  assert.match(approval.invalidatedReason ?? '', /ran the pack again with changes that alter the proof/);
  const [note] = await notesFor('print.reapproval', designId);
  assert.equal((note.payload as { prompt: string }).prompt, `Show me the print proof for design ${designId}`);
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.status, 'ready', 'the artist approves again');
  assert.equal(view?.canApprove, true);

  // A superseded pack cannot be run again.
  const old = await ask({}, darks);
  assert.ok(!old.ok && /A newer pack replaced this one/.test(old.error), JSON.stringify(old));
});

// -- corrected uploads --------------------------------------------------------------

test('a corrected PSD in storage is rebuilt by the worker and spares the artist when the proof is unchanged', async () => {
  const { designId, designVersionId, darks, lights } = await prepared({ approve: true });
  const worker = await h.staff({ prepress: 'work' });
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);

  const corrected = edited(await psdBytes(darks), (psd) => {
    heavierFilm2(psd);
    psd.effectsOn = true;
  });
  const checksBefore = h.fakes.pack.checkCalls.length;
  const { key, result } = await uploadCorrection(worker, darks, corrected, 'MF-UNDERWRITER-TEE-v1-FRONT-CHEST-DARKS.psd');
  assert.ok(result.ok, JSON.stringify(result));
  const outcome = result.ok ? result.value : null;

  assert.ok(outcome);
  assert.equal(outcome.needsReapproval, false, 'minor fixes need no new approval');
  assert.ok(outcome.checks.length > 0);
  assert.ok(
    outcome.changes.some((c) => /^Film 2 \(Orchid pink\) changed: \d+\.\d% of the print area is different, and its coverage went from \d+\.\d% to 100\.0%\.$/.test(c)),
    outcome.changes.join(' | '),
  );
  assert.equal(outcome.changes.filter((c) => c.startsWith('Film ')).length, 1, 'only film 2 changed');
  assert.ok(outcome.changes.includes('The colour overlays were switched on in the file. They were switched off again.'));

  // The work was a job: queued for the worker with the key, done, and its result holds the outcome.
  const [job] = await jobsFor(key);
  assert.equal(job.kind, 'reupload');
  assert.equal(job.status, 'done');
  assert.equal(job.createdBy, worker.userId);
  assert.deepEqual((job.input as PrintJobInput).reupload, { packId: darks.id, key });
  assert.deepEqual((job.result as { upload: { ok: boolean; outcome: unknown } }).upload, { ok: true, outcome });
  assert.ok(h.fakes.storage.objects.has(key), 'the upload itself is left in storage');

  // A new pack replaces the automatic one, which is kept; the order moved over.
  const rows = await h.packs(designVersionId);
  const fresh = rows.find((p) => p.id === outcome.newPackId)!;
  assert.equal(fresh.correctedFromPackId, darks.id);
  assert.equal(fresh.buildStatus, 'ready');
  assert.equal(fresh.screenSetKey, 'darks');
  assert.equal(fresh.auditStatus, 'being_fixed');
  assert.deepEqual(needsOf(fresh).map((n) => n.orderId), [run.orderId]);
  const old = await reload(darks);
  assert.equal(h.pipeline.packInfo(old)?.supersededBy, fresh.id);
  assert.deepEqual(old.neededFor, []);
  assert.equal(old.auditStatus, 'idle');
  assert.ok(!(await h.pipeline.loadCurrentPacks(designVersionId)).some((p) => p.id === darks.id));
  assert.ok((await h.pipeline.loadCurrentPacks(designVersionId)).some((p) => p.id === lights.id), 'the other set is untouched');

  // The file in the new pack is the normalised one: overlays off, the corrected film in place.
  const normalised = readFakePsd(await psdBytes(fresh));
  assert.equal(normalised.effectsOn, false);
  assert.equal(normalised.plates[1].data, readFakePsd(corrected).plates[1].data);
  assert.equal((fresh.manifest as StoredManifest).inks[1].coverage, 1, 'coverage is measured from the corrected film');
  assert.equal(h.pipeline.packInfo(fresh)?.supersededBy, null);
  assert.equal(h.pipeline.packInfo(fresh)?.correction?.fromPackId, darks.id);

  // The checks ran again, against the proof the artist approved.
  assert.deepEqual(h.fakes.pack.checkCalls.slice(checksBefore).map((c) => [c.technique, c.hadApprovedProof]), [['screen', true]]);

  // The artist's approval stands and nobody is asked again.
  assert.equal((await approvalOf(designId)).invalidatedAt, null);
  assert.equal((await notesFor('print.reapproval', designId)).length, 0);
  assert.equal((await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))?.status, 'approved');

  // The upload is logged against the person who made it, with the file and the job.
  const logged = h.fakes.activity.find((a) => a.actorId === worker.userId && a.entry.action === 'pack.upload' && a.entry.itemId === darks.id)!;
  assert.deepEqual(logged.entry.detail, { filename: 'MF-UNDERWRITER-TEE-v1-FRONT-CHEST-DARKS.psd', key, jobId: job.id });
});

test('the same correction twice is one correction: a job that comes back, or is queued again, builds and stores nothing more', async () => {
  const { designId, darks } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  const { key, result } = await uploadCorrection(worker, darks, edited(await psdBytes(darks), heavierFilm2));
  assert.ok(result.ok);
  const outcome = result.ok ? result.value : null!;
  const [job] = await jobsFor(key);
  const rows = (await h.packs(darks.designVersionId)).length;
  const files = h.fakes.storage.keys(`print/${designId}/`).length;
  const calls = h.fakes.engine.calls.length;
  const checks = h.fakes.pack.checkCalls.length;

  // The worker lost the job after it had finished the work, and takes it again.
  const again = await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.deepEqual((again as { upload?: unknown }).upload, { ok: true, outcome });
  assert.deepEqual(again.packIds, [outcome.newPackId]);

  // The same file for the same pack, queued again by someone: its own job, the same answer.
  const second = await h.fakes.deps.jobs!.enqueuePrintJob({ kind: 'reupload', input: job.input as PrintJobInput, createdBy: worker.userId });
  assert.equal(second.deduped, false);
  const result2 = (await h.runJob(second.jobId)) as { upload?: { ok: boolean; outcome: typeof outcome } };
  assert.deepEqual(result2.upload, { ok: true, outcome });

  assert.equal((await h.packs(darks.designVersionId)).length, rows, 'no pack was added');
  assert.equal(h.fakes.storage.keys(`print/${designId}/`).length, files, 'no file was added');
  assert.equal(h.fakes.engine.calls.length, calls);
  assert.equal(h.fakes.pack.checkCalls.length, checks, 'nothing was checked again');
});

test('a correction that changes the proof beyond the threshold withdraws the approval and asks the artist again', async () => {
  const { designId, designVersionId, darks } = await prepared({ approve: true });
  const worker = await h.staff({ prepress: 'work' });

  h.fakes.pack.options.proofState = 'review';
  try {
    const { result } = await uploadCorrection(worker, darks, edited(await psdBytes(darks), heavierFilm2));
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.ok && result.value.needsReapproval, true);
    assert.ok(result.ok && result.value.checks.some((c) => c.id === 'proof' && c.state === 'review'));
  } finally {
    h.fakes.pack.options.proofState = 'passed';
  }

  const approval = await approvalOf(designId);
  assert.ok(approval.invalidatedAt);
  assert.equal(approval.invalidatedReason, 'Pre-press corrected the films in a way that alters the proof.');
  const [note] = await notesFor('print.reapproval', designId);
  assert.match((note.payload as { message: string }).message, /changed? that alters your print proof/);
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.status, 'ready');
  assert.equal(view?.versionId, designVersionId);
  assert.equal(view?.canApprove, true);
});

test('what can be refused without opening the file is refused before any job is queued', async () => {
  const { darks, lights, dtg } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  const good = await psdBytes(darks);
  const jobsBefore = (await h.db.select().from(schema.printJobs)).length;
  const ask = async (pack: PackRow, key: string) => {
    const r = await h.prepress.uploadCorrectedPsd(worker, pack.id, key);
    return r.ok ? 'ok' : r.error;
  };

  // A key made for another pack, or for no pack, is not this pack's upload.
  const forDarks = await stored(darks, good);
  const wrongPack = "That file wasn't uploaded for this pack. Upload it again from the pack page.";
  assert.equal(await ask(lights, forDarks), wrongPack);
  assert.equal(await ask(darks, `print/${darks.designVersionId}/v1/corrected.psd`), wrongPack);
  assert.equal(await ask(darks, `prepress-uploads/${darks.id}/${randomUUID()}/notes.txt`), wrongPack);
  assert.equal(await ask(darks, `prepress-uploads/${darks.id}/../${darks.id}/a.psd`), wrongPack);
  assert.equal(await ask(darks, 'nonsense'), wrongPack);
  // The key is right but nothing is there, or what is there is empty or is not a Photoshop file.
  assert.equal(await ask(darks, `prepress-uploads/${darks.id}/${randomUUID()}/gone.psd`), "The file hasn't reached storage. Upload it again.");
  assert.equal(await ask(darks, await stored(darks, Buffer.alloc(0))), 'That file is empty.');
  assert.equal(await ask(darks, await stored(darks, Buffer.from('this is not a psd'))), "That isn't a Photoshop file. Upload the .psd you downloaded, after fixing it.");
  // Packs that cannot take a correction.
  assert.equal(await ask(dtg, await stored(dtg, good)), 'A corrected PSD is for screen packs. For DTG/DTF files, run the pack again.');
  assert.deepEqual(await h.prepress.uploadCorrectedPsd(worker, '5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11', forDarks), { ok: false, error: 'Pack not found.' });

  assert.equal((await h.db.select().from(schema.printJobs)).length, jobsBefore, 'no job was queued for any of them');
  assert.equal((await h.pipeline.loadCurrentPacks(darks.designVersionId)).length, 3);
});

test('a file the worker cannot use ends the job with the reason, once, and changes nothing', async () => {
  const { darks } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  const good = await psdBytes(darks);
  const header = good.subarray(0, 6);
  const refusal = async (bytes: Buffer) => {
    const { key, result } = await uploadCorrection(worker, darks, bytes);
    const [job] = await jobsFor(key);
    assert.equal(job.status, 'done', 'a refusal is a result, not a failure: the worker does not try it again');
    assert.equal(job.attempts, 1);
    assert.deepEqual((job.result as { packIds: string[] }).packIds, []);
    return result.ok ? 'ok' : result.error;
  };

  assert.equal(await refusal(edited(good, (psd) => void (psd.widthPx = 99))), 'The PSD is 99 × 8 px; the pack is 8 × 8 px. Keep the canvas size when you edit.');
  assert.equal(await refusal(edited(good, (psd) => void (psd.plates = []))), 'The PSD has no film layers.');
  assert.match(await refusal(Buffer.concat([header, Buffer.from('{ not json')])), /^That file could not be read as a screen PSD: /);

  // Nothing above made a pack, and the pack still takes a real correction.
  assert.equal((await h.pipeline.loadCurrentPacks(darks.designVersionId)).length, 3);
  assert.equal(h.pipeline.packInfo(await reload(darks))?.supersededBy, null);
  const { result } = await uploadCorrection(worker, darks, edited(good, heavierFilm2));
  assert.ok(result.ok);

  // Once replaced, the old pack takes no more uploads.
  const late = await uploadCorrection(worker, darks, good);
  assert.deepEqual(late.result, { ok: false, error: 'A newer pack replaced this one. Upload the corrected file to the newer one.' });
});

test('with no worker running, the upload waits, then says the rebuild is still going; the job is left for the worker', async () => {
  const { darks } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  h.pipeline.overridePrintDeps({ ...h.fakes.deps, uploadWait: { timeoutMs: 80, intervalMs: 10 } });
  try {
    const key = await stored(darks, edited(await psdBytes(darks), heavierFilm2));
    const started = Date.now();
    const result = await h.prepress.uploadCorrectedPsd(worker, darks.id, key);
    assert.deepEqual(result, { ok: false, error: 'Rebuilding the pack is taking longer than usual. It keeps running: check the pack again in a few minutes.' });
    assert.ok(Date.now() - started >= 70, 'it did wait');

    // The job is still queued; when a worker takes it the pack is rebuilt.
    const [job] = await jobsFor(key);
    assert.equal(job.status, 'queued');
    await h.runJob(job.id);
    assert.equal((await h.pipeline.loadCurrentPacks(darks.designVersionId)).filter((p) => p.screenSetKey === 'darks' && p.id !== darks.id).length, 1);
  } finally {
    h.pipeline.overridePrintDeps(h.fakes.deps);
  }
});

test('a worker that gives up on the rebuild is reported in the job’s own words', async () => {
  const { darks } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  const real = h.fakes.pack.pack.rebuildScreenSet;
  h.fakes.pack.pack.rebuildScreenSet = async () => {
    throw new Error('out of memory');
  };
  h.fakes.queue.worker = { kinds: new Set(['reupload']), delayMs: 5 };
  try {
    const result = await h.prepress.uploadCorrectedPsd(worker, darks.id, await stored(darks, edited(await psdBytes(darks), heavierFilm2)));
    assert.deepEqual(result, { ok: false, error: 'out of memory' });
  } finally {
    h.fakes.pack.pack.rebuildScreenSet = real;
    h.fakes.queue.worker = null;
    await Promise.all(h.fakes.queue.pending);
  }
  assert.equal((await h.pipeline.loadCurrentPacks(darks.designVersionId)).filter((p) => p.screenSetKey === 'darks').length, 1, 'the automatic pack is still the one in use');
  assert.equal((await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.correctedFromPackId, darks.id))).filter((p) => p.buildStatus === 'ready').length, 0);
});

test('the person asking can be given as a session that carries their access', async () => {
  const { darks } = await prepared();
  const worker = await h.staff({ prepress: 'work' });
  const viewer = await h.staff({ prepress: 'view' });
  const key = await stored(darks, edited(await psdBytes(darks), heavierFilm2));

  assert.deepEqual(await h.prepress.uploadCorrectedPsd({ actor: viewer }, darks.id, key), { ok: false, error: "You don't have Work access to Pre-press." });
  h.fakes.queue.worker = { kinds: new Set(['reupload']), delayMs: 5 };
  try {
    const result = await h.prepress.uploadCorrectedPsd({ actor: worker }, darks.id, key);
    assert.ok(result.ok, JSON.stringify(result));
  } finally {
    h.fakes.queue.worker = null;
    await Promise.all(h.fakes.queue.pending);
  }
});

// -- undoing an approval ------------------------------------------------------------

const NOT_APPROVED = "This pack isn't approved, so there is nothing to undo.";
const STARTED = "Production has already started from this pack, so its approval can't be undone.";

test('pre-press can undo approving a pack until an order starts production from it', async () => {
  const { productId, dtg, designId } = await prepared();
  const { collectJobSheet } = await import('@/lib/services/job-sheets');
  const dtgAudit = async () => (await collectJobSheet(designId))!.source.audits.find((a) => a.label.startsWith('DTG/DTF'))!;
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
  const production = await import('@/lib/services/production');
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId });
  await h.prepress.markPacksNeededForOrder(sale);
  const tabIds = async (tab: 'waiting' | 'approved') => (await h.prepress.listPrepressQueue(h.owner, { tab })).rows.map((r) => r.packId);

  assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: false, error: NOT_APPROVED }, 'nothing to undo yet');

  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  const approved = await reload(dtg);
  assert.equal(approved.auditStatus, 'approved');
  assert.equal(approved.auditedBy, worker.userId);
  assert.ok(approved.auditedAt);
  assert.deepEqual([(await dtgAudit()).state, (await dtgAudit()).by], ['approved', 'Pat Presser'], 'the design’s job sheet carries the sign-off');
  assert.ok((await tabIds('approved')).includes(dtg.id));
  assert.ok((await h.prepress.assertPacksApprovedForOrder(sale)).ok);

  // Undone: back to waiting, with the order still attached, and the sheet unsigned.
  assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: true, value: null });
  const back = await reload(dtg);
  assert.equal(back.auditStatus, 'waiting');
  assert.equal(back.auditedBy, null);
  assert.equal(back.auditedAt, null);
  assert.deepEqual(needsOf(back).map((n) => n.orderId), [sale], 'the order still needs the pack');
  assert.deepEqual([(await dtgAudit()).state, (await dtgAudit()).by, (await dtgAudit()).at], ['waiting', null, null], 'the design’s job sheet is unsigned again');
  assert.ok((await tabIds('waiting')).includes(dtg.id));
  assert.ok(!(await tabIds('approved')).includes(dtg.id));

  // Production is held until the pack is approved again.
  const stuck = await production.advance(sale);
  assert.ok(!stuck.ok && /Pre-press hasn't approved/.test(stuck.error), JSON.stringify(stuck));

  // Both actions are in the pack's history and in the activity log, under the person's name.
  const detail = (await h.prepress.getPackDetail(worker, dtg.id))!;
  assert.deepEqual(detail.history.map((e) => e.text).filter((t) => t.startsWith('Pat Presser')), ['Pat Presser approved the pack.', 'Pat Presser withdrew the approval of the pack.']);
  assert.deepEqual(
    h.fakes.activity.filter((a) => a.entry.itemId === dtg.id).map((a) => [a.actorId, a.entry.area, a.entry.action, a.entry.itemType]),
    [[worker.userId, 'prepress', 'pack.approve', 'production_pack'], [worker.userId, 'prepress', 'pack.unapprove', 'production_pack']],
  );

  // Approved again, and production starts: now the files are in use.
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  assert.ok((await production.advance(sale)).ok);
  assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: false, error: STARTED });
  assert.equal((await reload(dtg)).auditStatus, 'approved', 'a refused undo changes nothing');
  for (const stage of ['packed', 'shipped', 'delivered'] as const) {
    await h.db.update(schema.orders).set({ productionStatus: stage }).where(eq(schema.orders.id, sale));
    assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: false, error: STARTED }, stage);
  }
  // The order going back to the queue (the stage is the only thing that counts) lets it through.
  await h.db.update(schema.orders).set({ productionStatus: 'queued' }).where(eq(schema.orders.id, sale));
  assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: true, value: null });
});

test('a pack no order needs goes back to idle; a run needs to have started, wherever its order is recorded', async () => {
  const { designId, darks, dtg } = await prepared();
  const worker = await h.staff({ prepress: 'work' });

  // Approved with no order behind it: undone, it is idle again and not in the queue.
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);
  assert.deepEqual(await h.prepress.unapprovePack(worker, dtg.id), { ok: true, value: null });
  assert.equal((await reload(dtg)).auditStatus, 'idle');

  // A run of the darks. Production started on its order, so the undo is refused.
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 50, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await codeAllInks(darks);
  assert.ok((await h.prepress.approvePack(worker, darks.id)).ok);
  await h.db.update(schema.orders).set({ productionStatus: 'printing' }).where(eq(schema.orders.id, run.orderId));
  assert.deepEqual(await h.prepress.unapprovePack(worker, darks.id), { ok: false, error: STARTED });

  // The need is found through the run when it does not name the order.
  const [row] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, darks.id));
  const need = needsOf(row)[0];
  await h.db
    .update(schema.productionPacks)
    .set({ neededFor: [{ kind: 'run', bulkOrderId: run.bulkOrderId, qty: need.kind === 'run' ? need.qty : 50, at: need.at }] })
    .where(eq(schema.productionPacks.id, darks.id));
  assert.deepEqual(await h.prepress.unapprovePack(worker, darks.id), { ok: false, error: STARTED }, 'through bulk_orders');

  // Not started: back to waiting.
  await h.db.update(schema.orders).set({ productionStatus: 'queued' }).where(eq(schema.orders.id, run.orderId));
  assert.deepEqual(await h.prepress.unapprovePack(worker, darks.id), { ok: true, value: null });
  assert.equal((await reload(darks)).auditStatus, 'waiting');
});

test('undoing an approval needs Work access, and says why when it cannot be done', async () => {
  const { darks, lights, dtg } = await prepared();
  const viewer = await h.staff({ prepress: 'view' });
  const worker = await h.staff({ prepress: 'work' });
  assert.ok((await h.prepress.approvePack(worker, dtg.id)).ok);

  const denial = "You don't have Work access to Pre-press.";
  for (const [who, actor] of [['a viewer', viewer], ['an artist', artist], ['a suspended worker', { ...worker, suspended: true }]] as const) {
    assert.deepEqual(await h.prepress.unapprovePack(actor, dtg.id), { ok: false, error: denial }, who);
  }
  assert.equal((await reload(dtg)).auditStatus, 'approved', 'refused, so nothing changed');
  assert.equal(h.fakes.activity.filter((a) => a.entry.itemId === dtg.id && a.entry.action === 'pack.unapprove').length, 0, 'and nothing was logged');

  // Unknown packs, packs that were never approved, sent back, or replaced.
  assert.deepEqual(await h.prepress.unapprovePack(worker, randomUUID()), { ok: false, error: 'Pack not found.' });
  assert.deepEqual(await h.prepress.unapprovePack(worker, 'not-a-uuid'), { ok: false, error: 'Pack not found.' });
  assert.deepEqual(await h.prepress.unapprovePack(worker, lights.id), { ok: false, error: NOT_APPROVED }, 'idle');
  assert.ok((await h.prepress.sendBackToArtist(worker, darks.id, 'Please make the lettering bigger.')).ok);
  assert.deepEqual(await h.prepress.unapprovePack(worker, darks.id), { ok: false, error: NOT_APPROVED }, 'sent back');
  const rerun = await h.prepress.rerunPack(worker, lights.id, { lpi: 45 });
  assert.ok(rerun.ok);
  await h.runJob(rerun.ok ? rerun.value.jobId : '');
  assert.deepEqual(await h.prepress.unapprovePack(worker, lights.id), { ok: false, error: 'A newer pack replaced this one. Open the newer one.' });

  // As a session that carries the actor, the way the pages hold it.
  assert.deepEqual(await h.prepress.unapprovePack({ actor: worker }, dtg.id), { ok: true, value: null });
  assert.deepEqual(await h.prepress.unapprovePack({ actor: worker }, dtg.id), { ok: false, error: NOT_APPROVED }, 'twice is nothing to undo');
});

test('a film’s dot shape and resolution come from the recipe the pack was built with and from its PSD', async () => {
  const { lights } = await prepared();
  const viewer = await h.staff({ prepress: 'view' });
  const films = async () => (await h.prepress.getPackDetail(viewer, lights.id))!.films.map((f) => [f.dotShape, f.ppi]);
  assert.deepEqual(await films(), Array.from({ length: 4 }, () => ['round', 600]));

  const row = await reload(lights);
  const manifest = row.manifest as StoredManifest;
  const pipeline = manifest.pipeline!;
  const withDot = { ...manifest, pipeline: { ...pipeline, jobInput: { ...pipeline.jobInput, recipe: { ...pipeline.jobInput.recipe, halftone: { ...pipeline.jobInput.recipe.halftone, dot: 'ellipse' } } } } };
  const files = (row.files as PackFile[]).map((f) => (f.kind === 'screen_psd' ? { ...f, ppi: 720 } : f));
  await h.db.update(schema.productionPacks).set({ manifest: withDot as never, files }).where(eq(schema.productionPacks.id, lights.id));
  assert.deepEqual(await films(), Array.from({ length: 4 }, () => ['ellipse', 720]), 'the file’s own resolution, and the recipe’s dot');

  // A file that does not say falls back to the canvas the pack was cut on.
  await h.db.update(schema.productionPacks).set({ files: (row.files as PackFile[]).map((f) => (f.kind === 'screen_psd' ? { ...f, ppi: undefined } : f)) }).where(eq(schema.productionPacks.id, lights.id));
  assert.deepEqual((await films()).map((f) => f[1]), [600, 600, 600, 600]);
});

// -- the pack detail ------------------------------------------------------------------

test('the pack detail gives the auditor films, proofs, engine choices, checks and history', async () => {
  await emptyLibrary();
  const { designId, darks, dtg } = await prepared({ approve: true });
  const run = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [
      { colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' },
      { colourCode: 'C001', qty: 40, printServiceCode: 'screen_2c' },
    ],
  });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  const { runNumberFor } = await import('@/lib/services/runs');
  const runNo = await runNumberFor(run.bulkOrderId);
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: '237 c' })).ok);

  const v = (await h.prepress.getPackDetail(worker, darks.id))!;
  assert.equal(v.title, 'Underwriter tee · v1 · Front chest');
  assert.equal(v.meta, `RUN ${runNo} · 120 + 40 PIECES`);
  assert.equal(v.technique, 'screen');
  assert.equal(v.screenSetKey, 'darks');
  assert.deepEqual(v.tabs.map((t) => [t.label, t.technique, t.current]), [['Screen · Darks · 6', 'screen', true], ['Screen · Lights · 4', 'screen', false], ['DTG/DTF · 3 files', 'dtg_dtf', false]]);
  assert.equal(v.buildStatus, 'ready');
  assert.equal(v.auditStatus, 'waiting');

  assert.equal(v.films.length, 6);
  assert.deepEqual(v.films.map((f) => [f.n, f.total, f.label, f.clientName, f.pantone, f.needsPantone]), [
    [1, 6, 'Underbase', 'White underbase', null, false],
    [2, 6, 'PANTONE 237 C', 'Orchid pink', 'PANTONE 237 C', false],
    [3, 6, 'Ink 3', 'Violet', null, true],
    [4, 6, 'Ink 4', 'Indigo', null, true],
    [5, 6, 'Ink 5', 'Deep purple', null, true],
    [6, 6, 'Highlight white', 'Highlight white', null, false],
  ]);
  // A film carries its Pantone code, so it is served privately (the print-files route checks Pre-press access).
  assert.match(v.films[0].previewUrl, /^\/fake-files\/private\/print\/.+film-darks-1\.png$/);
  assert.equal(v.films[1].base, 'HB Opaque');
  assert.equal(v.films[1].mesh, 230);
  assert.equal(v.films[1].lpi, 55);
  assert.equal(v.films[1].angleDeg, 22.5);
  assert.match(v.films[1].coverage, /^\d+\.\d%$/);
  assert.deepEqual(v.films.map((f) => [f.dotShape, f.ppi]), Array.from({ length: 6 }, () => ['round', 600]), 'the recipe’s dot and the PSD’s resolution');
  // Orchid pink now has a code, so the other sets that print it are offered it.
  const lights = (await h.prepress.getPackDetail(worker, (await h.packs(darks.designVersionId)).find((p) => p.screenSetKey === 'lights')!.id))!;
  assert.deepEqual(lights.films.map((f) => [f.clientName, f.suggestion]).slice(0, 2), [['Orchid pink', { code: 'PANTONE 237 C', deltaE: 0 }], ['Violet', null]]);

  assert.deepEqual(v.proofs.map((p) => [p.garmentCode, p.garmentName, p.hex]), [['C002', 'Black', '#1B1C1E'], ['C727', 'French Navy', '#222A3D']]);
  assert.deepEqual(v.dtgFiles, []);
  assert.equal(v.dtgLoupeUrl, null);
  assert.ok(v.downloadUrl?.includes('/fake-files/private/') && v.downloadUrl.includes('download='));
  assert.match(v.downloadUrl ?? '', /-DARKS\.psd/, 'a screen pack downloads as its PSD');
  assert.equal(v.psdUrl, v.downloadUrl, 'and the PSD link is the same file');
  assert.equal(v.engine?.method, 'Spot');
  assert.equal(v.engine?.methodReason, 'Flat colours with little shading.');
  assert.equal(v.engine?.screensWhy, '6 of 8: underbase, 4 colours, highlight white. No surcharge.');
  assert.equal(v.engine?.underbase, 'Aquaflex V2 White, choked 0.2 mm, then flash.');
  assert.equal(v.engine?.order, 'Underbase, flash, colours from light to dark, highlight white last.');
  assert.equal(v.engine?.screenSets, 'Black and French Navy share one set. White has its own.');
  assert.deepEqual(v.checks.map((c) => [c.id, c.state]), [['size', 'passed'], ['plates', 'passed'], ['inks_measured', 'review'], ['proof', 'passed']]);
  assert.deepEqual(v.rerunDefaults, { method: 'spot', maxScreens: 6, lpi: 55, angleDeg: 22.5, underbaseChokeMm: 0.2, trapMm: 0.25 });

  // The history reads in the order things happened: built, approved by the artist, ordered, then what staff did.
  const history = v.history.map((e) => e.text);
  assert.deepEqual(history, ['Pack generated.', 'Artist approved version 1 (3 garment colours).', `Run ${runNo} ordered: 120 pieces.`, 'Pat Presser entered PANTONE 237 C for film 2.']);
  assert.deepEqual(v.history.map((e) => e.at), [...v.history.map((e) => e.at)].sort(), 'oldest first');

  const dtgView = (await h.prepress.getPackDetail(worker, dtg.id))!;
  assert.deepEqual(dtgView.films, []);
  assert.equal(dtgView.engine, null);
  assert.deepEqual(dtgView.dtgFiles.map((f) => [f.garmentName, f.note]), [
    ['Black', 'The colour of the shirt is left out, and white prints in white ink.'],
    ['French Navy', 'The colour of the shirt is left out, and white prints in white ink.'],
    ['White', 'White areas print no ink on this colour.'],
  ]);
  assert.ok(dtgView.dtgFiles.every((f) => f.fileName.endsWith('.png') && f.downloadUrl.includes('download=') && f.proofUrl.startsWith('/fake-files/public/')));
  // A DTG/DTF pack downloads as PNGs, in one zip; the PSD is the second link.
  assert.match(dtgView.downloadUrl ?? '', /\/fake-files\/private\/.+-DTG-DTF-PNGs\.zip\?download=.+-DTG-DTF-PNGs\.zip$/);
  assert.match(dtgView.psdUrl ?? '', /\/fake-files\/private\/.+-DTG-DTF\.psd\?download=/);
  assert.notEqual(dtgView.downloadUrl, dtgView.psdUrl);
  assert.match(dtgView.dtgLoupeUrl ?? '', /loupe-dtg-C002\.png$/);
  assert.equal(dtgView.proofs.length, 3);

  assert.equal(await h.prepress.getPackDetail(worker, '5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11'), null);
  assert.equal(await h.prepress.getPackDetail(worker, 'nope'), null);
});

// -- mock mode ---------------------------------------------------------------------------

test('PRINT_MOCK=1 returns the sample pre-press views, with access still checked', async () => {
  process.env.PRINT_MOCK = '1';
  try {
    const queue = await h.prepress.listPrepressQueue(h.owner, { tab: 'waiting' });
    assert.equal(queue.rows.length, 3);
    assert.deepEqual(queue.counts, { waiting: 3, being_fixed: 1, approved: 0, sent_back: 0 });
    assert.deepEqual((await h.prepress.listPrepressQueue(h.owner, { tab: 'approved' })).rows, []);

    const detail = await h.prepress.getPackDetail(h.owner, 'pack-xyz');
    assert.equal(detail?.packId, 'pack-xyz');
    assert.equal(detail?.title, 'Underwriter · v3 · Front');
    assert.equal(detail?.films.length, 6);
    assert.equal(detail?.canManage, true);

    assert.deepEqual(await h.prepress.approvePack(h.owner, 'pack-xyz'), { ok: true, value: null });
    assert.deepEqual(await h.prepress.unapprovePack(h.owner, 'pack-xyz'), { ok: true, value: null });
    await assert.doesNotReject(h.prepress.markPacksNeededForOrder('anything'));
    assert.deepEqual(await h.prepress.assertPacksApprovedForOrder('anything'), { ok: true, value: null });
    assert.equal((await h.inkSystem.getActiveInkSystem()).id, null);

    await assert.rejects(h.prepress.listPrepressQueue(artist, { tab: 'waiting' }), PermissionError);
    assert.equal((await h.prepress.approvePack(artist, 'pack-xyz')).ok, false);
    assert.equal((await h.prepress.unapprovePack(artist, 'pack-xyz')).ok, false);
  } finally {
    delete process.env.PRINT_MOCK;
  }
});
