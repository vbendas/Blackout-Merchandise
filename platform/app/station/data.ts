// What the station pages and actions read and change, in one place: the service behind them
// (lib/services/production-progress.ts, or the samples of STATION_MOCK=1), the job sheet as data, and the
// proofs a list shows. Every answer is a StationResult: a failure the person can act on comes back as a message to
// show, never as a thrown error (a message thrown from a server action is replaced by a generic one in production,
// and a page that threw would show nothing at all).
import { unstable_rethrow } from 'next/navigation';
import type { SessionInfo } from '@/lib/auth';
import { PermissionError } from '@/lib/auth/permissions';
import type { JobSheetView } from '@/lib/print/job-sheet-view';
import { designProofThumbs, getJobSheetView, type ProofThumbs } from '@/lib/services/job-sheets';
import * as progress from '@/lib/services/production-progress';
import type {
  ProductionStage,
  ProgressResult,
  ScreenStatus,
  StationJobDetail,
  StationJobSummary,
  StationKind,
} from '@/lib/services/production-progress';
import type { StationResult } from '@/components/station/model';
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
  stationMockOn,
} from './mock-store';

type Who = Pick<SessionInfo, 'actor'>;

/** The calls a station makes on production progress: the service's own, the samples', or a test's. */
export interface StationApi {
  listStationJobs(session: Who, station: StationKind): Promise<ProgressResult<StationJobSummary[]>>;
  getStationJob(session: Who, jobId: string): Promise<ProgressResult<StationJobDetail>>;
  setPrintedCount(session: Who, jobId: string, lineKey: string, printed: number): Promise<ProgressResult<StationJobDetail>>;
  adjustPrintedCount(session: Who, jobId: string, lineKey: string, delta: number): Promise<ProgressResult<StationJobDetail>>;
  setScreenStatus(session: Who, jobId: string, screenKey: string, status: ScreenStatus): Promise<ProgressResult<StationJobDetail>>;
  setJobStage(session: Who, jobId: string, stage: ProductionStage, opts?: { force?: boolean }): Promise<ProgressResult<StationJobDetail>>;
  setHiddenFromBoard(session: Who, jobId: string, hidden: boolean): Promise<ProgressResult<StationJobDetail>>;
}

const real: StationApi = {
  listStationJobs: progress.listStationJobs,
  getStationJob: progress.getStationJob,
  setPrintedCount: progress.setPrintedCount,
  adjustPrintedCount: progress.adjustPrintedCount,
  setScreenStatus: progress.setScreenStatus,
  setJobStage: progress.setJobStage,
  setHiddenFromBoard: progress.setHiddenFromBoard,
};

const sample: StationApi = {
  listStationJobs: mockListStationJobs,
  getStationJob: mockGetStationJob,
  setPrintedCount: mockSetPrintedCount,
  adjustPrintedCount: mockAdjustPrintedCount,
  setScreenStatus: mockSetScreenStatus,
  setJobStage: mockSetJobStage,
  setHiddenFromBoard: mockSetHiddenFromBoard,
};

let override: StationApi | null = null;

/** A test's stand-in for the service (null puts the real one back). */
export function setStationApiForTests(api: StationApi | null): void {
  override = api;
}

export function stationApi(): StationApi {
  return override ?? (stationMockOn() ? sample : real);
}

export const SOMETHING_WRONG = 'Something went wrong. Try again.';

/** The service's answer as a StationResult; whatever it throws becomes a message too, and is logged. */
export async function settle<T>(run: () => Promise<ProgressResult<T>>): Promise<StationResult<T>> {
  try {
    const result = await run();
    return result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
  } catch (err) {
    // a sign-in redirect or a not-found is Next's to handle, not ours to word
    unstable_rethrow(err);
    if (err instanceof PermissionError) return { ok: false, error: err.message, denied: true };
    console.error('[station]', err instanceof Error ? err.message : err);
    return { ok: false, error: SOMETHING_WRONG };
  }
}

// ---------------------------------------------------------------------------
// The queue

/** The queue: every job on the floor with the proofs of the designs the screen does not have yet. */
export interface QueueSnapshot {
  jobs: StationJobSummary[];
  thumbs: ProofThumbs;
}

async function thumbsFor(session: Who, designIds: string[]): Promise<ProofThumbs> {
  if (designIds.length === 0) return {};
  if (stationMockOn()) return mockThumbs(designIds);
  try {
    return await designProofThumbs(session.actor, designIds);
  } catch (err) {
    // A list without its pictures is still a list.
    unstable_rethrow(err);
    console.error('[station] proofs:', err instanceof Error ? err.message : err);
    return {};
  }
}

/** Every job at every station (the screen filters by method itself, so the picker can count them), with the proofs of
 * the designs in `known` left out: the screen keeps what it has. */
export async function loadQueue(session: SessionInfo, known: readonly string[] = []): Promise<StationResult<QueueSnapshot>> {
  const listed = await settle(() => stationApi().listStationJobs(session, 'all'));
  if (!listed.ok) return listed;
  const have = new Set(known);
  const wanted = [...new Set(listed.value.map((job) => job.designId))].filter((designId) => !have.has(designId));
  return { ok: true, value: { jobs: listed.value, thumbs: await thumbsFor(session, wanted) } };
}

// ---------------------------------------------------------------------------
// One job

/** A job with its job sheet: the counts to change and what to print them from. The sheet is `null` when it could not be read
 * (the job is still counted); `sheetProblem` says so. */
export interface JobPage {
  job: StationJobDetail;
  view: JobSheetView | null;
  sheetProblem: string | null;
}

export async function loadJob(session: SessionInfo, jobId: string): Promise<StationResult<JobPage>> {
  const found = await settle(() => stationApi().getStationJob(session, jobId));
  if (!found.ok) return found;
  const job = found.value;
  try {
    const view = stationMockOn() ? mockJobSheetFor(job.designId) : await getJobSheetView(session.actor, job.designId);
    return { ok: true, value: { job, view, sheetProblem: view ? null : 'There is no job sheet for this design yet.' } };
  } catch (err) {
    unstable_rethrow(err);
    console.error('[station] job sheet:', err instanceof Error ? err.message : err);
    return { ok: true, value: { job, view: null, sheetProblem: 'The job sheet could not be loaded. The PDF may still open.' } };
  }
}
