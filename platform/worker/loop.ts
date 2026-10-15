// The print worker's loop (WP5): claim a job, run the handler, record the
// result or the failure. It knows nothing about the database or the pipeline:
// both arrive as arguments (worker/print-worker.ts wires the real ones), which
// keeps the loop testable with a fake queue and a mocked handler.
//
// What it guarantees:
//   - a job that finishes is completed; one that throws is failed, and the
//     queue retries it with backoff until max_attempts;
//   - a running job heartbeats, so a worker that dies is noticed by recovery
//     (here and in any other worker) and its job goes back to the queue;
//   - on stop the worker claims nothing more, waits up to shutdownGraceMs for
//     what is running, then hands unfinished jobs back untouched;
//   - a job that runs past jobTimeoutMs is failed and the worker exits with
//     code 1, so the host restarts a clean process (the handler cannot be
//     cancelled, and it may still hold gigabytes);
//   - after maxJobs jobs it stops claiming and exits with code 0, so the host
//     restarts a fresh process: the PSD decoder's WebAssembly memory only
//     grows, and a new process gives it back.
import type { PrintJobRow } from '@/lib/print/jobs';
import type { PrintJobResult } from '@/lib/print/types';
import { errorFields, type Logger } from './log';

export interface WorkerQueue {
  claim(workerId: string): Promise<PrintJobRow | null>;
  complete(jobId: string, result: PrintJobResult, workerId: string): Promise<void>;
  fail(jobId: string, error: string, workerId: string): Promise<{ retrying: boolean }>;
  heartbeat(jobId: string, workerId: string): Promise<boolean>;
  release(jobId: string, workerId: string): Promise<boolean>;
  recoverStuck(opts: { olderThanSeconds: number }): Promise<{ requeued: number; failed: number; jobIds: string[] }>;
}

export type JobHandler = (job: PrintJobRow) => Promise<PrintJobResult>;

export interface WorkerOptions {
  workerId: string;
  /** jobs at once */
  concurrency: number;
  /** wait between polls of an empty queue; grows to maxPollMs while it stays empty */
  pollMs: number;
  maxPollMs: number;
  heartbeatMs: number;
  recoverEveryMs: number;
  /** a running job silent for this long is presumed lost */
  stuckAfterSeconds: number;
  shutdownGraceMs: number;
  jobTimeoutMs: number;
  /** jobs one process runs before it exits for a fresh one; 0 for no limit */
  maxJobs?: number;
}

export interface WorkerExit {
  /** process exit code: 0 for a requested stop, 1 after a timeout or a crash */
  code: number;
  reason: string;
  /** jobs handed back to the queue because they had not finished */
  released: string[];
}

export interface RunningWorker {
  /** Stop claiming and drain. A second call does not wait: it releases at once. */
  stop(reason: string, code?: number): void;
  readonly done: Promise<WorkerExit>;
}

class JobTimeoutError extends Error {
  constructor(ms: number) {
    super(`The job ran for more than ${Math.round(ms / 1000)} s and was stopped.`);
    this.name = 'JobTimeoutError';
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Recording a result is worth a few tries: a database blip should not throw
 * away minutes of rendering. A state error (the job is no longer ours) will
 * not get better, so it is not retried. */
async function withRetries<T>(fn: () => Promise<T>, delaysMs: number[] = [500, 2_000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const hopeless = err instanceof Error && err.name === 'PrintJobStateError';
      if (hopeless || attempt >= delaysMs.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}

export function startWorker(deps: { queue: WorkerQueue; handler: JobHandler; log: Logger; options: WorkerOptions }): RunningWorker {
  const { queue, handler, log, options: o } = deps;
  const running = new Map<string, PrintJobRow>();
  const heartbeats = new Map<string, NodeJS.Timeout>();
  /** jobs handed back while their handler was still going: it may finish later,
   * and by then the result is not ours to record */
  const abandoned = new Set<string>();
  const wake = new AbortController();
  let stopping = false;
  let forced = false;
  let exitCode = 0;
  let exitReason = 'stopped';
  let jobsRun = 0;
  let signalStop: () => void = () => undefined;
  let signalForce: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => (signalStop = resolve));
  const forceRequested = new Promise<void>((resolve) => (signalForce = resolve));

  /** A pause that a stop cuts short. */
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (stopping) return resolve();
      const timer = setTimeout(finish, ms);
      function finish() {
        clearTimeout(timer);
        wake.signal.removeEventListener('abort', finish);
        resolve();
      }
      wake.signal.addEventListener('abort', finish, { once: true });
    });
  }

  async function release(job: PrintJobRow): Promise<boolean> {
    try {
      const released = await queue.release(job.id, o.workerId);
      log.warn('job.released', { jobId: job.id, released });
      return released;
    } catch (err) {
      log.error('job.release_failed', { jobId: job.id, ...errorFields(err) });
      return false;
    }
  }

  async function recover(): Promise<void> {
    try {
      const result = await queue.recoverStuck({ olderThanSeconds: o.stuckAfterSeconds });
      if (result.requeued || result.failed) log.warn('jobs.recovered', result);
    } catch (err) {
      log.warn('recover.failed', errorFields(err));
    }
  }

  async function runJob(job: PrintJobRow): Promise<void> {
    const jobLog = log.child({ jobId: job.id, kind: job.kind, attempt: job.attempts, maxAttempts: job.maxAttempts });
    const startedAt = Date.now();
    jobLog.info('job.started', { designVersionId: job.designVersionId });

    let beating = false;
    let lockLost = false;
    const beat = setInterval(() => {
      if (beating) return;
      beating = true;
      queue
        .heartbeat(job.id, o.workerId)
        .then((alive) => {
          if (!alive && !lockLost) {
            lockLost = true;
            jobLog.warn('job.lock_lost', { note: 'the job was taken from this worker; its result will be refused' });
          }
        })
        .catch((err) => jobLog.warn('heartbeat.failed', errorFields(err)))
        .finally(() => {
          beating = false;
        });
    }, o.heartbeatMs);
    heartbeats.set(job.id, beat);

    let timer: NodeJS.Timeout | undefined;
    let outcome: { ok: true; result: PrintJobResult } | { ok: false; error: unknown };
    try {
      // The handler cannot be cancelled: if the timeout wins, its eventual
      // rejection must not surface as an unhandled one.
      const handling = Promise.resolve().then(() => handler(job));
      handling.catch(() => undefined);
      const result = await Promise.race([
        handling,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new JobTimeoutError(o.jobTimeoutMs)), o.jobTimeoutMs);
          // the heartbeat and poll timers keep the process alive; this one must not
          timer.unref();
        }),
      ]);
      outcome = { ok: true, result };
    } catch (error) {
      outcome = { ok: false, error };
    } finally {
      clearInterval(beat);
      heartbeats.delete(job.id);
      clearTimeout(timer);
    }

    const durationMs = Date.now() - startedAt;
    if (abandoned.has(job.id)) {
      jobLog.warn('job.abandoned', { durationMs, finished: outcome.ok });
      return;
    }
    if (outcome.ok) {
      const { result } = outcome;
      try {
        await withRetries(() => queue.complete(job.id, result, o.workerId));
        jobLog.info('job.done', { durationMs, packs: result.packIds.length, warnings: result.warnings.length });
      } catch (err) {
        // Still marked running: recovery requeues it and the pipeline, which is
        // idempotent per input, runs it again.
        jobLog.error('job.complete_failed', { durationMs, ...errorFields(err) });
      }
    } else {
      jobLog.error('job.failed', { durationMs, ...errorFields(outcome.error) });
      try {
        const { retrying } = await withRetries(() => queue.fail(job.id, messageOf(outcome.error), o.workerId));
        jobLog.info(retrying ? 'job.will_retry' : 'job.gave_up', { durationMs });
      } catch (err) {
        jobLog.error('job.fail_record_failed', { ...errorFields(err) });
      }
      if (outcome.error instanceof JobTimeoutError) stop('a job timed out; restarting for a clean process', 1);
    }
  }

  async function slot(index: number): Promise<void> {
    let idleMs = o.pollMs;
    while (!stopping) {
      try {
        const job = await queue.claim(o.workerId);
        if (!job) {
          await sleep(idleMs);
          idleMs = Math.min(Math.ceil(idleMs * 1.5), o.maxPollMs);
          continue;
        }
        if (stopping) {
          await release(job);
          break;
        }
        idleMs = o.pollMs;
        running.set(job.id, job);
        try {
          await runJob(job);
        } finally {
          running.delete(job.id);
        }
        jobsRun += 1;
        if (o.maxJobs && jobsRun >= o.maxJobs) stop(`ran ${jobsRun} jobs; restarting for a fresh process`);
      } catch (err) {
        // The queue could not be reached (or the loop itself tripped): say so,
        // wait, and try again; a worker that gives up on a database blip would
        // leave the queue unattended until someone noticed.
        log.error('worker.loop_error', { slot: index, ...errorFields(err) });
        idleMs = Math.min(idleMs * 2, o.maxPollMs);
        await sleep(idleMs);
      }
    }
  }

  function stop(reason: string, code = 0): void {
    exitCode = Math.max(exitCode, code);
    if (stopping) {
      if (!forced) {
        forced = true;
        log.warn('worker.force_stop', { reason, running: running.size });
        signalForce();
      }
      return;
    }
    stopping = true;
    exitReason = reason;
    log.info('worker.stopping', { reason, running: running.size, graceMs: o.shutdownGraceMs });
    wake.abort();
    signalStop();
  }

  log.info('worker.started', {
    concurrency: o.concurrency,
    pollMs: o.pollMs,
    heartbeatMs: o.heartbeatMs,
    stuckAfterSeconds: o.stuckAfterSeconds,
    jobTimeoutMs: o.jobTimeoutMs,
    maxJobs: o.maxJobs ?? 0,
  });
  const slots = Array.from({ length: o.concurrency }, (_, index) => slot(index));
  const recoverTimer = setInterval(() => void recover(), o.recoverEveryMs);
  void recover();

  const done = (async (): Promise<WorkerExit> => {
    await stopped;
    clearInterval(recoverTimer);
    let graceTimer: NodeJS.Timeout | undefined;
    const outcome = await Promise.race([
      Promise.allSettled(slots).then(() => 'drained' as const),
      new Promise<'grace'>((resolve) => {
        graceTimer = setTimeout(() => resolve('grace'), o.shutdownGraceMs);
      }),
      forceRequested.then(() => 'forced' as const),
    ]);
    clearTimeout(graceTimer);

    const released: string[] = [];
    if (outcome !== 'drained') {
      log.warn('worker.draining_cut_short', { outcome, running: running.size });
      for (const job of [...running.values()]) {
        // no more heartbeats for a job that is no longer ours
        clearInterval(heartbeats.get(job.id));
        heartbeats.delete(job.id);
        abandoned.add(job.id);
        if (await release(job)) released.push(job.id);
      }
    }
    log.info('worker.stopped', { reason: exitReason, code: exitCode, released: released.length });
    return { code: exitCode, reason: exitReason, released };
  })();

  return { stop, done };
}
