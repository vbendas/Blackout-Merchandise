// The station screens drawn on the server (what an iPad gets before anything runs in it) from the sample jobs and from the shapes that are hard to
// get right: no job sheet, a job with no screens, a flagged line, a shipped job, a viewer who may not change anything. Nothing throws, nothing reads
// "undefined", and what each screen is for is in what it draws. (The behaviour of the controls is in app/station/station.test.ts and counter.test.ts;
// what they do in a browser was checked on a throwaway server at the iPad sizes.)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { setupTestDb, type TestDb } from '../../scripts/test/pglite';
import type { Actor } from '@/lib/auth/permissions';
import { sampleJobSheetView } from '@/lib/print/job-sheet-sample';
import type { JobSheetView } from '@/lib/print/job-sheet-view';
import type { StationJobDetail, StationJobSummary } from '@/lib/services/production-progress';

let t: TestDb;
let mock: typeof import('@/app/station/mock-store');
let QueueScreen: typeof import('./QueueScreen').QueueScreen;
let JobScreen: typeof import('./JobScreen').JobScreen;
let ProofsPanel: typeof import('./ProofsPanel').ProofsPanel;
let SheetPanel: typeof import('./SheetPanel').SheetPanel;
let Stepper: typeof import('./Stepper').Stepper;

before(async () => {
  // The screens import the station's server actions, which import the session and so the database: it is the test one.
  t = await setupTestDb();
  mock = await import('@/app/station/mock-store');
  ({ QueueScreen } = await import('./QueueScreen'));
  ({ JobScreen } = await import('./JobScreen'));
  ({ ProofsPanel } = await import('./ProofsPanel'));
  ({ SheetPanel } = await import('./SheetPanel'));
  ({ Stepper } = await import('./Stepper'));
});

after(async () => {
  await t.close();
});

type Who = { actor: Actor };
const owner: Who = { actor: { userId: 'u1', role: 'admin' } };
const viewer: Who = { actor: { userId: 'u2', role: 'staff', permissions: { production: 'view' } } };

async function job(id: string, who: Who = owner): Promise<StationJobDetail> {
  const result = await mock.mockGetStationJob(who, id);
  assert.ok(result.ok);
  return result.value;
}
async function jobs(): Promise<StationJobSummary[]> {
  const result = await mock.mockListStationJobs(owner, 'all');
  assert.ok(result.ok);
  return result.value;
}

const UNDERWRITER = '00000000-0000-4000-8000-000000000001';
const THORNFIELD = '00000000-0000-4000-8000-000000000002';
const MOTH = '00000000-0000-4000-8000-000000000004';
const KILN = '00000000-0000-4000-8000-000000000005';

const html = (element: Parameters<typeof renderToString>[0]) => renderToString(element);
/** The text a screen draws, without its tags. */
const words = (markup: string) => markup.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (e) => ({ '&amp;': '&', '&#x27;': "'", '&rsquo;': '’', '&quot;': '"' })[e] ?? e).replace(/\s+/g, ' ');
const clean = (markup: string) => assert.doesNotMatch(markup, /undefined|NaN|\[object|null</);

test('the queue draws every job, grouped by stage nearest to finished first, with its proof, numbers and tags', async () => {
  mock.resetMockStation();
  const list = await jobs();
  const thumbs = Object.fromEntries(list.map((j) => [j.designId, { screen: '/dev/print-mock/proof-screen-black.webp', dtg_dtf: '/dev/print-mock/proof-dtg-black.webp' }]));
  const markup = html(createElement(QueueScreen, { initial: { ok: true, value: { jobs: list, thumbs } }, station: 'all', canWork: true, adminHref: '/admin/production' }));
  clean(markup);
  const text = words(markup);
  // the picker counts the jobs at each station
  assert.match(text, /All 6 Screen print 4 DTG 1 DTF 1/);
  // the groups, in order
  const order = ['Folding · 1', 'Curing · 1', 'Printing · 2', 'Screens · 1', 'Queued · 1'].map((h) => text.indexOf(h));
  assert.ok(order.every((at) => at >= 0), 'every stage with jobs has a heading');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'nearest to finished first');
  // a card: design, shop, method, stage, the printed count and the screens
  assert.match(text, /Underwriter · v3 Printing Underwriter band shop Screen print/);
  assert.match(text, /56 \/ 160 printed/);
  assert.match(text, /Screens ready 10 \/ 10/);
  assert.match(text, /Moth wings tee · v1 Printing Night Orchard DTG · 1 line flagged/);
  assert.match(text, /Atlas Choir · v1 Folding Atlas Choir Screen print · Off the board/);
  assert.match(markup, /href="\/station\/job\/00000000-0000-4000-8000-000000000001"/);
  assert.match(markup, /src="\/dev\/print-mock\/proof-screen-black\.webp"/);
  assert.match(markup, /Updated just now/);
  assert.match(markup, /aria-pressed="true"[^>]*><span>All<\/span>/, 'the station asked for is the one pressed');
  assert.doesNotMatch(text, /View only/);
});

test('the queue for one station, a viewer, an empty floor and a failed read each say what is going on', async () => {
  const list = await jobs();
  const dtg = words(html(createElement(QueueScreen, { initial: { ok: true, value: { jobs: list, thumbs: {} } }, station: 'dtg', canWork: false, adminHref: '/admin/production' })));
  assert.match(dtg, /DTG queue/);
  assert.match(dtg, /View only\. Counting pieces and moving jobs needs Production Work access\./);
  assert.match(dtg, /Moth wings tee/);
  assert.doesNotMatch(dtg, /Underwriter/);

  const empty = words(html(createElement(QueueScreen, { initial: { ok: true, value: { jobs: [], thumbs: {} } }, station: 'all', canWork: true, adminHref: '/admin/production' })));
  assert.match(empty, /No jobs on the floor\. A job appears here once an order is paid and its print files are approved\./);
  const none = words(html(createElement(QueueScreen, { initial: { ok: true, value: { jobs: list.filter((j) => j.method === 'screen'), thumbs: {} } }, station: 'dtf', canWork: true, adminHref: '/admin/production' })));
  assert.match(none, /Nothing at dtf right now\./);

  const failed = html(createElement(QueueScreen, { initial: { ok: false, error: 'Something went wrong. Try again.' }, station: 'all', canWork: true, adminHref: '/admin/production' }));
  clean(failed);
  assert.match(words(failed), /Something went wrong\. Try again\. Try again/);
  assert.match(failed, /Not updating/);
});

test('a job on the press opens on its pieces: every garment and colour, each size with its counter, and the numbers as the service has them', async () => {
  mock.resetMockStation();
  const view = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const markup = html(createElement(JobScreen, { job: await job(UNDERWRITER), view, sheetProblem: null, adminHref: '/admin/production' }));
  clean(markup);
  const text = words(markup);
  assert.match(text, /Underwriter · v3 Underwriter band shop · Screen print · Printing/);
  assert.match(text, /56 \/ 160 printed Screens ready 10 \/ 10/);
  assert.match(text, /Start curing/);
  assert.match(text, /Classic tee · Black 51 \/ 100/);
  assert.match(text, /Classic tee · French Navy 5 \/ 20/);
  assert.match(text, /Classic tee · White 0 \/ 40/);
  // the counters, in the words a screen reader hears
  assert.match(markup, /aria-label="M, Run 2 · ORD-1A2B3C4D, Front chest · 28 cm: 31 of 40 printed\. Type a number"/);
  for (const label of ['Add 1', 'Add 5', 'Add 10', 'Take 1', 'All 40']) assert.ok(markup.includes(`aria-label="${label}"`), label);
  // a size that is all printed has no step to add
  assert.match(markup, /<button[^>]*disabled=""[^>]*aria-label="Add 1">/);
  // the stepper: two steps done, one current
  assert.equal((markup.match(/data-state="done"/g) ?? []).length, 2);
  assert.match(markup, /aria-current="step"/);
  // tabs, with their counts, and only the pieces drawn
  assert.match(text, /Screens 10\/10 Pieces 56\/160 Proofs 6 Job sheet/);
  assert.doesNotMatch(markup, /class="st-films"/);
});

test('a job whose screens are being made opens on them: the films in press order with their inks, and five buttons for each screen', async () => {
  mock.resetMockStation();
  const view = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const markup = html(createElement(JobScreen, { job: await job(THORNFIELD), view, sheetProblem: null, adminHref: '/admin/production' }));
  clean(markup);
  const text = words(markup);
  assert.match(text, /Lights · 4 screens · simulated process/);
  assert.match(text, /1 \/ 4 ready/);
  for (const ink of ['PANTONE 237 C', 'PANTONE 2582 C', 'PANTONE 2726 C', 'PANTONE 2685 C']) assert.ok(text.includes(ink), ink);
  assert.match(text, /HB Neutral · mesh 230 \(91T\) · 55 lpi 22\.5° · cover 9\.9%/);
  for (const status of ['Waiting', 'Film printed', 'Screen ready', 'On press', 'Reclaimed']) assert.ok(markup.includes(`>${status}</button>`), status);
  // one status pressed per screen
  assert.equal((markup.match(/class="st-status-btn"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*class="st-status-btn"/g) ?? []).length, 4);
  // Reclaimed waits for the job to be off the press
  assert.match(markup, /disabled=""[^>]*class="st-status-btn"[^>]*>Reclaimed|class="st-status-btn"[^>]*disabled=""[^>]*>Reclaimed/);
  assert.match(text, /Start printing/);
  // the press settings an operator reads at the press
  assert.match(text, /Cure 2 to 2\.5 min at 165 °C/);
});

test('a DTG job has no Screens step and no Screens tab; a flagged line says why; a DTF job on its way out shows the step it is on', async () => {
  mock.resetMockStation();
  const view = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const dtg = html(createElement(JobScreen, { job: await job(MOTH), view, sheetProblem: null, adminHref: '/admin/production' }));
  clean(dtg);
  const text = words(dtg);
  assert.doesNotMatch(text, /Screens ready|Screens \d/);
  assert.match(text, /Queued 2 Printing 3 Curing 4 Folding/, 'four steps: nothing to wait for between the queue and the press');
  assert.match(text, /Pieces 30\/66 Proofs/);
  assert.match(text, /1 line needs a look: an order asks for fewer pieces than were printed\./);
  assert.match(text, /The order now asks for 2 pieces\. 4 were already printed\./);

  const dtf = words(html(createElement(JobScreen, { job: await job(KILN), view, sheetProblem: null, adminHref: '/admin/production' })));
  assert.match(dtf, /DTF · Curing/);
  assert.match(dtf, /Job done/);
});

test('a job at Folding is done at the station and says where shipping is; a job that shipped is read only', async () => {
  mock.resetMockStation();
  const view = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const folding = await job('00000000-0000-4000-8000-000000000006');
  const markup = html(createElement(JobScreen, { job: folding, view, sheetProblem: null, adminHref: '/admin/production' }));
  assert.match(words(markup), /Job done\. It is with shipping: the tracking is added in Production\./);
  assert.match(markup, /href="\/admin\/production"/);
  assert.doesNotMatch(markup, /st-btn-next/, 'no step after Folding');

  const shipped = html(createElement(JobScreen, { job: { ...folding, stage: 'shipped' }, view, sheetProblem: null, adminHref: '/admin/production' }));
  assert.match(words(shipped), /Shipped\./);
  // everything is off: counts are closed on a shipped job
  assert.doesNotMatch(shipped, /class="st-step"(?![^>]*disabled)/);
});

test('a viewer sees the job and can change nothing: the note says so and every control is off', async () => {
  mock.resetMockStation();
  const markup = html(createElement(JobScreen, { job: await job(UNDERWRITER, viewer), view: sampleJobSheetView(), sheetProblem: null, adminHref: '/admin/production' }));
  assert.match(words(markup), /View only\. Counting pieces, setting screens and moving the job needs Production Work access\./);
  for (const control of markup.match(/<button[^>]*class="st-(step|count|stage|btn st-btn-primary st-btn-next)[^"]*"[^>]*>/g) ?? []) assert.match(control, /disabled=""/, control);
});

test('a job with no job sheet still opens: the screens show what the service says of them and the sheet tab says why it is empty', async () => {
  mock.resetMockStation();
  const markup = html(createElement(JobScreen, { job: await job(THORNFIELD), view: null, sheetProblem: 'The job sheet could not be loaded. The PDF may still open.', adminHref: '/admin/production' }));
  clean(markup);
  const text = words(markup);
  assert.match(text, /Lights · 4 screens/);
  assert.match(text, /Orchid pink/);
  assert.doesNotMatch(text, /PANTONE/, 'no sheet, no codes: only what the service names');
  assert.match(text, /Proofs/);
});

test('the proofs are big plates to tap, with the colour and the way each prints; with none, the reason', () => {
  const view: JobSheetView = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const markup = html(createElement(ProofsPanel, { proofs: view.proofs, problem: null }));
  clean(markup);
  assert.equal((markup.match(/class="st-proof"/g) ?? []).length, 6);
  assert.match(words(markup), /Black · DTG\/DTF Zoom/);
  assert.match(markup, /aria-label="French Navy, Screen · Darks\. Zoom in"/);
  assert.match(words(html(createElement(ProofsPanel, { proofs: [], problem: 'There is no job sheet for this design yet.' }))), /There is no job sheet for this design yet\./);
  assert.match(words(html(createElement(ProofsPanel, { proofs: [], problem: null }))), /There are no proofs for this design yet\./);
  // a proof with no image cannot be opened
  const noImage = html(createElement(ProofsPanel, { proofs: [{ colourName: 'Black', label: 'DTG/DTF', url: null }], problem: null }));
  assert.match(noImage, /disabled=""/);
  assert.match(words(noImage), /No image/);
});

test('the job sheet tab is the PDF’s own words: facts, garments with their files, every setting, the checks, the pieces and the sign-off', () => {
  const view = sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));
  const markup = html(createElement(SheetPanel, { view, problem: null, pdfUrl: '/api/job-sheets/abc', adminHref: '/admin/production', hidden: false, canWork: true, onHidden: () => undefined }));
  clean(markup);
  const text = words(markup);
  assert.match(markup, /href="\/api\/job-sheets\/abc"[^>]*target="_blank"/);
  assert.match(text, /Open the job sheet \(PDF\) Made 2026-10-16 09:00 UTC/);
  // every phrase the view says of a set's press settings is on the screen
  for (const set of view.screenSets) for (const setting of set.settings) assert.ok(text.includes(setting.value), setting.value);
  for (const g of view.garments.rows) assert.ok(text.includes(g.file ?? g.note ?? '-'), g.file ?? '-');
  assert.match(text, /Garments \(6\)/);
  assert.match(text, /PASSED Size, Films, Marks, Screens, Proof/);
  assert.match(text, /REVIEW Fine lines/);
  assert.match(text, /160 pieces in 2 open orders, counted 2026-10-16 09:00 UTC\. Open means paid and not yet packed\./);
  assert.match(text, /Waiting for audit/);
  assert.match(text, /Approved · Sample Owner · 2026-10-15/);
  assert.match(text, /Shown on the board Hide from the board/);
  assert.match(text, /Shipping is done in Production, with the tracking\. Open Production/);

  const hidden = words(html(createElement(SheetPanel, { view: null, problem: 'The job sheet could not be loaded.', pdfUrl: '/api/job-sheets/abc', adminHref: '/admin/production', hidden: true, canWork: false, onHidden: () => undefined })));
  assert.match(hidden, /The job sheet could not be loaded\./);
  assert.match(hidden, /Hidden from the board Show on the board/);
});

test('the stepper ticks the steps behind a job, fills the one it is on, and leaves the rest to touch', () => {
  const markup = html(createElement(Stepper, { method: 'screen', stage: 'printing', canWork: true, onPick: () => undefined }));
  assert.deepEqual(markup.match(/data-state="(done|current|todo)"/g), ['data-state="done"', 'data-state="done"', 'data-state="current"', 'data-state="todo"', 'data-state="todo"']);
  assert.equal((markup.match(/disabled=""/g) ?? []).length, 1, 'only the current step is not a button to press');
  const shipped = html(createElement(Stepper, { method: 'dtg', stage: 'shipped', canWork: false, onPick: () => undefined }));
  assert.equal((shipped.match(/data-state="done"/g) ?? []).length, 4, 'every step behind a job that shipped is done');
});
