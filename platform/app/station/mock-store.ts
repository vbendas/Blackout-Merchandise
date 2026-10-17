// STATION_MOCK=1: the production stations with sample jobs and no database, so the screens can be built and
// checked before (or without) the service behind them. It answers as lib/services/production-progress.ts does:
// the same shapes, the same rules (counts held between 0 and the total, a count that adds pieces starts a job
// printing, a screen job prints once all its screens are ready, Curing and Folding wait for every piece to be
// printed unless forced, shipping is not a station's step, a screen is reclaimed only once the job is off the
// press) and the same words for what it refuses. Nothing is stored beyond the process: a restart gives the
// samples back. Development only (stationMockOn is false in production).
import type { SessionInfo } from '@/lib/auth';
import { can, PermissionError } from '@/lib/auth/permissions';
import { jobSheetPath } from '@/lib/print/job-sheet-link';
import { sampleJobSheetView } from '@/lib/print/job-sheet-sample';
import type { JobSheetView, JobSheetViewPieces } from '@/lib/print/job-sheet-view';
import type {
  ProductionStage,
  ProgressLine,
  ProgressResult,
  ScreenProgress,
  ScreenStatus,
  StationJobDetail,
  StationJobSummary,
  StationKind,
} from '@/lib/services/production-progress';
import { isScreenStatus, screenIsReady, screensBlocking, stageRank, STAGE_ORDER } from '@/components/station/model';
import { sortSizes } from '@/lib/storefront/present';

export function stationMockOn(): boolean {
  return process.env.STATION_MOCK === '1' && process.env.NODE_ENV !== 'production';
}

type Who = Pick<SessionInfo, 'actor'>;
const MAX_COUNT = 100_000;

interface MockJob {
  jobId: string;
  designId: string;
  designTitle: string;
  shopName: string;
  method: StationJobSummary['method'];
  stage: ProductionStage;
  createdAt: number;
  updatedAt: number;
  hiddenFromBoard: boolean;
  lines: ProgressLine[];
  screens: ScreenProgress[];
  view: JobSheetView;
}

// ---------------------------------------------------------------------------
// The samples

const MINUTE = 60_000;
/** A well-formed id (the service's job ids are UUIDs, and the job sheet route wants a design id that is one). */
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const line = (key: string, orderRef: string, blankName: string, colourName: string, size: string, total: number, printed: number, position: string | null = 'Front chest · 28 cm', flag: string | null = null): ProgressLine => ({
  key,
  orderRef,
  blankName,
  colourName,
  size,
  total,
  printed,
  position,
  flag,
});

/** The sample sheet for one of the sample jobs: the same words as the sample PDF, with the design's own name, the sets and
 * files it has, and the pieces waiting added up from the job's own lines. */
function viewFor(spec: { code: string; name: string; shop: string; version: number; sets: string[]; dtg: boolean; lines: ProgressLine[]; now: Date }): JobSheetView {
  const base = sampleJobSheetView(spec.now);
  const screenSets = base.screenSets.filter((s) => spec.sets.includes(s.setName));
  const labels = new Set([...screenSets.map((s) => `Screen · ${s.setName}`), ...(spec.dtg ? ['DTG/DTF'] : [])]);
  const methods = new Set([...(screenSets.length > 0 ? ['screen'] : []), ...(spec.dtg ? ['dtg_dtf'] : [])]);
  const garments = base.garments.rows.filter((g) => methods.has(g.method));
  const title = `${spec.code} · v${spec.version}`;
  return {
    ...base,
    design: { ...base.design, code: spec.code, name: spec.name, shopName: spec.shop, versionNumber: spec.version },
    title,
    subtitle: `${spec.name} · ${spec.shop}`,
    facts: [['Design', spec.code], ['Version', `v${spec.version}`], base.facts[2], base.facts[3]],
    garments: { ...base.garments, heading: `Garments (${garments.length})`, rows: garments },
    screenSets,
    dtg: spec.dtg ? base.dtg : { packs: [], footnote: null },
    proofs: base.proofs.filter((p) => labels.has(p.label)),
    checks: base.checks.filter((c) => (c.label.startsWith('DTG') ? spec.dtg : screenSets.some((s) => c.label.includes(s.setName)))),
    audits: base.audits.filter((a) => (a.label.startsWith('DTG') ? spec.dtg : screenSets.some((s) => a.label.includes(s.setName)))),
    pieces: piecesFromLines(spec.lines, spec.now),
  };
}

function piecesFromLines(lines: ProgressLine[], now: Date): JobSheetViewPieces {
  const sizes = sortSizes([...new Set(lines.map((l) => l.size))]);
  const rows = new Map<string, JobSheetViewPieces['rows'][number]>();
  for (const l of lines) {
    const key = `${l.blankName}|${l.colourName}`;
    const row = rows.get(key) ?? { blankName: l.blankName, blankCode: '', colourName: l.colourName, colourCode: '', sizes: {}, total: 0, from: [] };
    row.sizes[l.size] = (row.sizes[l.size] ?? 0) + l.total;
    row.total += l.total;
    row.from.push(`${l.orderRef} (${l.total})`);
    rows.set(key, row);
  }
  const total = lines.reduce((n, l) => n + l.total, 0);
  const orders = new Set(lines.map((l) => l.orderRef)).size;
  const stamp = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)} UTC`;
  return {
    sizes,
    rows: [...rows.values()].map((r) => ({ ...r, from: [...new Set(r.from)] })),
    totals: Object.fromEntries(sizes.map((s) => [s, lines.filter((l) => l.size === s).reduce((n, l) => n + l.total, 0)])),
    total,
    orders,
    line: `${total} pieces in ${orders} open ${orders === 1 ? 'order' : 'orders'}, counted ${stamp}. Open means paid and not yet packed.`,
    empty: null,
  };
}

function screensOf(view: JobSheetView, statuses: Record<string, ScreenStatus[]>): ScreenProgress[] {
  return view.screenSets.flatMap((set) =>
    set.films.map((film, i) => ({
      key: `${set.packId}:${film.index}`,
      setName: set.setName,
      position: film.position,
      inkName: film.clientName ?? film.label,
      status: statuses[set.setName]?.[i] ?? 'waiting',
      packId: set.packId ?? '',
      filmNumber: film.index,
    })),
  );
}

function seeds(now: Date): MockJob[] {
  const at = (minutesAgo: number) => now.getTime() - minutesAgo * MINUTE;
  const RUN2 = 'Run 2 · ORD-1A2B3C4D';
  const jobs: MockJob[] = [];
  const add = (job: Omit<MockJob, 'view' | 'screens'> & { sets: string[]; dtg: boolean; code: string; version: number; statuses?: Record<string, ScreenStatus[]> }) => {
    const { sets, dtg, code, version, statuses, ...rest } = job;
    const view = viewFor({ code, name: rest.designTitle.split(' · ')[0], shop: rest.shopName, version, sets, dtg, lines: rest.lines, now });
    jobs.push({ ...rest, view, screens: screensOf(view, statuses ?? {}) });
  };

  add({
    jobId: id(1),
    designId: id(11),
    designTitle: 'Underwriter · v3',
    shopName: 'Underwriter band shop',
    method: 'screen',
    stage: 'printing',
    createdAt: at(300),
    updatedAt: at(2),
    hiddenFromBoard: false,
    code: 'MF-UNDERWRITER',
    version: 3,
    sets: ['Darks', 'Lights'],
    dtg: false,
    statuses: { Darks: ['on_press', 'on_press', 'on_press', 'on_press', 'screen_ready', 'screen_ready'], Lights: ['screen_ready', 'screen_ready', 'screen_ready', 'screen_ready'] },
    lines: [
      line('l1', RUN2, 'Classic tee', 'Black', 'S', 20, 20),
      line('l2', RUN2, 'Classic tee', 'Black', 'M', 40, 31),
      line('l3', RUN2, 'Classic tee', 'Black', 'L', 40, 0),
      line('l4', RUN2, 'Classic tee', 'French Navy', 'M', 20, 5),
      line('l5', RUN2, 'Classic tee', 'White', 'M', 30, 0),
      line('l6', RUN2, 'Classic tee', 'White', 'L', 8, 0),
      line('l7', 'ORD-3F9A2C1B', 'Classic tee', 'White', 'XL', 2, 0),
    ],
  });
  add({
    jobId: id(2),
    designId: id(12),
    designTitle: 'Thornfield wordmark · v1',
    shopName: 'Thornfield',
    method: 'screen',
    stage: 'screens',
    createdAt: at(180),
    updatedAt: at(14),
    hiddenFromBoard: false,
    code: 'MF-THORNFIELD',
    version: 1,
    sets: ['Lights'],
    dtg: false,
    statuses: { Lights: ['screen_ready', 'film_printed', 'waiting', 'waiting'] },
    lines: [
      line('l1', 'Run 1 · ORD-77AA11BB', 'Classic tee', 'White', 'S', 10, 0),
      line('l2', 'Run 1 · ORD-77AA11BB', 'Classic tee', 'White', 'M', 25, 0),
      line('l3', 'Run 1 · ORD-77AA11BB', 'Classic tee', 'White', 'L', 15, 0),
      line('l4', 'Run 1 · ORD-77AA11BB', 'Classic tee', 'Sand', 'M', 10, 0),
    ],
  });
  add({
    jobId: id(3),
    designId: id(13),
    designTitle: 'Woodcut crow · v2',
    shopName: 'Night Orchard',
    method: 'screen',
    stage: 'queued',
    createdAt: at(90),
    updatedAt: at(90),
    hiddenFromBoard: false,
    code: 'MF-WOODCUT-CROW',
    version: 2,
    sets: ['Darks'],
    dtg: false,
    lines: [
      line('l1', 'Run 4 · ORD-9C0D1E2F', 'Classic tee', 'Black', 'M', 80, 0, 'Front chest · 28 cm + Back · 30 cm'),
      line('l2', 'Run 4 · ORD-9C0D1E2F', 'Classic tee', 'Black', 'L', 80, 0, 'Front chest · 28 cm + Back · 30 cm'),
      line('l3', 'Run 4 · ORD-9C0D1E2F', 'Classic tee', 'Black', 'XL', 40, 0, 'Front chest · 28 cm + Back · 30 cm'),
    ],
  });
  add({
    jobId: id(4),
    designId: id(14),
    designTitle: 'Moth wings tee · v1',
    shopName: 'Night Orchard',
    method: 'dtg',
    stage: 'printing',
    createdAt: at(240),
    updatedAt: at(1),
    hiddenFromBoard: false,
    code: 'MF-MOTH-WINGS',
    version: 1,
    sets: [],
    dtg: true,
    lines: [
      line('l1', 'ORD-5B6C7D8E', 'Classic tee', 'Black', 'S', 10, 10),
      line('l2', 'ORD-5B6C7D8E', 'Classic tee', 'Black', 'M', 30, 12),
      line('l3', 'ORD-A1B2C3D4', 'Classic tee', 'Black', 'M', 4, 0),
      line('l4', 'ORD-5B6C7D8E', 'Classic tee', 'Black', 'L', 20, 4),
      line('l5', 'ORD-F0E1D2C3', 'Classic tee', 'Black', 'XL', 2, 4, 'Front chest · 28 cm', 'The order now asks for 2 pieces. 4 were already printed.'),
    ],
  });
  add({
    jobId: id(5),
    designId: id(15),
    designTitle: 'Kiln badge · v2',
    shopName: 'Kiln Studio',
    method: 'dtf',
    stage: 'curing',
    createdAt: at(400),
    updatedAt: at(30),
    hiddenFromBoard: false,
    code: 'MF-KILN-BADGE',
    version: 2,
    sets: [],
    dtg: true,
    lines: [line('l1', 'Run 3 · ORD-2D3E4F50', 'Heavy hoodie', 'Black', 'S', 6, 6, 'Left chest · 9 cm'), line('l2', 'Run 3 · ORD-2D3E4F50', 'Heavy hoodie', 'Black', 'M', 8, 8, 'Left chest · 9 cm'), line('l3', 'Run 3 · ORD-2D3E4F50', 'Heavy hoodie', 'Black', 'L', 8, 8, 'Left chest · 9 cm')],
  });
  add({
    jobId: id(6),
    designId: id(16),
    designTitle: 'Atlas Choir · v1',
    shopName: 'Atlas Choir',
    method: 'screen',
    stage: 'folding',
    createdAt: at(900),
    updatedAt: at(55),
    hiddenFromBoard: true,
    code: 'MF-ATLAS-CHOIR',
    version: 1,
    sets: ['Lights'],
    dtg: false,
    statuses: { Lights: ['reclaimed', 'reclaimed', 'reclaimed', 'reclaimed'] },
    lines: [line('l1', 'Run 5 · ORD-6A7B8C9D', 'Heavy hoodie', 'White', 'M', 24, 24), line('l2', 'Run 5 · ORD-6A7B8C9D', 'Heavy hoodie', 'White', 'L', 24, 24)],
  });
  return jobs;
}

// One store per process, kept on globalThis so a hot reload keeps the counts that were made.
const SLOT = '__mfStationMock';
function store(): Map<string, MockJob> {
  const g = globalThis as unknown as Record<string, Map<string, MockJob> | undefined>;
  return (g[SLOT] ??= new Map(seeds(new Date()).map((job) => [job.jobId, job])));
}

/** Back to the samples (tests, and the owner after trying things out). */
export function resetMockStation(now: Date = new Date()): void {
  (globalThis as unknown as Record<string, Map<string, MockJob> | undefined>)[SLOT] = new Map(seeds(now).map((job) => [job.jobId, job]));
}

// ---------------------------------------------------------------------------
// The service, as the samples answer it

const totalsOf = (job: MockJob) => ({ total: job.lines.reduce((n, l) => n + l.total, 0), printed: job.lines.reduce((n, l) => n + l.printed, 0) });

function summaryOf(job: MockJob): StationJobSummary {
  const { total, printed } = totalsOf(job);
  return {
    jobId: job.jobId,
    designId: job.designId,
    designTitle: job.designTitle,
    shopName: job.shopName,
    method: job.method,
    stage: job.stage,
    total,
    printed,
    ...(job.method === 'screen' ? { screensReady: job.screens.filter((s) => screenIsReady(s.status)).length, screensTotal: job.screens.length } : {}),
    updatedAt: new Date(job.updatedAt).toISOString(),
    hiddenFromBoard: job.hiddenFromBoard,
    flaggedLines: job.lines.filter((l) => l.flag).length,
  };
}

function detailOf(job: MockJob, who: Who): StationJobDetail {
  return {
    ...summaryOf(job),
    lines: job.lines.map((l) => ({ ...l })),
    screens: job.screens.map((s) => ({ ...s })),
    jobSheetUrl: jobSheetPath(job.designId),
    canWork: can(who.actor, 'production', 'work'),
  };
}

function denied(who: Who, level: 'view' | 'work'): string | null {
  return can(who.actor, 'production', level) ? null : new PermissionError('production', level).message;
}

const NOT_FOUND = 'That job was not found. It may have shipped or been cleared: go back to the list.';
const touch = (job: MockJob) => void (job.updatedAt = Date.now());
const ok = (job: MockJob, who: Who): ProgressResult<StationJobDetail> => ({ ok: true, value: detailOf(job, who) });

export async function mockListStationJobs(session: Who, station: StationKind): Promise<ProgressResult<StationJobSummary[]>> {
  const no = denied(session, 'view');
  if (no) return { ok: false, error: no };
  if (!['screen', 'dtg', 'dtf', 'all'].includes(station)) return { ok: false, error: 'That station is not one of screen, DTG, DTF or all.' };
  const jobs = [...store().values()].filter((j) => j.stage !== 'shipped' && (station === 'all' || j.method === station)).sort((a, b) => a.createdAt - b.createdAt);
  return { ok: true, value: jobs.map(summaryOf) };
}

export async function mockGetStationJob(session: Who, jobId: string): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'view');
  if (no) return { ok: false, error: no };
  const job = store().get(jobId);
  return job ? ok(job, session) : { ok: false, error: NOT_FOUND };
}

/** A count that adds pieces starts a job printing: a DTG/DTF job at once, a screen-print job once its screens are ready. */
function readyToCount(job: MockJob): string | null {
  if (job.stage === 'shipped') return 'This job has shipped, so its counts are closed.';
  if (stageRank(job.stage) >= stageRank('printing')) return null;
  const blocking = job.method === 'screen' ? screensBlocking(job.screens) : null;
  if (blocking) return `This job isn't printing yet: ${blocking} Mark the screens ready first.`;
  job.stage = 'printing';
  return null;
}

function changeCount(session: Who, jobId: string, lineKey: string, change: { set: number } | { add: number }): ProgressResult<StationJobDetail> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  const amount = 'set' in change ? change.set : change.add;
  if (!Number.isInteger(amount) || Math.abs(amount) > MAX_COUNT || ('set' in change && amount < 0)) {
    return { ok: false, error: 'set' in change ? 'Enter a whole number of pieces, 0 or more.' : 'Add or take away a whole number of pieces.' };
  }
  const job = store().get(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  const target = job.lines.find((l) => l.key === lineKey);
  if (!target) return { ok: false, error: 'That line is not on this job any more. Reload the job.' };
  const adds = 'set' in change ? change.set > target.printed : change.add > 0;
  if (job.stage === 'shipped' || adds) {
    const refused = readyToCount(job);
    if (refused) return { ok: false, error: refused };
  }
  target.printed = Math.min(target.total, Math.max(0, 'set' in change ? change.set : target.printed + change.add));
  touch(job);
  return ok(job, session);
}

export async function mockSetPrintedCount(session: Who, jobId: string, lineKey: string, printed: number): Promise<ProgressResult<StationJobDetail>> {
  return changeCount(session, jobId, lineKey, { set: printed });
}

export async function mockAdjustPrintedCount(session: Who, jobId: string, lineKey: string, delta: number): Promise<ProgressResult<StationJobDetail>> {
  return changeCount(session, jobId, lineKey, { add: delta });
}

export async function mockSetScreenStatus(session: Who, jobId: string, screenKey: string, status: ScreenStatus): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  if (!isScreenStatus(status)) return { ok: false, error: 'That screen status is not one of waiting, film printed, ready, on the press or reclaimed.' };
  const job = store().get(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (job.method !== 'screen') return { ok: false, error: 'DTG and DTF jobs have no screens.' };
  if (job.stage === 'shipped' && status !== 'reclaimed') return { ok: false, error: 'This job has shipped: its screens can only be reclaimed.' };
  if (status === 'reclaimed' && stageRank(job.stage) < stageRank('curing')) {
    return { ok: false, error: 'Reclaim the screens once the job is off the press. To burn a screen again, set it back to waiting.' };
  }
  const screen = job.screens.find((s) => s.key === screenKey);
  if (!screen) return { ok: false, error: 'That screen is not on this job any more. Reload the job.' };
  screen.status = status;
  if (job.stage === 'queued' && status !== 'waiting') job.stage = 'screens';
  touch(job);
  return ok(job, session);
}

export async function mockSetJobStage(session: Who, jobId: string, stage: ProductionStage, opts: { force?: boolean } = {}): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  if (!STAGE_ORDER.includes(stage)) return { ok: false, error: 'That stage is not one of queued, screens, printing, curing, folding or shipped.' };
  const job = store().get(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (job.stage === stage) return ok(job, session);
  if (job.stage === 'shipped') return { ok: false, error: 'This job has shipped.' };
  if (stage === 'shipped') return { ok: false, error: 'A job reads shipped once every order in it has shipped. Ship each order from Production, with its tracking.' };
  if (stage === 'screens' && job.method !== 'screen') return { ok: false, error: 'DTG and DTF jobs have no screens: move the job to printing.' };
  const force = opts.force === true;
  if (stageRank(stage) > stageRank(job.stage) && !force) {
    if (stageRank(stage) >= stageRank('printing') && stageRank(job.stage) < stageRank('printing') && job.method === 'screen') {
      const blocking = screensBlocking(job.screens);
      if (blocking) return { ok: false, error: `${blocking} Mark them ready first, or force the move.` };
    }
    if (stageRank(stage) >= stageRank('curing')) {
      const { total, printed } = totalsOf(job);
      if (printed < total) return { ok: false, error: `${printed} of ${total} pieces are printed. Count the rest first, or force the move.` };
    }
  }
  job.stage = stage;
  touch(job);
  return ok(job, session);
}

export async function mockSetHiddenFromBoard(session: Who, jobId: string, hidden: boolean): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  const job = store().get(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  job.hiddenFromBoard = hidden;
  touch(job);
  return ok(job, session);
}

/** The job sheet of a sample job, as the service would give it for the design. */
export function mockJobSheetFor(designId: string): JobSheetView | null {
  const job = [...store().values()].find((j) => j.designId === designId);
  return job ? { ...job.view, generatedAt: new Date().toISOString() } : null;
}

/** The proofs a list shows for the sample designs (the sample images). */
export function mockThumbs(designIds: readonly string[]): Record<string, { screen: string | null; dtg_dtf: string | null }> {
  const IMG = '/dev/print-mock';
  const pick = (n: number) => ['black', 'navy', 'white'][n % 3];
  return Object.fromEntries(designIds.map((designId, n) => [designId, { screen: `${IMG}/proof-screen-${pick(n)}.webp`, dtg_dtf: `${IMG}/proof-dtg-${pick(n)}.webp` }]));
}
