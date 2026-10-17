'use server';

import { unstable_rethrow } from 'next/navigation';
import { requireStaffAction, type SessionInfo } from '@/lib/auth';
import { PermissionError } from '@/lib/auth/permissions';
import type { StationJobDetail } from '@/lib/services/production-progress';
import { isScreenStatus, isStage, type StationResult } from '@/components/station/model';
import { loadQueue, SOMETHING_WRONG, settle, stationApi, type QueueSnapshot } from './data';

// Server actions behind the production stations. A server action is a public endpoint, so each one checks the
// caller's own access first (requireStaffAction: Production, View to look, Work to change) and only then reads its
// input, then calls straight into the service (lib/services/production-progress.ts), which checks again and writes
// the activity log. Counts are one atomic update each, so several iPads can count the same line. A failure the
// person can act on comes back as a message in the result, never thrown: a message thrown from a server action is
// replaced by a generic one in production builds, and the screen would never see it.

type Level = 'view' | 'work';

/** The frame every action runs in: the gate, then the work. A redirect (signed out, paused) or a not-found is Next's. */
async function runStationAction<T>(level: Level, work: (session: SessionInfo) => Promise<StationResult<T>>): Promise<StationResult<T>> {
  try {
    const session = await requireStaffAction('production', level);
    return await work(session);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof PermissionError) return { ok: false, error: err.message, denied: true };
    console.error('[station action]', err instanceof Error ? err.message : err);
    return { ok: false, error: SOMETHING_WRONG };
  }
}

const NOT_UNDERSTOOD: StationResult<never> = { ok: false, error: 'That change was not understood. Reload the job and try again.' };

/** An id or key the screen sends: a non-empty string of a sensible length. */
function text(value: unknown, max = 200): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

/** A whole number within bounds. */
function whole(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/** The queue again, with the proofs of the designs the screen does not have yet. Production View. */
export async function refreshQueueAction(knownDesignIds: string[] = []): Promise<StationResult<QueueSnapshot>> {
  return runStationAction('view', async (session) => {
    const known = Array.isArray(knownDesignIds) ? knownDesignIds.slice(0, 500).filter((id): id is string => text(id, 100) !== null) : [];
    return loadQueue(session, known);
  });
}

/** One job again, with the numbers as the server has them now (other iPads' counts included). Production View. */
export async function refreshJobAction(jobId: string): Promise<StationResult<StationJobDetail>> {
  return runStationAction('view', async (session) => {
    const id = text(jobId);
    if (!id) return NOT_UNDERSTOOD;
    return settle(() => stationApi().getStationJob(session, id));
  });
}

/** Add to (or take from) one line's printed count, held between 0 and the line's total. Production Work. */
export async function adjustPrintedAction(jobId: string, lineKey: string, delta: number): Promise<StationResult<StationJobDetail>> {
  return runStationAction('work', async (session) => {
    const id = text(jobId);
    const key = text(lineKey);
    const by = whole(delta, -100_000, 100_000);
    if (!id || !key || by === null) return NOT_UNDERSTOOD;
    return settle(() => stationApi().adjustPrintedCount(session, id, key, by));
  });
}

/** Set one line's printed count exactly (0 to the line's total). Production Work. */
export async function setPrintedAction(jobId: string, lineKey: string, printed: number): Promise<StationResult<StationJobDetail>> {
  return runStationAction('work', async (session) => {
    const id = text(jobId);
    const key = text(lineKey);
    const count = whole(printed, 0, 100_000);
    if (!id || !key || count === null) return NOT_UNDERSTOOD;
    return settle(() => stationApi().setPrintedCount(session, id, key, count));
  });
}

/** Set a screen's status (waiting, film printed, screen ready, on press, reclaimed). Production Work. */
export async function setScreenStatusAction(jobId: string, screenKey: string, status: string): Promise<StationResult<StationJobDetail>> {
  return runStationAction('work', async (session) => {
    const id = text(jobId);
    const key = text(screenKey);
    if (!id || !key || !isScreenStatus(status)) return NOT_UNDERSTOOD;
    return settle(() => stationApi().setScreenStatus(session, id, key, status));
  });
}

/** Move a job to another stage; `force` passes the two holds (screens not ready, pieces not printed) once the person has
 * been asked. Shipping is not a station's step: the service refuses it. Production Work. */
export async function setStageAction(jobId: string, stage: string, force = false): Promise<StationResult<StationJobDetail>> {
  return runStationAction('work', async (session) => {
    const id = text(jobId);
    if (!id || !isStage(stage)) return NOT_UNDERSTOOD;
    return settle(() => stationApi().setJobStage(session, id, stage, { force: force === true }));
  });
}

/** Keep a job off the website's board, or put it back. Production Work. */
export async function setHiddenAction(jobId: string, hidden: boolean): Promise<StationResult<StationJobDetail>> {
  return runStationAction('work', async (session) => {
    const id = text(jobId);
    if (!id || typeof hidden !== 'boolean') return NOT_UNDERSTOOD;
    return settle(() => stationApi().setHiddenFromBoard(session, id, hidden));
  });
}
