// Production progress (owner request, 16 Oct 2026): the jobs the stations' iPads work on, built from the paid orders and
// runs whose print files pre-press approved; the counts, screens and stages they record; the orders that follow; and the
// website's "On the press" board. On PGlite through the real print pipeline, with the fake engine, pack writers,
// storage and queue (lib/print/test-support.ts); nothing here touches Neon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import type { Actor } from '@/lib/auth/permissions';
import type { PrintJobInput } from '@/lib/print/types';
import type { PackRow, StoredManifest } from '@/lib/print/pipeline';
import { bootstrapPrint, seedRun, type Harness } from '@/lib/print/test-support';

let h: Harness;
let pp: typeof import('@/lib/services/production-progress');
let production: typeof import('@/lib/services/production');
let stores: typeof import('@/lib/services/stores');
let team: typeof import('@/lib/services/team');
let owner: { actor: Actor };

before(async () => {
  h = await bootstrapPrint();
  pp = await import('@/lib/services/production-progress');
  production = await import('@/lib/services/production');
  stores = await import('@/lib/services/stores');
  team = await import('@/lib/services/team');
  // Every station read brings the jobs up to date here; in the app it is at most every few seconds.
  pp.productionSyncTiming.minIntervalMs = 0;
  owner = { actor: h.owner };
});

after(async () => {
  await h.close();
});

// -- helpers -------------------------------------------------------------------------------

const BLACK = 'C002';
const NAVY = 'C727';
const WHITE = 'C001';
const ref = (orderId: string) => `ORD-${orderId.slice(0, 8).toUpperCase()}`;

/** A design prepared for the default drop (darks and lights screen sets, one DTG/DTF pack) with its shop product. */
async function preparedDesign() {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const packs = await h.packs(designVersionId);
  return {
    designId,
    productId,
    darks: packs.find((p) => p.screenSetKey === 'darks')!,
    lights: packs.find((p) => p.screenSetKey === 'lights')!,
    dtg: packs.find((p) => p.technique === 'dtg_dtf')!,
  };
}

async function runQueued(kind: string): Promise<void> {
  const queued = await h.db.select().from(schema.printJobs).where(and(eq(schema.printJobs.kind, kind), eq(schema.printJobs.status, 'queued')));
  for (const job of queued) await h.runJob(job.id);
}

/** Pre-press enters a code for every colour ink and the worker rewrites the files, then approves the pack. */
async function approveScreenPack(pack: PackRow): Promise<void> {
  let code = 237;
  for (const ink of (pack.manifest as StoredManifest).inks.filter((i) => i.role === 'ink')) {
    const done = await h.pantone.assignPantone(h.owner, { packId: pack.id, plateIndex: ink.index, code: `${code++} C` });
    assert.ok(done.ok, JSON.stringify(done));
  }
  await runQueued('reupload');
  const approved = await h.prepress.approvePack(h.owner, pack.id);
  assert.ok(approved.ok, JSON.stringify(approved));
}

async function approveDtgPack(pack: PackRow): Promise<void> {
  const approved = await h.prepress.approvePack(h.owner, pack.id);
  assert.ok(approved.ok, JSON.stringify(approved));
}

/** A paid shop sale with these items, joined to the packs it needs as the payment path does. */
async function shopOrder(productId: string, items: { colour: string; size: string; qty: number }[], opts: { email?: string | null } = {}): Promise<string> {
  const [order] = await h.db
    .insert(schema.orders)
    .values({
      storeId: h.artist.storeId,
      orderType: 'pod',
      status: 'paid',
      totalAmount: 2500,
      productionStatus: 'queued',
      fanEmail: opts.email === undefined ? 'fan@merchfrom.test' : opts.email,
      shippingAddress: { line1: '12 Carrer de Mallorca', city: 'Barcelona', postcode: '08013', country: 'ES' },
    })
    .returning({ id: schema.orders.id });
  await h.db.insert(schema.orderItems).values(items.map((i) => ({ orderId: order.id, productId, quantity: i.qty, priceAtPurchase: 2500, colourCode: i.colour, size: i.size })));
  await h.prepress.markPacksNeededForOrder(order.id);
  return order.id;
}

async function jobOf(designId: string, method: 'screen' | 'dtg' | 'dtf') {
  const listed = await pp.listStationJobs(owner, 'all');
  assert.ok(listed.ok, JSON.stringify(listed));
  return listed.value.find((j) => j.designId === designId && j.method === method) ?? null;
}

async function detail(jobId: string, who: { actor: Actor } = owner) {
  const got = await pp.getStationJob(who, jobId);
  assert.ok(got.ok, JSON.stringify(got));
  return got.value;
}

async function productionStatusOf(orderId: string) {
  return (await h.db.select({ s: schema.orders.productionStatus }).from(schema.orders).where(eq(schema.orders.id, orderId)))[0].s;
}

const ok = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  assert.ok(result.ok, JSON.stringify(result));
  return result.value;
};

const refused = (result: { ok: boolean; error?: string }): string => {
  assert.equal(result.ok, false, 'it was allowed');
  return result.error ?? '';
};

// -- the migration ------------------------------------------------------------------------

test('migration 0006 is additive and runs again without failing or touching what is there', async () => {
  const source = path.resolve(__dirname, '../../drizzle');
  const statements = (await readFile(path.join(source, '0006_production_progress.sql'), 'utf8')).split('--> statement-breakpoint');
  await h.db.update(schema.artistStores).set({ showOnPressBoard: true }).where(eq(schema.artistStores.id, h.artist.storeId));
  for (const statement of statements) await h.t.client.exec(statement);
  for (const statement of statements) await h.t.client.exec(statement);
  const [store] = await h.db.select().from(schema.artistStores).where(eq(schema.artistStores.id, h.artist.storeId));
  assert.equal(store.showOnPressBoard, true, 'a value set since stays');
  await h.db.update(schema.artistStores).set({ showOnPressBoard: false }).where(eq(schema.artistStores.id, h.artist.storeId));
  const [fresh] = await h.db.insert(schema.users).values({ clerkId: 'test-optin', email: 'optin@merchfrom.test' }).returning();
  const [shop] = await h.db.insert(schema.artistStores).values({ artistId: fresh.id, slug: 'optin-shop', name: 'Optin' }).returning();
  assert.equal(shop.showOnPressBoard, false, 'a shop is off the board by default');
});

// -- the sync -------------------------------------------------------------------------------

test('an order joins a job once pre-press approves its files; the sync is idempotent and never resets a count', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  const sale = await shopOrder(productId, [
    { colour: BLACK, size: 'M', qty: 2 },
    { colour: BLACK, size: 'L', qty: 1 },
    { colour: NAVY, size: 'M', qty: 3 },
  ]);

  // Paid, but its files wait for pre-press: nothing for the stations yet.
  assert.equal(await jobOf(designId, 'dtg'), null);

  // Approving the pack brings the order in (the hook in approvePack), as a DTG job of three lines.
  await approveDtgPack(dtg);
  const job = await jobOf(designId, 'dtg');
  assert.ok(job, 'a DTG job for the design');
  assert.deepEqual([job.stage, job.total, job.printed, job.screensTotal], ['queued', 6, 0, undefined]);
  const first = await detail(job.jobId);
  assert.deepEqual(
    first.lines.map((l) => [l.orderRef, l.blankName, l.colourName, l.size, l.total, l.printed, l.position]),
    [
      [ref(sale), 'Classic tee', 'Black', 'M', 2, 0, 'Front chest · 28 cm'],
      [ref(sale), 'Classic tee', 'Black', 'L', 1, 0, 'Front chest · 28 cm'],
      [ref(sale), 'Classic tee', 'French Navy', 'M', 3, 0, 'Front chest · 28 cm'],
    ],
  );
  assert.equal(first.jobSheetUrl, `/api/job-sheets/${designId}`);
  assert.equal(first.screens.length, 0, 'DTG has no screens');

  // Counted, then synced again and again: nothing moves, nothing is added, the count stays.
  const key = first.lines[2].key;
  ok(await pp.setPrintedCount(owner, job.jobId, key, 2));
  for (let i = 0; i < 3; i++) {
    const again = await pp.syncProductionJobs();
    assert.equal(again.jobsCreated + again.linesAdded + again.linesRemoved, 0, JSON.stringify(again));
  }
  const after = await detail(job.jobId);
  assert.deepEqual(
    after.lines.map((l) => [l.key, l.total, l.printed]),
    first.lines.map((l) => [l.key, l.total, l.key === key ? 2 : 0]),
    'same lines, same keys, the count kept',
  );
  const rows = await h.db.select().from(schema.productionLines).where(eq(schema.productionLines.jobId, job.jobId));
  assert.equal(rows.length, 3, 'no line twice');
});

test('a second order of the design joins the same open job; once that job is off the press, new pieces start the next batch', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  const one = await shopOrder(productId, [{ colour: BLACK, size: 'S', qty: 1 }]);
  const two = await shopOrder(productId, [{ colour: WHITE, size: 'S', qty: 2 }]);
  const job = (await jobOf(designId, 'dtg'))!;
  assert.equal(job.total, 3, 'both orders in one batch');
  assert.deepEqual(new Set((await detail(job.jobId)).lines.map((l) => l.orderRef)), new Set([ref(one), ref(two)]));

  // Printed and on to curing: a third order waits in a new batch rather than joining one off the press.
  for (const line of (await detail(job.jobId)).lines) ok(await pp.setPrintedCount(owner, job.jobId, line.key, line.total));
  ok(await pp.setJobStage(owner, job.jobId, 'curing'));
  const three = await shopOrder(productId, [{ colour: NAVY, size: 'S', qty: 4 }]);
  const listed = ok(await pp.listStationJobs(owner, 'dtg')).filter((j) => j.designId === designId);
  assert.equal(listed.length, 2);
  const next = listed.find((j) => j.jobId !== job.jobId)!;
  assert.deepEqual([next.stage, next.total], ['queued', 4]);
  assert.equal((await detail(next.jobId)).lines[0].orderRef, ref(three));

  // Moving the first back to printing would make two open batches of the design: refused.
  const back = refused(await pp.setJobStage(owner, job.jobId, 'printing'));
  assert.match(back, /Another batch of this design is already waiting for the press/);
});

test('a total that drops below what was printed is clamped and flagged; a line the order no longer has keeps its count in the flag', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  const sale = await shopOrder(productId, [
    { colour: BLACK, size: 'M', qty: 5 },
    { colour: NAVY, size: 'M', qty: 2 },
  ]);
  const job = (await jobOf(designId, 'dtg'))!;
  const [black, navy] = (await detail(job.jobId)).lines;
  ok(await pp.setPrintedCount(owner, job.jobId, black.key, 4));
  ok(await pp.setPrintedCount(owner, job.jobId, navy.key, 2));

  // The order now asks for 3 black (an edit made by hand, say) and no navy at all.
  await h.db.update(schema.orderItems).set({ quantity: 3 }).where(and(eq(schema.orderItems.orderId, sale), eq(schema.orderItems.colourCode, BLACK)));
  await h.db.delete(schema.orderItems).where(and(eq(schema.orderItems.orderId, sale), eq(schema.orderItems.colourCode, NAVY)));
  const report = await pp.syncProductionJobs();
  assert.ok(report.linesFlagged >= 2, JSON.stringify(report));

  const lines = (await detail(job.jobId)).lines;
  const b = lines.find((l) => l.key === black.key)!;
  const n = lines.find((l) => l.key === navy.key)!;
  assert.deepEqual([b.total, b.printed, b.flag], [3, 3, '4 printed; the order now asks for 3, so 1 is extra.']);
  assert.deepEqual([n.total, n.printed, n.flag], [0, 0, '2 printed; the order now asks for 0, so 2 are extra.']);
  assert.equal(ok(await pp.listStationJobs(owner, 'dtg')).find((j) => j.jobId === job.jobId)?.flaggedLines, 2);
  // Synced again: the flagged lines and their notes stay (a line with nothing printed and no flag would go).
  await pp.syncProductionJobs();
  const again = (await detail(job.jobId)).lines;
  assert.deepEqual(
    again.map((x) => [x.key, x.total, x.printed, x.flag]),
    lines.map((x) => [x.key, x.total, x.printed, x.flag]),
  );

  // The database itself never holds more printed than the total.
  await assert.rejects(h.db.update(schema.productionLines).set({ printed: 9 }).where(eq(schema.productionLines.lineKey, b.key)));
});

test('a cancelled or refunded order leaves its job, and a job left empty leaves the stations and the board', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  const keep = await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 1 }]);
  const gone = await shopOrder(productId, [{ colour: NAVY, size: 'L', qty: 2 }]);
  const job = (await jobOf(designId, 'dtg'))!;
  ok(await pp.setPrintedCount(owner, job.jobId, (await detail(job.jobId)).lines.find((l) => l.orderRef === ref(gone))!.key, 1));

  await h.db.update(schema.orders).set({ status: 'cancelled' }).where(eq(schema.orders.id, gone));
  await pp.syncProductionJobs();
  const lines = (await detail(job.jobId)).lines;
  assert.deepEqual(
    lines.map((l) => l.orderRef),
    [ref(keep)],
    'the cancelled order is gone, printed pieces and all',
  );

  await h.db.update(schema.orders).set({ status: 'cancelled' }).where(eq(schema.orders.id, keep));
  await pp.syncProductionJobs();
  assert.equal(await jobOf(designId, 'dtg'), null, 'an empty job is not listed');
  assert.ok(!(await pp.onThePressFeed()).some((r) => r.total === 0), 'nor on the board');
});

test('a run quoted for screen print becomes a screen job with a screen per film; an embroidered line stays out', async () => {
  const { designId, darks, lights } = await preparedDesign();
  const run = await seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [
      { colourCode: BLACK, qty: 50, printServiceCode: 'screen_2c' },
      { colourCode: WHITE, qty: 20, printServiceCode: 'screen_2c' },
      { colourCode: NAVY, qty: 5, printServiceCode: 'embroidery' },
    ],
  });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  assert.equal(await jobOf(designId, 'screen'), null, 'half its files approved: not yet');
  await approveScreenPack(lights);

  const job = (await jobOf(designId, 'screen'))!;
  assert.ok(job, 'a screen job');
  assert.equal(job.total, 70, 'the embroidered pieces are not printed here');
  const darkFilms = (darks.manifest as StoredManifest).inks.length;
  const lightFilms = (lights.manifest as StoredManifest).inks.length;
  assert.deepEqual([job.screensReady, job.screensTotal], [0, darkFilms + lightFilms]);

  const d = await detail(job.jobId);
  const { runNumberFor } = await import('@/lib/services/runs');
  const runRef = `Run ${await runNumberFor(run.bulkOrderId)} · ${ref(run.orderId)}`;
  assert.deepEqual(
    d.lines.map((l) => [l.orderRef, l.colourName, l.size, l.total]),
    [
      [runRef, 'Black', 'M', 50],
      [runRef, 'White', 'M', 20],
    ],
  );
  const firstDark = d.screens.find((s) => s.packId === darks.id && s.filmNumber === 1)!;
  assert.deepEqual([firstDark.key, firstDark.setName, firstDark.position, firstDark.inkName, firstDark.status], [`${darks.id}:1`, 'Darks', `1/${darkFilms}`, 'Underbase', 'waiting']);
  const ink = d.screens.find((s) => s.packId === lights.id && s.filmNumber === 1)!;
  assert.match(ink.inkName, /^PANTONE \d+ C · /, 'a colour film names its Pantone code and its colour');
  assert.equal(d.screens.length, darkFilms + lightFilms);
});

// -- counts ---------------------------------------------------------------------------------

test('counts are clamped to 0..total, concurrent additions all land, and a bad number is refused', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 12 }]);
  const job = (await jobOf(designId, 'dtg'))!;
  const key = (await detail(job.jobId)).lines[0].key;

  // Ten iPads add one each at the same moment: every one lands (one atomic UPDATE each).
  await Promise.all(Array.from({ length: 10 }, () => pp.adjustPrintedCount(owner, job.jobId, key, 1)));
  assert.equal((await detail(job.jobId)).lines[0].printed, 10);
  // More than the total stops at the total, from either call.
  await Promise.all(Array.from({ length: 5 }, () => pp.adjustPrintedCount(owner, job.jobId, key, 1)));
  assert.equal((await detail(job.jobId)).lines[0].printed, 12);
  assert.equal(ok(await pp.setPrintedCount(owner, job.jobId, key, 500)).lines[0].printed, 12);
  // Taking away stops at none.
  assert.equal(ok(await pp.adjustPrintedCount(owner, job.jobId, key, -3)).lines[0].printed, 9);
  assert.equal(ok(await pp.adjustPrintedCount(owner, job.jobId, key, -50)).lines[0].printed, 0);
  // Sequential partial counts add up.
  for (const n of [3, 4, 2]) ok(await pp.adjustPrintedCount(owner, job.jobId, key, n));
  assert.equal((await detail(job.jobId)).printed, 9);

  assert.match(refused(await pp.setPrintedCount(owner, job.jobId, key, -1)), /whole number of pieces, 0 or more/);
  assert.match(refused(await pp.setPrintedCount(owner, job.jobId, key, 2.5)), /whole number/);
  assert.match(refused(await pp.adjustPrintedCount(owner, job.jobId, key, Number.NaN)), /whole number/);
  assert.match(refused(await pp.adjustPrintedCount(owner, job.jobId, 'not-a-line', 1)), /not on this job/);
  assert.match(refused(await pp.adjustPrintedCount(owner, '00000000-0000-4000-8000-000000000000', key, 1)), /job was not found/);
  assert.match(refused(await pp.adjustPrintedCount(owner, 'nonsense', key, 1)), /job was not found/);
});

// -- screens and stages ---------------------------------------------------------------------

test('screen and stage guards: screens before printing, every piece before curing, force, shipping by orders only', async () => {
  const { designId, darks, lights } = await preparedDesign();
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: BLACK, qty: 4, printServiceCode: 'screen_2c' }, { colourCode: WHITE, qty: 2, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  await approveScreenPack(lights);
  const job = (await jobOf(designId, 'screen'))!;
  let d = await detail(job.jobId);
  const [blackLine] = d.lines;

  // No printing, and no count, before the screens are ready.
  assert.match(refused(await pp.setJobStage(owner, job.jobId, 'printing')), /^\d+ of \d+ screens aren't ready yet\. Mark them ready first, or force the move\.$/);
  assert.match(refused(await pp.adjustPrintedCount(owner, job.jobId, blackLine.key, 1)), /isn't printing yet: .* Mark the screens ready first\./);
  assert.match(refused(await pp.setScreenStatus(owner, job.jobId, d.screens[0].key, 'reclaimed')), /Reclaim the screens once the job is off the press/);
  assert.match(refused(await pp.setScreenStatus(owner, job.jobId, d.screens[0].key, 'dried' as never)), /not one of waiting/);
  assert.match(refused(await pp.setScreenStatus(owner, job.jobId, 'pack:99', 'screen_ready')), /screen is not on this job/);

  // The first screen moving on takes the job to Screens.
  d = ok(await pp.setScreenStatus(owner, job.jobId, d.screens[0].key, 'film_printed'));
  assert.equal(d.stage, 'screens');
  for (const screen of d.screens) d = ok(await pp.setScreenStatus(owner, job.jobId, screen.key, 'screen_ready'));
  assert.equal(d.screensReady, d.screensTotal);

  // Ready: a count starts the job printing.
  d = ok(await pp.adjustPrintedCount(owner, job.jobId, blackLine.key, 4));
  assert.equal(d.stage, 'printing');
  // Curing waits for every piece, unless forced.
  assert.match(refused(await pp.setJobStage(owner, job.jobId, 'curing')), /^4 of 6 pieces are printed\. Count the rest first, or force the move\.$/);
  assert.match(refused(await pp.setJobStage(owner, job.jobId, 'shipped')), /once every order in it has shipped/);
  assert.match(refused(await pp.setJobStage(owner, job.jobId, 'boxed' as never)), /not one of queued/);
  d = ok(await pp.setJobStage(owner, job.jobId, 'curing', { force: true }));
  assert.equal(d.stage, 'curing');
  // Off the press, screens can be reclaimed.
  d = ok(await pp.setScreenStatus(owner, job.jobId, d.screens[0].key, 'reclaimed'));
  assert.equal(d.screens.find((s) => s.key === d.screens[0].key)?.status, 'reclaimed');
  // A mistake is put right by moving back.
  assert.equal(ok(await pp.setJobStage(owner, job.jobId, 'printing')).stage, 'printing');

  const activity = await team.listActivity(h.owner, { itemType: 'production_job', itemId: job.jobId, limit: 100 });
  const summaries = activity.map((a) => a.summary);
  assert.ok(summaries.some((s) => /^Moved .* from Printing to Curing \(forced\)$/.test(s)), summaries.join('\n'));
  assert.ok(summaries.some((s) => /^Screen 1\/\d+ \(Darks, Underbase\) of .*: film printed$/.test(s)), summaries.join('\n'));
  assert.ok(summaries.some((s) => /^Counted 4 of 4 printed on .*, Run \d+ · ORD-[0-9A-F]{8}, size M$/.test(s)), summaries.join('\n'));
  assert.ok(activity.every((a) => a.actorId === h.owner.userId && a.area === 'production'));
});

test('a DTG job has no screens stage and counts start it printing at once', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 2 }]);
  const job = (await jobOf(designId, 'dtg'))!;
  assert.match(refused(await pp.setJobStage(owner, job.jobId, 'screens')), /DTG and DTF jobs have no screens/);
  assert.match(refused(await pp.setScreenStatus(owner, job.jobId, 'x:1', 'screen_ready')), /DTG and DTF jobs have no screens/);
  const d = ok(await pp.adjustPrintedCount(owner, job.jobId, (await detail(job.jobId)).lines[0].key, 1));
  assert.equal(d.stage, 'printing');
  // The same stage again changes nothing.
  assert.equal(ok(await pp.setJobStage(owner, job.jobId, 'printing')).stage, 'printing');
});

// -- the order follows ---------------------------------------------------------------------

test('the first printed piece moves the order to printing; every piece printed and folded packs it; shipping it ships the job', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  // No fan email: shipping it writes no email to the dev outbox.
  const sale = await shopOrder(
    productId,
    [
      { colour: BLACK, size: 'M', qty: 2 },
      { colour: NAVY, size: 'L', qty: 1 },
    ],
    { email: null },
  );
  const job = (await jobOf(designId, 'dtg'))!;
  const [m, l] = (await detail(job.jobId)).lines;
  assert.equal(await productionStatusOf(sale), 'queued');

  ok(await pp.adjustPrintedCount(owner, job.jobId, m.key, 1));
  assert.equal(await productionStatusOf(sale), 'printing', 'the first piece');
  ok(await pp.setPrintedCount(owner, job.jobId, m.key, 2));
  ok(await pp.setPrintedCount(owner, job.jobId, l.key, 1));
  assert.equal(await productionStatusOf(sale), 'printing', 'printed, not yet folded');
  ok(await pp.setJobStage(owner, job.jobId, 'curing'));
  assert.equal(await productionStatusOf(sale), 'printing');
  ok(await pp.setJobStage(owner, job.jobId, 'folding'));
  assert.equal(await productionStatusOf(sale), 'packed', 'printed and folded: packed');

  // Shipping stays the Production page's step, with its tracking; the job follows.
  assert.ok(!(await production.advance(sale)).ok, 'no shipping without tracking');
  const shipped = await production.advance(sale, 'shipped', { carrier: 'Correos', code: 'PQ123' });
  assert.ok(shipped.ok, JSON.stringify(shipped));
  assert.equal(await jobOf(designId, 'dtg'), null, 'a shipped job leaves the stations');
  const [row] = await h.db.select().from(schema.productionJobs).where(eq(schema.productionJobs.id, job.jobId));
  assert.equal(row.stage, 'shipped');
  assert.ok(row.shippedAt);

  const words = (await team.listActivity(h.owner, { itemType: 'order', itemId: sale })).map((a) => a.summary);
  assert.ok(words.includes(`Order ${ref(sale)} is printing: its first piece is printed`), words.join('\n'));
  assert.ok(words.includes(`Order ${ref(sale)} is packed: every piece is printed and folded`), words.join('\n'));
});

test('an order in two jobs is packed only when both have reached folding, and an order with an untracked piece is left for Production', async () => {
  const { designId, darks, lights, dtg } = await preparedDesign();
  // Black by screen, French Navy by DTG/DTF: one run, two jobs.
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: BLACK, qty: 2, printServiceCode: 'screen_2c' }, { colourCode: NAVY, qty: 1, printServiceCode: 'dtg' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  await approveDtgPack(dtg);
  void lights;
  const screenJob = (await jobOf(designId, 'screen'))!;
  const dtgJob = (await jobOf(designId, 'dtg'))!;
  assert.ok(screenJob && dtgJob, 'one job per method');

  for (const s of (await detail(screenJob.jobId)).screens) ok(await pp.setScreenStatus(owner, screenJob.jobId, s.key, 'screen_ready'));
  ok(await pp.setPrintedCount(owner, screenJob.jobId, (await detail(screenJob.jobId)).lines[0].key, 2));
  ok(await pp.setJobStage(owner, screenJob.jobId, 'folding'));
  assert.equal(await productionStatusOf(run.orderId), 'printing', 'the DTG half is not printed yet');
  ok(await pp.setPrintedCount(owner, dtgJob.jobId, (await detail(dtgJob.jobId)).lines[0].key, 1));
  ok(await pp.setJobStage(owner, dtgJob.jobId, 'folding'));
  assert.equal(await productionStatusOf(run.orderId), 'packed');

  // A shop order with an embroidered piece beside the printed one: printed and folded, but not packed by the stations.
  const { designId: other, productId, dtg: otherDtg } = await preparedDesign();
  await approveDtgPack(otherDtg);
  const [embroidered] = await h.db.insert(schema.products).values({ storeId: h.artist.storeId, designId: null, blankCode: 'STTU169', printServiceCode: 'embroidery', name: 'Embroidered cap' }).returning();
  const mixed = await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 1 }]);
  await h.db.insert(schema.orderItems).values({ orderId: mixed, productId: embroidered.id, quantity: 1, priceAtPurchase: 2000, colourCode: BLACK, size: 'OS' });
  const job = (await jobOf(other, 'dtg'))!;
  ok(await pp.setPrintedCount(owner, job.jobId, (await detail(job.jobId)).lines[0].key, 1));
  ok(await pp.setJobStage(owner, job.jobId, 'folding'));
  assert.equal(await productionStatusOf(mixed), 'printing', 'the cap is not something the stations count');
});

// -- who may ---------------------------------------------------------------------------------

test('Production View reads, Work changes; artists, other areas and paused staff are refused', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 3 }]);
  const job = (await jobOf(designId, 'dtg'))!;
  const key = (await detail(job.jobId)).lines[0].key;

  const viewer = { actor: await h.staff({ production: 'view' }) };
  const worker = { actor: await h.staff({ production: 'work' }) };
  const prepressOnly = { actor: await h.staff({ prepress: 'manage' }) };
  const paused = { actor: await h.staff({ production: 'manage' }, { suspended: true }) };
  const artist = { actor: { userId: h.artist.userId, role: 'artist' } as Actor };

  assert.ok(ok(await pp.listStationJobs(viewer, 'dtg')).some((j) => j.jobId === job.jobId));
  assert.equal((await detail(job.jobId, viewer)).canWork, false);
  assert.equal((await detail(job.jobId, worker)).canWork, true);
  const noWork = "You don't have Work access to Production.";
  assert.equal(refused(await pp.adjustPrintedCount(viewer, job.jobId, key, 1)), noWork);
  assert.equal(refused(await pp.setPrintedCount(viewer, job.jobId, key, 1)), noWork);
  assert.equal(refused(await pp.setJobStage(viewer, job.jobId, 'printing')), noWork);
  assert.equal(refused(await pp.setScreenStatus(viewer, job.jobId, 'x:1', 'screen_ready')), noWork);
  assert.equal(refused(await pp.setHiddenFromBoard(viewer, job.jobId, true)), noWork);

  const noView = "You don't have View access to Production.";
  for (const who of [prepressOnly, paused, artist]) {
    assert.equal(refused(await pp.listStationJobs(who, 'all')), noView);
    assert.equal(refused(await pp.getStationJob(who, job.jobId)), noView);
    assert.equal(refused(await pp.adjustPrintedCount(who, job.jobId, key, 1)), noWork);
  }
  assert.equal(ok(await pp.adjustPrintedCount(worker, job.jobId, key, 2)).lines[0].printed, 2);
  assert.match(refused(await pp.listStationJobs(owner, 'embroidery' as never)), /not one of screen, DTG, DTF or all/);
  assert.ok(ok(await pp.listStationJobs(owner, 'screen')).every((j) => j.method === 'screen'));
  // Nothing the refused calls tried was written.
  assert.equal((await detail(job.jobId)).lines[0].printed, 2);
});

// -- the website's board ----------------------------------------------------------------------

test('the board shows "Private" until the shop opts in, the stage words, and nothing personal; hidden and old shipped jobs stay off', async () => {
  const { designId, productId, dtg, darks, lights } = await preparedDesign();
  await approveDtgPack(dtg);
  const sale = await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 3 }], { email: 'private.fan@example.com' });
  const job = (await jobOf(designId, 'dtg'))!;
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: BLACK, qty: 10, printServiceCode: 'screen_2c' }, { colourCode: WHITE, qty: 5, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  await approveScreenPack(lights);
  const screenJob = (await jobOf(designId, 'screen'))!;

  const hashId = (jobId: string) => createHash('sha256').update(`press-board:${jobId}`).digest('hex').slice(0, 12);
  const rowFor = async (jobId: string) => (await pp.onThePressFeed()).find((r) => r.id === hashId(jobId));

  await stores.setPressBoardOptIn(h.artist.storeId, false);
  let row = await rowFor(job.jobId);
  assert.deepEqual(row && { ...row, updatedAt: 'x' }, { id: hashId(job.jobId), run: job.runNumber, client: 'Private', piece: 'Classic tee', printed: 0, total: 3, ink: 'Full colour (DTG)', stage: 'QUEUED', updatedAt: 'x' });
  assert.ok(Number.isInteger(job.runNumber) && job.runNumber >= 1001, `the job has its number (${job.runNumber})`);

  // Opted in: the shop's name, and only that.
  assert.equal(await stores.setPressBoardOptIn(h.artist.storeId, true), true);
  const [store] = await h.db.select().from(schema.artistStores).where(eq(schema.artistStores.id, h.artist.storeId));
  ok(await pp.adjustPrintedCount(owner, job.jobId, (await detail(job.jobId)).lines[0].key, 2));
  row = await rowFor(job.jobId);
  assert.deepEqual([row?.client, row?.printed, row?.total, row?.stage], [store.name, 2, 3, 'ON THE PRESS']);

  const screenRow = (await rowFor(screenJob.jobId))!;
  const colours = Math.max(...[darks, lights].map((p) => (p.manifest as StoredManifest).inks.filter((i) => i.role !== 'underbase').length));
  assert.deepEqual([screenRow.ink, screenRow.stage, screenRow.total], [`${colours} colours`, 'QUEUED', 15]);

  // Every stage in the board's words.
  const words: Record<string, string> = {};
  for (const stage of ['curing', 'folding'] as const) {
    ok(await pp.setJobStage(owner, job.jobId, stage, { force: true }));
    words[stage] = (await rowFor(job.jobId))!.stage;
  }
  ok(await pp.setScreenStatus(owner, screenJob.jobId, (await detail(screenJob.jobId)).screens[0].key, 'film_printed'));
  words.screens = (await rowFor(screenJob.jobId))!.stage;
  assert.deepEqual(words, { curing: 'CURING', folding: 'FOLDING', screens: 'SCREENS' });

  // Nothing personal, whatever the shop chose: no email, no order, no address, no internal id.
  const everything = JSON.stringify(await pp.onThePressFeed());
  for (const secret of ['private.fan@example.com', 'artist@merchfrom.test', '@', sale, sale.slice(0, 8).toUpperCase(), 'ORD-', run.orderId, run.bulkOrderId, 'Mallorca', '08013', job.jobId, screenJob.jobId, designId, h.artist.storeId]) {
    assert.ok(!everything.includes(secret), `the board leaks ${secret}`);
  }
  for (const r of await pp.onThePressFeed()) assert.deepEqual(Object.keys(r).sort(), ['client', 'id', 'ink', 'piece', 'printed', 'run', 'stage', 'total', 'updatedAt']);

  // Hidden by staff: off the board, still at the station.
  ok(await pp.setHiddenFromBoard(owner, job.jobId, true));
  assert.equal(await rowFor(job.jobId), undefined);
  assert.equal((await detail(job.jobId)).hiddenFromBoard, true);
  ok(await pp.setHiddenFromBoard(owner, job.jobId, false));
  assert.ok(await rowFor(job.jobId));

  // Shipped: on the board for 48 hours, then off.
  await h.db.update(schema.productionJobs).set({ stage: 'shipped', shippedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }).where(eq(schema.productionJobs.id, job.jobId));
  const shippedRow = await rowFor(job.jobId);
  assert.equal(shippedRow?.stage, 'SHIPPED');
  // 2 of 3 were counted at the station, but every order of the job has shipped: the board shows every piece made.
  assert.deepEqual([shippedRow?.printed, shippedRow?.total], [3, 3]);
  await h.db.update(schema.productionJobs).set({ shippedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) }).where(eq(schema.productionJobs.id, job.jobId));
  assert.equal(await rowFor(job.jobId), undefined);

  // Opting out again puts the rows back to Private.
  await stores.setPressBoardOptIn(h.artist.storeId, false);
  assert.equal((await rowFor(screenJob.jobId))?.client, 'Private');
});

// -- the hooks --------------------------------------------------------------------------------

test('an order paid for a design whose files are already approved reaches the stations as it is paid', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  assert.equal(await jobOf(designId, 'dtg'), null, 'nothing ordered yet');
  // markPacksNeededForOrder is the paid hook of both shop sales (markPaid) and runs (markBulkPaid).
  const [order] = await h.db.insert(schema.orders).values({ storeId: h.artist.storeId, status: 'paid', productionStatus: 'queued', totalAmount: 100 }).returning();
  await h.db.insert(schema.orderItems).values({ orderId: order.id, productId, quantity: 2, priceAtPurchase: 100, colourCode: WHITE, size: 'XL' });
  await h.prepress.markPacksNeededForOrder(order.id);
  const rows = await h.db.select().from(schema.productionLines).where(eq(schema.productionLines.orderId, order.id));
  assert.deepEqual(
    rows.map((r) => [r.size, r.total, r.printed]),
    [['XL', 2, 0]],
  );
  const jobs = await h.db.select().from(schema.printJobs);
  assert.ok(jobs.every((j) => (j.input as PrintJobInput).designId !== designId || j.status !== 'queued'), 'no build started for files that exist');
});

// -- the activity log, the order's moves and the board's rows ------------------------------------

test('count taps by one person on one line are one activity row; another line, another person or a pause get their own; stages keep a row each', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  await shopOrder(
    productId,
    [
      { colour: BLACK, size: 'M', qty: 10 },
      { colour: BLACK, size: 'L', qty: 5 },
    ],
    { email: null },
  );
  const job = (await jobOf(designId, 'dtg'))!;
  const [m, l] = (await detail(job.jobId)).lines;
  const worker = { actor: await h.staff({ production: 'work' }) };

  for (let i = 0; i < 4; i++) ok(await pp.adjustPrintedCount(owner, job.jobId, m.key, 1));
  ok(await pp.setPrintedCount(owner, job.jobId, m.key, 6));
  ok(await pp.adjustPrintedCount(owner, job.jobId, l.key, 2));
  ok(await pp.adjustPrintedCount(worker, job.jobId, m.key, 1));
  ok(await pp.setJobStage(owner, job.jobId, 'curing', { force: true }));
  ok(await pp.setJobStage(owner, job.jobId, 'printing'));

  const rows = async () => h.db.select().from(schema.staffActivity).where(and(eq(schema.staffActivity.itemType, 'production_job'), eq(schema.staffActivity.itemId, job.jobId)));
  type CountDetail = { lineKey: string; printed: number; total: number; from: number; added: number; taps: number; summary: string };
  const countRows = (all: Awaited<ReturnType<typeof rows>>, actorId: string, lineKey: string) =>
    all.filter((r) => r.action === 'production.count' && r.actorId === actorId && (r.detail as CountDetail).lineKey === lineKey);

  const all = await rows();
  const mine = countRows(all, h.owner.userId, m.key);
  assert.equal(mine.length, 1, 'five taps on one line, one row');
  const merged = mine[0].detail as CountDetail;
  assert.deepEqual([merged.printed, merged.total, merged.from, merged.added, merged.taps], [6, 10, 0, 6, 5]);
  assert.match(merged.summary, /^Counted 6 of 10 printed on .* \(DTG\), ORD-[0-9A-F]{8}, size M \(from 0, in 5 taps\)$/);

  const other = countRows(all, h.owner.userId, l.key);
  assert.equal(other.length, 1, 'another line: a row of its own');
  assert.match((other[0].detail as CountDetail).summary, /^Counted 2 of 5 printed on .*, size L$/);
  const theirs = countRows(all, worker.actor.userId, m.key);
  assert.equal(theirs.length, 1, 'another person: a row of their own');
  assert.deepEqual([(theirs[0].detail as CountDetail).from, (theirs[0].detail as CountDetail).printed], [6, 7]);
  assert.equal(all.filter((r) => r.action === 'production.stage').length, 2, 'every stage change keeps its own row');

  // A minute's pause: the next tap starts a new row.
  await h.db
    .update(schema.staffActivity)
    .set({ detail: sql`${schema.staffActivity.detail} || jsonb_build_object('lastAtMs', ${Date.now() - 61_000}::bigint)` })
    .where(eq(schema.staffActivity.id, mine[0].id));
  ok(await pp.adjustPrintedCount(owner, job.jobId, m.key, 1));
  const after = countRows(await rows(), h.owner.userId, m.key);
  assert.equal(after.length, 2);
  assert.ok(after.some((r) => (r.detail as CountDetail).taps === 1 && (r.detail as CountDetail).printed === 8 && (r.detail as CountDetail).from === 7));
});

test('two iPads starting one order at once move it once, and the move is logged once; a move from a status the order has left is refused', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  await approveDtgPack(dtg);
  const sale = await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 4 }], { email: null });
  const job = (await jobOf(designId, 'dtg'))!;
  const [line] = (await detail(job.jobId)).lines;
  const worker = { actor: await h.staff({ production: 'work' }) };

  await Promise.all([pp.adjustPrintedCount(owner, job.jobId, line.key, 1), pp.adjustPrintedCount(worker, job.jobId, line.key, 1)]);
  assert.equal(await productionStatusOf(sale), 'printing');
  assert.equal((await detail(job.jobId)).lines[0].printed, 2, 'both counts landed');
  const words = (await team.listActivity(h.owner, { itemType: 'order', itemId: sale })).map((a) => a.summary);
  assert.equal(words.filter((w) => w.startsWith(`Order ${ref(sale)} is printing`)).length, 1, words.join('\n'));

  const late = await production.advanceFrom(sale, 'queued', 'printing');
  assert.equal(late.ok, false);
  assert.equal(await productionStatusOf(sale), 'printing');
  // One step only, never a skip or a stay.
  assert.match(refused(await production.advanceFrom(sale, 'printing', 'shipped')), /one step at a time/);
  assert.match(refused(await production.advanceFrom(sale, 'printing', 'printing')), /one step at a time/);
  assert.equal(await productionStatusOf(sale), 'printing');

  // The single writer itself: of two moves from the same status at the same moment, one lands.
  const other = await shopOrder(productId, [{ colour: NAVY, size: 'S', qty: 1 }], { email: null });
  const both = await Promise.all([production.advanceFrom(other, 'queued', 'printing'), production.advanceFrom(other, 'queued', 'printing')]);
  assert.equal(both.filter((r) => r.ok).length, 1, JSON.stringify(both.map((r) => (r.ok ? 'ok' : r.error))));
  assert.equal(await productionStatusOf(other), 'printing');
});

test('a board with more jobs than it holds keeps what is on the press and nearest to done; the queue gives way first', () => {
  const at = (n: number) => Date.UTC(2026, 9, 16, 9, 0, n);
  const queued = Array.from({ length: 70 }, (_, i) => ({ id: `q${i}`, stage: 'queued' as const, createdAt: at(i), updatedAt: at(i) }));
  const others = [
    { id: 'press', stage: 'printing' as const, createdAt: at(200), updatedAt: at(200) },
    { id: 'folding', stage: 'folding' as const, createdAt: at(100), updatedAt: at(300) },
    { id: 'shipped', stage: 'shipped' as const, createdAt: at(50), updatedAt: at(400) },
  ];
  const shown = pp.boardSelection([...queued, ...others], 60);
  assert.equal(shown.length, 60);
  for (const id of ['press', 'folding', 'shipped']) assert.ok(shown.some((r) => r.id === id), id);
  assert.ok(!shown.some((r) => r.id === 'q0'), 'the queue loses its oldest rows first');
  assert.deepEqual(
    [...new Set(shown.map((r) => r.stage))],
    ['queued', 'printing', 'folding', 'shipped'],
    'then read in the order of the stages',
  );
  assert.deepEqual(pp.boardSelection(others, 60).map((r) => r.id), ['press', 'folding', 'shipped']);
});
