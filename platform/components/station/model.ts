// What the production stations show and how it is put in order: the stations, stages and screen
// statuses in the words the floor uses, how jobs are sorted and grouped, and how a job's pieces are
// grouped by garment and colour. Pure and client-safe. The data itself is PS-A's contract
// (lib/services/production-progress.ts): only its types are imported here, never its functions, so no
// server code reaches the browser.
import type { ProductionStage, ProgressLine, ScreenStatus, StationJobSummary, StationKind } from '@/lib/services/production-progress';
import { sortSizes } from '@/lib/storefront/present';

/** What a station action answers: the new numbers, or a message the person can read. A refused permission says so (`denied`). */
export type StationResult<T> = { ok: true; value: T } | { ok: false; error: string; denied?: boolean };

/** How often a screen asks the server for the numbers again, other iPads' changes included. */
export const POLL_MS = 10_000;

/** The cookie that remembers which station this iPad is (the server reads it to draw the right queue at once). */
export const STATION_COOKIE = 'mf-station';

// ---------------------------------------------------------------------------
// Stations

export const STATIONS: { kind: StationKind; label: string }[] = [
  { kind: 'all', label: 'All' },
  { kind: 'screen', label: 'Screen print' },
  { kind: 'dtg', label: 'DTG' },
  { kind: 'dtf', label: 'DTF' },
];

export function parseStation(value: unknown): StationKind | null {
  return typeof value === 'string' && STATIONS.some((s) => s.kind === value) ? (value as StationKind) : null;
}

export const METHOD_LABEL: Record<StationJobSummary['method'], string> = { screen: 'Screen print', dtg: 'DTG', dtf: 'DTF' };

/** A job's number as the floor says it: "No. 1001". Never "Run 1001" (so not runLabel of lib/format/runs.ts, which says "Run 3"): here a
 * Run is an artist's Run 1, Run 2, the order refs on a job's lines. Null for anything that is not a whole number, so a screen never reads
 * "No. undefined". */
export function jobNumberLabel(runNumber: number | null | undefined): string | null {
  return typeof runNumber === 'number' && Number.isInteger(runNumber) && runNumber > 0 ? `No. ${runNumber}` : null;
}

/** The jobs a station works: its own method, or every one. */
export function jobsFor(jobs: StationJobSummary[], station: StationKind): StationJobSummary[] {
  return station === 'all' ? jobs : jobs.filter((job) => job.method === station);
}

// ---------------------------------------------------------------------------
// Stages

export const STAGE_ORDER: ProductionStage[] = ['queued', 'screens', 'printing', 'curing', 'folding', 'shipped'];

export const STAGE_LABEL: Record<ProductionStage, string> = {
  queued: 'Queued',
  screens: 'Screens',
  printing: 'Printing',
  curing: 'Curing',
  folding: 'Folding',
  shipped: 'Shipped',
};

export const stageRank = (stage: ProductionStage): number => STAGE_ORDER.indexOf(stage);

/** A job with no screens (DTG, DTF) goes from the queue to the press: the stepper has no Screens step for it. */
export function stepsFor(method: StationJobSummary['method'], stage: ProductionStage): ProductionStage[] {
  const steps: ProductionStage[] = ['queued', 'screens', 'printing', 'curing', 'folding'];
  // A job already at Screens (set from admin or by the service) keeps the step it is on.
  return method === 'screen' || stage === 'screens' ? steps : steps.filter((s) => s !== 'screens');
}

/** The step after this one for the job; null at Folding, the last step a station takes (shipping is a step of the
 * Production page, with the tracking) and once the job has shipped. */
export function nextStage(method: StationJobSummary['method'], stage: ProductionStage): ProductionStage | null {
  if (stage === 'shipped') return null;
  const steps = stepsFor(method, stage);
  const at = steps.indexOf(stage);
  return at === -1 ? null : (steps[at + 1] ?? null);
}

/** What the one big button under the stepper says, for the job's stage. The step into Folding is "Job done": the
 * service packs the orders whose pieces are all printed once their jobs reach Folding. */
export function nextStageLabel(method: StationJobSummary['method'], stage: ProductionStage): string | null {
  const next = nextStage(method, stage);
  if (next === null) return null;
  const words: Partial<Record<ProductionStage, string>> = { screens: 'Start screens', printing: 'Start printing', curing: 'Start curing', folding: 'Job done' };
  return words[next] ?? null;
}

/** Closest to finished first: a job on the press is looked at before one that has not started. */
const STAGE_PRIORITY: Record<ProductionStage, number> = { folding: 0, curing: 1, printing: 2, screens: 3, queued: 4, shipped: 5 };

/** The queue in the order to read it: by stage (nearest to finished first), then the one that has waited longest. */
export function sortJobs(jobs: StationJobSummary[]): StationJobSummary[] {
  return [...jobs].sort(
    (a, b) =>
      STAGE_PRIORITY[a.stage] - STAGE_PRIORITY[b.stage] ||
      Date.parse(a.updatedAt) - Date.parse(b.updatedAt) ||
      a.designTitle.localeCompare(b.designTitle) ||
      a.jobId.localeCompare(b.jobId),
  );
}

/** The sorted queue in its stage groups, the ones with jobs only. Done jobs have left the station: they are not listed. */
export function groupJobs(jobs: StationJobSummary[]): { stage: ProductionStage; jobs: StationJobSummary[] }[] {
  const groups: { stage: ProductionStage; jobs: StationJobSummary[] }[] = [];
  for (const job of sortJobs(jobs)) {
    if (job.stage === 'shipped') continue;
    const last = groups[groups.length - 1];
    if (last && last.stage === job.stage) last.jobs.push(job);
    else groups.push({ stage: job.stage, jobs: [job] });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Screens

export const SCREEN_STATUSES: { status: ScreenStatus; label: string }[] = [
  { status: 'waiting', label: 'Waiting' },
  { status: 'film_printed', label: 'Film printed' },
  { status: 'screen_ready', label: 'Screen ready' },
  { status: 'on_press', label: 'On press' },
  { status: 'reclaimed', label: 'Reclaimed' },
];

export const SCREEN_STATUS_LABEL = Object.fromEntries(SCREEN_STATUSES.map((s) => [s.status, s.label])) as Record<ScreenStatus, string>;

export function isScreenStatus(value: unknown): value is ScreenStatus {
  return typeof value === 'string' && SCREEN_STATUSES.some((s) => s.status === value);
}

export function isStage(value: unknown): value is ProductionStage {
  return typeof value === 'string' && (STAGE_ORDER as string[]).includes(value);
}

/** A screen counts towards "ready" from "Screen ready" on: once it has been on the press it was ready (the service counts the same). */
export function screenIsReady(status: ScreenStatus): boolean {
  return SCREEN_STATUSES.findIndex((s) => s.status === status) >= 2;
}

/** A screen that can print: burned and checked, or on the press already. A job prints once all of its screens can. */
export function screenCanPrint(status: ScreenStatus): boolean {
  return status === 'screen_ready' || status === 'on_press';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Why a screen-print job can't print yet, in the service's words ('2 of 6 screens aren't ready yet.'), or null. */
export function screensBlocking(screens: { status: ScreenStatus }[]): string | null {
  const waiting = screens.filter((s) => !screenCanPrint(s.status)).length;
  if (waiting === 0) return null;
  return `${waiting} of ${plural(screens.length, 'screen', 'screens')} ${waiting === 1 ? "isn't" : "aren't"} ready yet.`;
}

/** What the service would hold a move to `target` up for, so a screen can ask before it sends the move (and send it forced):
 * screens not ready before printing, pieces not printed before curing or folding. Moving back is never held up. */
export function stageWarnings(job: { method: StationJobSummary['method']; stage: ProductionStage; screens: { status: ScreenStatus }[]; lines: { total: number; printed: number }[] }, target: ProductionStage): string[] {
  const warnings: string[] = [];
  if (stageRank(target) <= stageRank(job.stage)) return warnings;
  if (job.method === 'screen' && stageRank(target) >= stageRank('printing') && stageRank(job.stage) < stageRank('printing')) {
    const blocking = screensBlocking(job.screens);
    if (blocking) warnings.push(blocking);
  }
  if (stageRank(target) >= stageRank('curing')) {
    const total = job.lines.reduce((n, l) => n + l.total, 0);
    const printed = job.lines.reduce((n, l) => n + l.printed, 0);
    if (printed < total) warnings.push(`${printed} of ${total} pieces are printed.`);
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Pieces

export function percent(printed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((printed / total) * 100)));
}

export interface LineGroup {
  key: string;
  blankName: string;
  colourName: string;
  lines: ProgressLine[];
  total: number;
  printed: number;
}

/** A job's lines by garment and colour (in the order they first appear), the sizes of each from small to large and, for one
 * size from several orders, by order. */
export function groupLines(lines: ProgressLine[]): LineGroup[] {
  const groups = new Map<string, LineGroup>();
  for (const line of lines) {
    const key = `${line.blankName}\u0000${line.colourName}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, blankName: line.blankName, colourName: line.colourName, lines: [], total: 0, printed: 0 };
      groups.set(key, group);
    }
    group.lines.push(line);
    group.total += line.total;
    group.printed += line.printed;
  }
  return [...groups.values()].map((group) => {
    const order = sortSizes([...new Set(group.lines.map((l) => l.size))]);
    const lines = [...group.lines].sort(
      (a, b) => order.indexOf(a.size) - order.indexOf(b.size) || a.orderRef.localeCompare(b.orderRef) || (a.position ?? '').localeCompare(b.position ?? '') || a.key.localeCompare(b.key),
    );
    return { ...group, lines };
  });
}

// ---------------------------------------------------------------------------
// Words

/** How long ago, as the "Updated" line says it. */
export function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

/** 'Underwriter · v3' -> 'UN', for the plate behind a job with no proof yet. */
export function initialsOf(title: string): string {
  const words = title
    .replace(/[·|–—-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w));
  const first = words[0]?.[0] ?? '?';
  const second = words.length > 1 && !/^v\d+$/i.test(words[1]) ? words[1][0] : (words[0]?.[1] ?? '');
  return `${first}${second}`.toUpperCase();
}
