// How the stations order and word what they show: the stepper's steps, the queue's order and
// groups, a job's pieces by garment and colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProgressLine, StationJobSummary } from '@/lib/services/production-progress';
import { groupJobs, groupLines, initialsOf, jobsFor, nextStage, nextStageLabel, parseStation, percent, screenCanPrint, screenIsReady, SCREEN_STATUSES, screensBlocking, sortJobs, stageWarnings, stepsFor, timeAgo } from './model';

const job = (id: string, stage: StationJobSummary['stage'], updatedAt: string, overrides: Partial<StationJobSummary> = {}): StationJobSummary => ({
  jobId: id,
  designId: `design-${id}`,
  designTitle: `Design ${id}`,
  shopName: 'Band shop',
  method: 'screen',
  stage,
  total: 10,
  printed: 0,
  updatedAt,
  hiddenFromBoard: false,
  flaggedLines: 0,
  ...overrides,
});

test('a station is one of the four, and the queue shows the jobs of its method (all shows every one)', () => {
  assert.deepEqual(['screen', 'dtg', 'dtf', 'all', 'nope', '', null, undefined, 4].map(parseStation), ['screen', 'dtg', 'dtf', 'all', null, null, null, null, null]);
  const jobs = [job('1', 'queued', '2026-10-16T09:00:00Z'), job('2', 'queued', '2026-10-16T09:00:00Z', { method: 'dtg' }), job('3', 'queued', '2026-10-16T09:00:00Z', { method: 'dtf' })];
  assert.deepEqual(jobsFor(jobs, 'all').map((j) => j.jobId), ['1', '2', '3']);
  assert.deepEqual(jobsFor(jobs, 'screen').map((j) => j.jobId), ['1']);
  assert.deepEqual(jobsFor(jobs, 'dtg').map((j) => j.jobId), ['2']);
  assert.deepEqual(jobsFor(jobs, 'dtf').map((j) => j.jobId), ['3']);
});

test('the stepper has a Screens step only for a job that has screens, and the step after Folding is Done', () => {
  assert.deepEqual(stepsFor('screen', 'queued'), ['queued', 'screens', 'printing', 'curing', 'folding']);
  assert.deepEqual(stepsFor('dtg', 'queued'), ['queued', 'printing', 'curing', 'folding']);
  assert.deepEqual(stepsFor('dtf', 'printing'), ['queued', 'printing', 'curing', 'folding']);
  assert.deepEqual(stepsFor('dtg', 'screens'), ['queued', 'screens', 'printing', 'curing', 'folding'], 'a job already at Screens keeps the step it is on');
  assert.equal(nextStage('screen', 'queued'), 'screens');
  assert.equal(nextStage('dtg', 'queued'), 'printing');
  assert.equal(nextStage('screen', 'printing'), 'curing');
  assert.equal(nextStage('screen', 'curing'), 'folding');
  assert.equal(nextStage('screen', 'folding'), null, 'Folding is the last step a station takes: shipping is Production’s, with the tracking');
  assert.equal(nextStage('screen', 'shipped'), null);
  // The step into Folding is the one that finishes the job at the station.
  assert.deepEqual(
    (['queued', 'screens', 'printing', 'curing', 'folding', 'shipped'] as const).map((stage) => nextStageLabel('screen', stage)),
    ['Start screens', 'Start printing', 'Start curing', 'Job done', null, null],
  );
  assert.equal(nextStageLabel('dtg', 'queued'), 'Start printing');
  assert.equal(nextStageLabel('dtf', 'printing'), 'Start curing');
});

test('the queue reads nearest-to-finished first, then the job that has waited longest', () => {
  const jobs = [
    job('queued-new', 'queued', '2026-10-16T09:30:00Z'),
    job('printing', 'printing', '2026-10-16T09:10:00Z'),
    job('queued-old', 'queued', '2026-10-16T08:00:00Z'),
    job('folding', 'folding', '2026-10-16T09:20:00Z'),
    job('screens', 'screens', '2026-10-16T09:00:00Z'),
    job('curing', 'curing', '2026-10-16T09:05:00Z'),
    job('printing-old', 'printing', '2026-10-16T07:00:00Z'),
  ];
  assert.deepEqual(sortJobs(jobs).map((j) => j.jobId), ['folding', 'curing', 'printing-old', 'printing', 'screens', 'queued-old', 'queued-new']);
  assert.deepEqual(jobs.map((j) => j.jobId)[0], 'queued-new', 'the list given is not reordered');
});

test('the queue is grouped by stage, the groups with jobs only, and a job that is done has left it', () => {
  const groups = groupJobs([job('a', 'printing', '2026-10-16T09:00:00Z'), job('b', 'shipped', '2026-10-16T08:00:00Z'), job('c', 'printing', '2026-10-16T09:05:00Z'), job('d', 'queued', '2026-10-16T07:00:00Z')]);
  assert.deepEqual(groups.map((g) => [g.stage, g.jobs.map((j) => j.jobId)]), [['printing', ['a', 'c']], ['queued', ['d']]]);
  assert.deepEqual(groupJobs([]), []);
});

test('screen statuses run from waiting to reclaimed, and a screen is ready from Screen ready on', () => {
  assert.deepEqual(SCREEN_STATUSES.map((s) => s.label), ['Waiting', 'Film printed', 'Screen ready', 'On press', 'Reclaimed']);
  assert.deepEqual(SCREEN_STATUSES.map((s) => screenIsReady(s.status)), [false, false, true, true, true]);
});

const line = (key: string, blank: string, colour: string, size: string, ref: string, total: number, printed = 0, position: string | null = null): ProgressLine => ({ key, orderRef: ref, blankName: blank, colourName: colour, size, total, printed, position, flag: null });

test('pieces are grouped by garment and colour as they first appear, sizes small to large, one size from several orders by order', () => {
  const groups = groupLines([
    line('1', 'Classic tee', 'Black', 'L', 'Run 2', 40, 4),
    line('2', 'Classic tee', 'Black', 'S', 'Run 2', 20, 20),
    line('3', 'Classic tee', 'Navy', 'M', 'Run 2', 20),
    line('4', 'Classic tee', 'Black', 'M', 'ORD-3F9A2C1B', 2),
    line('5', 'Classic tee', 'Black', 'M', 'Run 2', 40, 10),
    line('6', 'Heavy hoodie', 'Black', 'XL', 'ORD-55AA66BB', 1),
    line('7', 'Classic tee', 'Black', '2XL', 'Run 2', 5),
  ]);
  assert.deepEqual(groups.map((g) => [g.blankName, g.colourName]), [['Classic tee', 'Black'], ['Classic tee', 'Navy'], ['Heavy hoodie', 'Black']]);
  const black = groups[0];
  assert.deepEqual(black.lines.map((l) => `${l.size} ${l.orderRef}`), ['S Run 2', 'M ORD-3F9A2C1B', 'M Run 2', 'L Run 2', '2XL Run 2']);
  assert.deepEqual([black.total, black.printed], [107, 34]);
  assert.deepEqual(groupLines([]), []);
});

test('the words: how long ago, a percentage held between 0 and 100, and the initials on a plate', () => {
  assert.deepEqual([0, 4_000, 5_000, 12_400, 59_000, 60_000, 150_000, 3_600_000, 7_300_000].map(timeAgo), ['just now', 'just now', '5 s ago', '12 s ago', '59 s ago', '1 min ago', '2 min ago', '1 h ago', '2 h ago']);
  assert.equal(timeAgo(-500), 'just now');
  assert.deepEqual([percent(0, 0), percent(5, 10), percent(1, 3), percent(10, 10), percent(12, 10), percent(-2, 10)], [0, 50, 33, 100, 100, 0]);
  assert.deepEqual(['Underwriter · v3', 'Thornfield wordmark · v1', 'Woodcut crow', '', 'X'].map(initialsOf), ['UN', 'TW', 'WC', '?', 'X']);
});

test('a screen can print once it is ready or on the press; the job waits for all of them, in the service’s words', () => {
  assert.deepEqual(SCREEN_STATUSES.map((s) => screenCanPrint(s.status)), [false, false, true, true, false]);
  assert.equal(screensBlocking([{ status: 'screen_ready' }, { status: 'on_press' }]), null);
  assert.equal(screensBlocking([]), null);
  assert.equal(screensBlocking([{ status: 'screen_ready' }, { status: 'waiting' }, { status: 'film_printed' }]), "2 of 3 screens aren't ready yet.");
  assert.equal(screensBlocking([{ status: 'waiting' }]), "1 of 1 screen isn't ready yet.");
});

test('a move forward is asked about when the service would hold it up: screens not ready before printing, pieces not printed before curing', () => {
  const screens = [{ status: 'screen_ready' as const }, { status: 'film_printed' as const }];
  const lines = [{ total: 100, printed: 40 }];
  const base = { method: 'screen' as const, screens, lines };
  assert.deepEqual(stageWarnings({ ...base, stage: 'screens' }, 'printing'), ["1 of 2 screens isn't ready yet."], 'screens first');
  assert.deepEqual(stageWarnings({ ...base, stage: 'printing' }, 'curing'), ['40 of 100 pieces are printed.']);
  assert.deepEqual(stageWarnings({ ...base, stage: 'screens' }, 'folding'), ["1 of 2 screens isn't ready yet.", '40 of 100 pieces are printed.'], 'skipping ahead asks about both');
  assert.deepEqual(stageWarnings({ ...base, stage: 'curing' }, 'folding'), ['40 of 100 pieces are printed.']);
  // Nothing is asked of a move back or sideways, of a job whose screens are ready, or of one with all its pieces printed.
  assert.deepEqual(stageWarnings({ ...base, stage: 'curing' }, 'printing'), []);
  assert.deepEqual(stageWarnings({ ...base, stage: 'printing' }, 'printing'), []);
  assert.deepEqual(stageWarnings({ ...base, screens: [{ status: 'on_press' }], stage: 'screens' }, 'printing'), []);
  assert.deepEqual(stageWarnings({ ...base, lines: [{ total: 100, printed: 100 }], stage: 'printing' }, 'curing'), []);
  // DTG and DTF jobs have no screens to wait for.
  assert.deepEqual(stageWarnings({ method: 'dtg', screens: [], lines, stage: 'queued' }, 'printing'), []);
});
