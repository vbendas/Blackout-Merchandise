// The stations on the real thing: my actions, my job sheet view and my screen matching against PS-A's service
// (lib/services/production-progress.ts), on a design that went through the real print pipeline (fake engine and storage) with paid orders
// and approved files. What this proves is the seam: the screens a job lists are the films of the job sheet's sets (by pack and press position);
// the words the service refuses a move in are the ones the iPad asks about first; what the iPad shows before an answer (the counter logic,
// the pending changes laid over the job) is what the service answers; and a count made through an action is the service's own.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import type { PackRow, StoredManifest } from '@/lib/print/pipeline';
import { bootstrapPrint, seedRun, type Harness } from '@/lib/print/test-support';
import type { ProductionStage, StationJobDetail } from '@/lib/services/production-progress';
import { matchFilms } from '@/components/station/films';
import { screenIsReady, screensBlocking, stageWarnings } from '@/components/station/model';
import { applyOps, type Op } from '@/components/station/ops';

process.env.AUTH_DEV_BYPASS = '1';
delete process.env.AUTH_DEV_ROLE;
delete process.env.AUTH_DEV_EMAIL;
delete process.env.ADMIN_EMAILS;
delete process.env.STATION_MOCK;

let h: Harness;
let auth: typeof import('@/lib/auth');
let actions: typeof import('./actions');
let data: typeof import('./data');
let pp: typeof import('@/lib/services/production-progress');
let devId: string;

before(async () => {
  h = await bootstrapPrint();
  auth = await import('@/lib/auth');
  pp = await import('@/lib/services/production-progress');
  actions = await import('./actions');
  data = await import('./data');
  // Every station read brings the jobs up to date here; in the app it is at most every few seconds.
  pp.productionSyncTiming.minIntervalMs = 0;
  devId = (await auth.requireUser()).user.id;
  await setDev('staff', { production: 'work' });
});

after(async () => {
  await h.close();
});

async function setDev(role: 'artist' | 'staff' | 'admin', permissions: Record<string, string> = {}) {
  await h.db.update(schema.users).set({ role }).where(eq(schema.users.id, devId));
  await h.db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, devId));
  const rows = Object.entries(permissions).map(([area, level]) => ({ userId: devId, area, level }));
  if (rows.length > 0) await h.db.insert(schema.staffPermissions).values(rows);
}

// -- fixtures, as production-progress.test.ts makes them -------------------------------------

const BLACK = 'C002';
const WHITE = 'C001';

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

async function shopOrder(productId: string, items: { colour: string; size: string; qty: number }[]): Promise<string> {
  const [order] = await h.db
    .insert(schema.orders)
    .values({ storeId: h.artist.storeId, orderType: 'pod', status: 'paid', totalAmount: 2500, productionStatus: 'queued', fanEmail: 'fan@merchfrom.test', shippingAddress: { line1: '12 Carrer de Mallorca', city: 'Barcelona', postcode: '08013', country: 'ES' } })
    .returning({ id: schema.orders.id });
  await h.db.insert(schema.orderItems).values(items.map((i) => ({ orderId: order.id, productId, quantity: i.qty, priceAtPurchase: 2500, colourCode: i.colour, size: i.size })));
  await h.prepress.markPacksNeededForOrder(order.id);
  return order.id;
}

/** A queue read the way the page makes it: through the action, as the signed-in person. */
async function queue() {
  const result = await actions.refreshQueueAction([]);
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}

async function jobPage(jobId: string) {
  const session = await auth.requireUser();
  const result = await data.loadJob(session, jobId);
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}

const refused = (result: { ok: boolean; error?: string }): string => {
  assert.equal(result.ok, false, 'it was allowed');
  return result.error ?? '';
};

const ok = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  assert.ok(result.ok, JSON.stringify(result));
  return result.value;
};

// -- the tests ---------------------------------------------------------------------------------

test('the screens of a real screen job are the films of the job sheet’s sets: every one matched, by pack and press position, with the ink the service names', async () => {
  const { designId, darks, lights } = await preparedDesign();
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: BLACK, qty: 50, printServiceCode: 'screen_2c' }, { colourCode: WHITE, qty: 20, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  await approveScreenPack(lights);

  const listed = await queue();
  const summary = listed.jobs.find((j) => j.designId === designId && j.method === 'screen');
  assert.ok(summary, 'the queue has the screen job');
  // the proof a card shows: one of the design's own, from print storage
  assert.match(listed.thumbs[designId].screen ?? '', /^\/fake-files\/public\/print\/.+\/proof-screen-/);

  const { job, view, sheetProblem } = await jobPage(summary.jobId);
  assert.equal(sheetProblem, null);
  assert.ok(view);
  assert.deepEqual(view.screenSets.map((s) => s.packId).sort(), [darks.id, lights.id].sort(), 'the sheet’s sets carry the packs the service’s screens are in');

  const groups = matchFilms(view, job.screens);
  assert.equal(groups.length, 2);
  for (const group of groups) {
    assert.ok(group.set, `${group.setName} has its set on the sheet`);
    for (const { screen, film } of group.rows) {
      assert.ok(film, `screen ${screen.position} of ${screen.setName} has its film`);
      assert.equal(film.position, screen.position);
      // an underbase is the underbase; a colour film's code is the start of the name the service gives its screen
      if (film.role === 'ink') assert.ok(screen.inkName.startsWith(film.label), `${screen.inkName} starts with ${film.label}`);
      else assert.equal(screen.inkName, film.label);
    }
    assert.equal(group.rows.length, group.set.screens);
  }
  assert.ok(groups.flatMap((g) => g.rows).some((r) => r.film?.pantone?.startsWith('PANTONE 237')), 'the Pantone codes pre-press entered are on the iPad');
  assert.deepEqual(groups.map((g) => g.key).sort(), [darks.id, lights.id].sort());
});

test('what the iPad asks about before a move is what the service holds it up for, word for word; forced, it goes through', async () => {
  const { designId, darks, lights } = await preparedDesign();
  const run = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: BLACK, qty: 8, printServiceCode: 'screen_2c' }, { colourCode: WHITE, qty: 4, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run.orderId);
  await approveScreenPack(darks);
  await approveScreenPack(lights);
  const summary = (await queue()).jobs.find((j) => j.designId === designId)!;
  let job = (await jobPage(summary.jobId)).job;

  // Counting waits for the screens, in the words the screen shows beside the held counters.
  const held = refused(await actions.adjustPrintedAction(job.jobId, job.lines[0].key, 1));
  assert.equal(held, `This job isn't printing yet: ${screensBlocking(job.screens)} Mark the screens ready first.`);

  // A move to printing: the iPad's own pre-check says what the service then says (before it adds "Mark them ready first, or force the move.")
  const [warning] = stageWarnings(job, 'printing');
  assert.equal(refused(await actions.setStageAction(job.jobId, 'printing')), `${warning} Mark them ready first, or force the move.`);

  // Screens ready, one at a time: the iPad's own count of what is ready follows the service's (a screen reclaimed was ready once)
  let expected = job;
  for (const [i, screen] of job.screens.entries()) {
    const op: Op = { id: i + 1, kind: 'screen', screenKey: screen.key, status: i % 2 === 0 ? 'screen_ready' : 'on_press' };
    expected = applyOps(expected, [op]);
    job = ok(await actions.setScreenStatusAction(job.jobId, screen.key, op.status));
    assert.deepEqual(
      [expected.screensReady, expected.screens.map((s) => s.status)],
      [job.screensReady, job.screens.map((s) => s.status)],
      `after screen ${i + 1}`,
    );
  }
  assert.equal(job.screensReady, job.screens.length);
  assert.equal(job.screens.every((s) => screenIsReady(s.status)), true);
  assert.equal(job.stage, 'screens', 'the first screen that moved on took the queued job to Screens');
  assert.equal(screensBlocking(job.screens), null);

  // The first count starts it printing, and what the iPad shows before the answer is the answer.
  const line = job.lines[0];
  const shown = applyOps(job, [{ id: 99, kind: 'adjust', lineKey: line.key, delta: 3 }]);
  const answered = ok(await actions.adjustPrintedAction(job.jobId, line.key, 3));
  assert.equal(answered.stage, 'printing');
  assert.deepEqual([shown.lines.map((l) => l.printed), shown.printed], [answered.lines.map((l) => l.printed), answered.printed]);

  // A move to curing with pieces left to print: the pre-check and the service agree, and forced it goes.
  const [pieces] = stageWarnings(answered, 'curing');
  assert.equal(refused(await actions.setStageAction(job.jobId, 'curing')), `${pieces} Count the rest first, or force the move.`);
  const cured = ok(await actions.setStageAction(job.jobId, 'curing', true));
  assert.equal(cured.stage, 'curing');
  assert.equal(stageWarnings(cured, 'printing').length, 0, 'back is never asked about');
  assert.equal(ok(await actions.setStageAction(job.jobId, 'printing')).stage, 'printing');

  // Shipping is Production's: even forced.
  assert.match(refused(await actions.setStageAction(job.jobId, 'shipped', true)), /A job reads shipped once every order in it has shipped/);
});

test('what the counter logic shows is what the service answers: clamps at the total and at none, exact entry, and several taps in a row', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  const approved = await h.prepress.approvePack(h.owner, dtg.id);
  assert.ok(approved.ok);
  await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 12 }, { colour: WHITE, size: 'L', qty: 5 }]);
  const summary = (await queue()).jobs.find((j) => j.designId === designId && j.method === 'dtg')!;
  assert.ok(summary);
  let job = (await jobPage(summary.jobId)).job;
  assert.equal(job.stage, 'queued');
  assert.equal(job.screens.length, 0);
  const [m, l] = job.lines;

  const steps: { op: Op; call: () => Promise<{ ok: boolean; value?: StationJobDetail }> }[] = [
    { op: { id: 1, kind: 'adjust', lineKey: m.key, delta: 5 }, call: () => actions.adjustPrintedAction(job.jobId, m.key, 5) },
    { op: { id: 2, kind: 'adjust', lineKey: m.key, delta: 10 }, call: () => actions.adjustPrintedAction(job.jobId, m.key, 10) },
    { op: { id: 3, kind: 'adjust', lineKey: m.key, delta: -1 }, call: () => actions.adjustPrintedAction(job.jobId, m.key, -1) },
    { op: { id: 4, kind: 'adjust', lineKey: l.key, delta: -4 }, call: () => actions.adjustPrintedAction(job.jobId, l.key, -4) },
    { op: { id: 5, kind: 'set', lineKey: l.key, value: 3 }, call: () => actions.setPrintedAction(job.jobId, l.key, 3) },
    { op: { id: 6, kind: 'set', lineKey: l.key, value: 5 }, call: () => actions.setPrintedAction(job.jobId, l.key, 5) },
    { op: { id: 7, kind: 'adjust', lineKey: l.key, delta: 10 }, call: () => actions.adjustPrintedAction(job.jobId, l.key, 10) },
    { op: { id: 8, kind: 'set', lineKey: m.key, value: 0 }, call: () => actions.setPrintedAction(job.jobId, m.key, 0) },
  ];
  for (const { op, call } of steps) {
    const shown = applyOps(job, [op]);
    const result = await call();
    assert.ok(result.ok && result.value, `op ${op.id}`);
    const answered = result.value;
    // lines and the job's printed count: the same; the stage is the service's to change (a first count starts a DTG job printing)
    assert.deepEqual([shown.lines.map((x) => x.printed), shown.printed], [answered.lines.map((x) => x.printed), answered.printed], `op ${op.id} ${JSON.stringify(op)}`);
    job = answered;
  }
  assert.equal(job.stage, 'printing');
  assert.deepEqual(job.lines.map((x) => x.printed), [0, 5]);

  // Taps in a row, laid over what the server last said: the screen's total of them is what lands
  const rapid: Op[] = [1, 2, 3].map((n) => ({ id: 20 + n, kind: 'adjust', lineKey: m.key, delta: 1 }));
  const shownAll = applyOps(job, rapid);
  await Promise.all(rapid.map((op) => actions.adjustPrintedAction(job.jobId, m.key, op.kind === 'adjust' ? op.delta : 0)));
  const final = ok(await actions.refreshJobAction(job.jobId));
  assert.deepEqual(final.lines.map((x) => x.printed), shownAll.lines.map((x) => x.printed));
});

test('Job done is the step into Folding: with every piece printed it needs no force, the orders are packed, and shipping stays Production’s', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  assert.ok((await h.prepress.approvePack(h.owner, dtg.id)).ok);
  const sale = await shopOrder(productId, [{ colour: BLACK, size: 'M', qty: 3 }]);
  const summary = (await queue()).jobs.find((j) => j.designId === designId && j.method === 'dtg')!;
  let job = (await jobPage(summary.jobId)).job;

  // Nothing printed: the iPad asks first, naming the pieces; the service would hold the move
  const [warning] = stageWarnings(job, 'folding');
  assert.equal(warning, '0 of 3 pieces are printed.');
  assert.match(refused(await actions.setStageAction(job.jobId, 'folding')), /0 of 3 pieces are printed\. Count the rest first, or force the move\./);

  job = ok(await actions.setPrintedAction(job.jobId, job.lines[0].key, 3));
  assert.deepEqual(stageWarnings(job, 'folding'), [], 'all printed: nothing to ask but "Job done?"');
  const stages: ProductionStage[] = ['printing', 'curing', 'folding'];
  assert.equal(job.stage, 'printing');
  for (const stage of stages.slice(1)) job = ok(await actions.setStageAction(job.jobId, stage));
  assert.equal(job.stage, 'folding');
  const [order] = await h.db.select({ s: schema.orders.productionStatus }).from(schema.orders).where(eq(schema.orders.id, sale));
  assert.equal(order.s, 'packed', 'the service packed the order: it is for Production to ship, with its tracking');
});

test('a viewer reads every screen of a real job and changes none of them', async () => {
  const { designId, productId, dtg } = await preparedDesign();
  assert.ok((await h.prepress.approvePack(h.owner, dtg.id)).ok);
  await shopOrder(productId, [{ colour: BLACK, size: 'S', qty: 2 }]);
  const summary = (await queue()).jobs.find((j) => j.designId === designId && j.method === 'dtg')!;
  const key = (await jobPage(summary.jobId)).job.lines[0].key;

  await setDev('staff', { production: 'view' });
  try {
    const page = await jobPage(summary.jobId);
    assert.equal(page.job.canWork, false);
    assert.ok(page.view, 'a viewer may read the job sheet: Production View opens it');
    assert.match(refused(await actions.adjustPrintedAction(summary.jobId, key, 1)), /You don't have Work access to Production\./);
    assert.match(refused(await actions.setStageAction(summary.jobId, 'curing')), /You don't have Work access to Production\./);
    assert.equal(ok(await actions.refreshJobAction(summary.jobId)).printed, 0);
  } finally {
    await setDev('staff', { production: 'work' });
  }
});
