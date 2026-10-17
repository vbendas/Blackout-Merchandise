// STATION_MOCK=1: the samples answer as the service does (lib/services/production-progress.ts): the same shapes and
// the same rules and words, so the screens can be built and checked with no database. Nothing here touches one.
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Actor } from '@/lib/auth/permissions';
import {
  mockAdjustPrintedCount,
  mockGetStationJob,
  mockJobSheetFor,
  mockListStationJobs,
  mockSetHiddenFromBoard,
  mockSetJobStage,
  mockSetPrintedCount,
  mockSetScreenStatus,
  mockThumbs,
  resetMockStation,
  stationMockOn,
} from './mock-store';

type Who = { actor: Actor };
const owner: Who = { actor: { userId: 'u1', role: 'admin' } };
const viewer: Who = { actor: { userId: 'u2', role: 'staff', permissions: { production: 'view' } } };
const nobody: Who = { actor: { userId: 'u4', role: 'artist' } };

// the sample jobs, by what they are
const UNDERWRITER = '00000000-0000-4000-8000-000000000001'; // screen, printing, every screen ready
const THORNFIELD = '00000000-0000-4000-8000-000000000002'; // screen, screens: two of four not ready
const WOODCUT = '00000000-0000-4000-8000-000000000003'; // screen, queued
const MOTH = '00000000-0000-4000-8000-000000000004'; // DTG, printing, one flagged line
const KILN = '00000000-0000-4000-8000-000000000005'; // DTF, curing, all printed
const ATLAS = '00000000-0000-4000-8000-000000000006'; // screen, folding, hidden from the board

beforeEach(() => resetMockStation(new Date('2026-10-16T09:00:00.000Z')));

async function job(id: string, who: Who = owner) {
  const result = await mockGetStationJob(who, id);
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}

/** What a refusal says (and that it is one). */
function refusal(result: { ok: boolean; error?: string }): string {
  assert.equal(result.ok, false, 'refused');
  return result.error ?? '';
}

test('the mock is on only when STATION_MOCK=1, and never in production', () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { mock: env.STATION_MOCK, node: env.NODE_ENV };
  try {
    env.STATION_MOCK = '1';
    env.NODE_ENV = 'development';
    assert.equal(stationMockOn(), true);
    env.NODE_ENV = 'production';
    assert.equal(stationMockOn(), false, 'never in production');
    env.NODE_ENV = 'development';
    env.STATION_MOCK = '0';
    assert.equal(stationMockOn(), false);
    delete env.STATION_MOCK;
    assert.equal(stationMockOn(), false);
  } finally {
    if (saved.mock === undefined) delete env.STATION_MOCK;
    else env.STATION_MOCK = saved.mock;
    env.NODE_ENV = saved.node;
  }
});

test('the samples are realistic: a job at every station, oldest first, with the contract’s fields', async () => {
  const listed = await mockListStationJobs(owner, 'all');
  assert.ok(listed.ok);
  assert.deepEqual(listed.value.map((j) => [j.designTitle, j.method, j.stage]), [
    ['Atlas Choir · v1', 'screen', 'folding'],
    ['Kiln badge · v2', 'dtf', 'curing'],
    ['Underwriter · v3', 'screen', 'printing'],
    ['Moth wings tee · v1', 'dtg', 'printing'],
    ['Thornfield wordmark · v1', 'screen', 'screens'],
    ['Woodcut crow · v2', 'screen', 'queued'],
  ]);
  // every job has its own number from 1001, the oldest first, as the database numbers the real ones
  assert.deepEqual(listed.value.map((j) => j.runNumber), [1001, 1002, 1003, 1004, 1005, 1006]);
  const underwriter = listed.value.find((j) => j.jobId === UNDERWRITER)!;
  assert.equal(underwriter.runNumber, 1003);
  assert.deepEqual([underwriter.total, underwriter.printed, underwriter.screensReady, underwriter.screensTotal, underwriter.hiddenFromBoard, underwriter.flaggedLines], [160, 56, 10, 10, false, 0]);
  assert.equal('screensReady' in listed.value.find((j) => j.jobId === MOCK_DTG)!, false, 'a DTG job has no screens to count');
  assert.equal(listed.value.find((j) => j.jobId === ATLAS)!.hiddenFromBoard, true);
  assert.equal(listed.value.find((j) => j.jobId === MOTH)!.flaggedLines, 1);

  for (const station of ['screen', 'dtg', 'dtf'] as const) {
    const own = await mockListStationJobs(owner, station);
    assert.ok(own.ok);
    assert.ok(own.value.length > 0 && own.value.every((j) => j.method === station), station);
  }
  assert.equal(refusal(await mockListStationJobs(owner, 'nope' as never)), 'That station is not one of screen, DTG, DTF or all.');
});

const MOCK_DTG = MOTH;

test('a job is its lines and screens, and the job sheet’s link', async () => {
  const detail = await job(UNDERWRITER);
  assert.equal(detail.runNumber, 1003, 'a job opens with the number its card has');
  assert.equal(detail.jobSheetUrl, '/api/job-sheets/00000000-0000-4000-8000-000000000011');
  assert.equal(detail.lines.length, 7);
  assert.deepEqual(detail.lines[1], { key: 'l2', orderRef: 'Run 2 · ORD-1A2B3C4D', blankName: 'Classic tee', colourName: 'Black', size: 'M', total: 40, printed: 31, position: 'Front chest · 28 cm', flag: null });
  assert.equal(detail.screens.length, 10);
  assert.deepEqual(detail.screens[0], { key: 'mock-pack-darks:1', setName: 'Darks', position: '1/6', inkName: 'Underbase', status: 'on_press', packId: 'mock-pack-darks', filmNumber: 1 });
  assert.equal(detail.canWork, true);
  assert.equal((await job(UNDERWRITER, viewer)).canWork, false, 'a viewer may look and not change');
  assert.equal(refusal(await mockGetStationJob(owner, 'nope')), 'That job was not found. It may have shipped or been cleared: go back to the list.');
  // the job sheet behind it is the sample, with this design's name and the sets it prints
  const sheet = mockJobSheetFor(detail.designId)!;
  assert.deepEqual([sheet.title, sheet.screenSets.map((s) => s.setName), sheet.pieces.total], ['MF-UNDERWRITER · v3', ['Darks', 'Lights'], 160]);
  assert.deepEqual(mockJobSheetFor((await job(MOTH)).designId)!.screenSets, [], 'a DTG job has no screen sets');
  assert.equal(mockJobSheetFor('nope'), null);
});

test('who may look and who may change: Production View reads, Production Work changes, anyone else is refused', async () => {
  assert.match(refusal(await mockListStationJobs(nobody, 'all')), /Production/);
  assert.match(refusal(await mockGetStationJob(nobody, UNDERWRITER)), /Production/);
  assert.ok((await mockListStationJobs(viewer, 'all')).ok);
  for (const result of [
    await mockAdjustPrintedCount(viewer, UNDERWRITER, 'l3', 1),
    await mockSetPrintedCount(viewer, UNDERWRITER, 'l3', 1),
    await mockSetScreenStatus(viewer, THORNFIELD, 'mock-pack-lights:3', 'screen_ready'),
    await mockSetJobStage(viewer, UNDERWRITER, 'curing'),
    await mockSetHiddenFromBoard(viewer, UNDERWRITER, true),
  ]) {
    assert.match(refusal(result), /You don't have Work access to Production/);
  }
  assert.equal((await job(UNDERWRITER)).printed, 56, 'nothing moved');
});

test('a count is held between 0 and the line’s total, set exactly or added to, and the job’s numbers follow', async () => {
  const set = await mockSetPrintedCount(owner, UNDERWRITER, 'l3', 25);
  assert.ok(set.ok);
  assert.deepEqual([set.value.lines[2].printed, set.value.printed], [25, 81]);
  const added = await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', 10);
  assert.ok(added.ok);
  assert.equal(added.value.lines[2].printed, 35);
  assert.equal((await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', 100)) .ok && (await job(UNDERWRITER)).lines[2].printed, 40, 'held at the total');
  assert.equal((await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', -1000)).ok && (await job(UNDERWRITER)).lines[2].printed, 0, 'held at none');
  assert.equal((await mockSetPrintedCount(owner, UNDERWRITER, 'l1', 500)).ok && (await job(UNDERWRITER)).lines[0].printed, 20, 'typed past the total');

  assert.equal(refusal(await mockSetPrintedCount(owner, UNDERWRITER, 'l3', -1)), 'Enter a whole number of pieces, 0 or more.');
  assert.equal(refusal(await mockSetPrintedCount(owner, UNDERWRITER, 'l3', 1.5)), 'Enter a whole number of pieces, 0 or more.');
  assert.equal(refusal(await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', 0.5)), 'Add or take away a whole number of pieces.');
  assert.equal(refusal(await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', Number.NaN)), 'Add or take away a whole number of pieces.');
  assert.match(refusal(await mockAdjustPrintedCount(owner, UNDERWRITER, 'nope', 1)), /not on this job any more/);
  assert.match(refusal(await mockAdjustPrintedCount(owner, 'nope', 'l1', 1)), /job was not found/);
});

test('a count that adds pieces starts a job printing: a DTG job at once, a screen job once every screen is ready', async () => {
  // DTG: queued is not a state the sample has, so move it back first.
  assert.ok((await mockSetJobStage(owner, MOTH, 'queued')).ok);
  const dtg = await mockAdjustPrintedCount(owner, MOTH, 'l3', 1);
  assert.ok(dtg.ok);
  assert.equal(dtg.value.stage, 'printing');

  // A screen job whose screens are not all ready is held: nothing is counted, and the message says what to do.
  const held = refusal(await mockAdjustPrintedCount(owner, THORNFIELD, 'l1', 1));
  assert.equal(held, "This job isn't printing yet: 3 of 4 screens aren't ready yet. Mark the screens ready first.");
  const thornfield = await job(THORNFIELD);
  assert.deepEqual([thornfield.stage, thornfield.printed], ['screens', 0]);
  // A correction that takes pieces away, or sets none, is never held.
  assert.ok((await mockSetPrintedCount(owner, THORNFIELD, 'l1', 0)).ok);

  // Once the last screen is ready the first count starts it.
  for (const n of [2, 3, 4]) assert.ok((await mockSetScreenStatus(owner, THORNFIELD, `mock-pack-lights:${n}`, 'screen_ready')).ok);
  const started = await mockAdjustPrintedCount(owner, THORNFIELD, 'l1', 5);
  assert.ok(started.ok);
  assert.deepEqual([started.value.stage, started.value.printed], ['printing', 5]);

  // A job that has shipped has its counts closed: Atlas is folded; move it on the only way a station cannot.
  assert.match(refusal(await mockSetJobStage(owner, ATLAS, 'shipped')), /A job reads shipped once every order in it has shipped/);
});

test('a screen’s status can be set again, a queued job moves to Screens with its first screen, and reclaiming waits until the job is off the press', async () => {
  const first = await mockSetScreenStatus(owner, WOODCUT, 'mock-pack-darks:1', 'film_printed');
  assert.ok(first.ok);
  assert.deepEqual([first.value.stage, first.value.screens[0].status, first.value.screensReady], ['screens', 'film_printed', 0]);
  const ready = await mockSetScreenStatus(owner, WOODCUT, 'mock-pack-darks:1', 'screen_ready');
  assert.ok(ready.ok);
  assert.equal(ready.value.screensReady, 1);
  const burnedBadly = await mockSetScreenStatus(owner, WOODCUT, 'mock-pack-darks:1', 'waiting');
  assert.ok(burnedBadly.ok);
  assert.equal(burnedBadly.value.screensReady, 0);

  assert.equal(refusal(await mockSetScreenStatus(owner, UNDERWRITER, 'mock-pack-darks:1', 'reclaimed')), 'Reclaim the screens once the job is off the press. To burn a screen again, set it back to waiting.');
  assert.ok((await mockSetScreenStatus(owner, KILN, 'x', 'on_press')).ok === false, 'a DTF job has no screens');
  assert.equal(refusal(await mockSetScreenStatus(owner, KILN, 'x', 'on_press')), 'DTG and DTF jobs have no screens.');
  assert.equal(refusal(await mockSetScreenStatus(owner, THORNFIELD, 'mock-pack-lights:1', 'ready' as never)), 'That screen status is not one of waiting, film printed, ready, on the press or reclaimed.');
  assert.match(refusal(await mockSetScreenStatus(owner, THORNFIELD, 'nope', 'waiting')), /screen is not on this job any more/);
  // Off the press, a screen can be reclaimed.
  assert.ok((await mockSetJobStage(owner, UNDERWRITER, 'curing', { force: true })).ok);
  assert.ok((await mockSetScreenStatus(owner, UNDERWRITER, 'mock-pack-darks:1', 'reclaimed')).ok);
});

test('a stage moves forward only when its screens are ready and its pieces printed, unless forced, and back to put a mistake right', async () => {
  // Screens before printing.
  assert.equal(refusal(await mockSetJobStage(owner, THORNFIELD, 'printing')), "3 of 4 screens aren't ready yet. Mark them ready first, or force the move.");
  const forced = await mockSetJobStage(owner, THORNFIELD, 'printing', { force: true });
  assert.ok(forced.ok);
  assert.equal(forced.value.stage, 'printing');
  // Pieces before curing and folding.
  assert.equal(refusal(await mockSetJobStage(owner, UNDERWRITER, 'curing')), '56 of 160 pieces are printed. Count the rest first, or force the move.');
  assert.equal(refusal(await mockSetJobStage(owner, UNDERWRITER, 'folding')), '56 of 160 pieces are printed. Count the rest first, or force the move.');
  assert.equal((await job(UNDERWRITER)).stage, 'printing');
  // A job with everything printed moves on without force, and back again.
  const cured = await mockSetJobStage(owner, KILN, 'folding');
  assert.ok(cured.ok);
  assert.equal(cured.value.stage, 'folding');
  const back = await mockSetJobStage(owner, KILN, 'printing');
  assert.ok(back.ok);
  assert.equal(back.value.stage, 'printing');
  // Same stage: nothing to do, no error.
  assert.ok((await mockSetJobStage(owner, KILN, 'printing')).ok);

  assert.equal(refusal(await mockSetJobStage(owner, MOTH, 'screens')), 'DTG and DTF jobs have no screens: move the job to printing.');
  assert.match(refusal(await mockSetJobStage(owner, MOTH, 'nonsense' as never)), /not one of queued, screens, printing, curing, folding or shipped/);
  assert.match(refusal(await mockSetJobStage(owner, 'nope', 'printing')), /job was not found/);
});

test('shipping is not a station’s step, and a job on the board can be hidden from it', async () => {
  assert.equal(refusal(await mockSetJobStage(owner, KILN, 'shipped')), 'A job reads shipped once every order in it has shipped. Ship each order from Production, with its tracking.');
  assert.equal(refusal(await mockSetJobStage(owner, KILN, 'shipped', { force: true })), 'A job reads shipped once every order in it has shipped. Ship each order from Production, with its tracking.', 'not even forced');
  const hidden = await mockSetHiddenFromBoard(owner, UNDERWRITER, true);
  assert.ok(hidden.ok);
  assert.equal(hidden.value.hiddenFromBoard, true);
  const listed = await mockListStationJobs(owner, 'all');
  assert.ok(listed.ok);
  assert.equal(listed.value.find((j) => j.jobId === UNDERWRITER)!.hiddenFromBoard, true);
  assert.ok((await mockSetHiddenFromBoard(owner, UNDERWRITER, false)).ok);
});

test('what changes is what the next read says, and the job reads as updated', async () => {
  const before = await job(UNDERWRITER);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok((await mockAdjustPrintedCount(owner, UNDERWRITER, 'l3', 4)).ok);
  const after = await job(UNDERWRITER);
  assert.equal(after.lines[2].printed, 4);
  assert.ok(Date.parse(after.updatedAt) > Date.parse(before.updatedAt));
  // an answer is a copy: changing it never changes the store
  after.lines[2].printed = 99;
  assert.equal((await job(UNDERWRITER)).lines[2].printed, 4);
  // and the samples come back whole
  resetMockStation();
  assert.equal((await job(UNDERWRITER)).lines[2].printed, 0);
});

test('the proofs of a list are the sample images, for every design asked about', () => {
  const thumbs = mockThumbs(['a', 'b', 'c', 'd']);
  assert.deepEqual(Object.keys(thumbs), ['a', 'b', 'c', 'd']);
  for (const t of Object.values(thumbs)) {
    assert.match(t.screen ?? '', /^\/dev\/print-mock\/proof-screen-(black|navy|white)\.webp$/);
    assert.match(t.dtg_dtf ?? '', /^\/dev\/print-mock\/proof-dtg-(black|navy|white)\.webp$/);
  }
  assert.deepEqual(mockThumbs([]), {});
});
