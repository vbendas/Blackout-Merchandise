// Print job queue on the print_jobs table (WP5). The worker claims jobs with
// FOR UPDATE SKIP LOCKED, so several workers never take the same one; failed
// jobs retry with backoff until max_attempts.
//
// Every state change is one SQL statement, because the Neon HTTP driver has no
// interactive transactions. All clocks are the database's (now()), so workers
// with skewed clocks agree and nothing here writes a JavaScript Date into the
// timestamp columns.
//
// Life of a job: queued -> running (claim; attempts + 1) -> done, or back to
// queued with a delay (fail, or recovery of a lost worker) until attempts reach
// max_attempts, then failed. A running job proves it is alive by calling
// heartbeatPrintJob, which refreshes locked_at; recoverStuckPrintJobs requeues
// the ones that stopped.
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, inArray, isNull, lt, min, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { PrintJobInput, PrintJobKind, PrintJobResult } from '@/lib/print/types';
import { ENGINE_VERSION } from '@/lib/print/defaults';

export type PrintJobRow = typeof schema.printJobs.$inferSelect;
export type PrintJobStatus = PrintJobRow['status'];

export interface EnqueueInput {
  kind: PrintJobKind;
  input: PrintJobInput;
  createdBy?: string | null;
  /** defaults to 3, like the column */
  maxAttempts?: number;
}

/** Same as the column default. */
const DEFAULT_MAX_ATTEMPTS = 3;
const ACTIVE: PrintJobStatus[] = ['queued', 'running'];

/** A job that is running but has not been heard from for this long is presumed
 * lost. The worker heartbeats every 30 s, and an engine stage can hold the
 * event loop for a while, so the margin is wide. */
export const DEFAULT_STUCK_SECONDS = 600;

const BACKOFF_BASE_SECONDS = 30;
const BACKOFF_MAX_SECONDS = 600;

/** Base delay for the first retry; PRINT_JOB_BACKOFF_SECONDS overrides it (0 in tests). */
function backoffBase(): number {
  const raw = process.env.PRINT_JOB_BACKOFF_SECONDS;
  const parsed = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : BACKOFF_BASE_SECONDS;
}

/** Seconds before a job that has run `attempts` times is tried again: 30, 60,
 * 120, ... capped at 10 minutes. failPrintJob computes the same thing in SQL
 * (the test keeps the two in step); this is for showing "retrying in ...". */
export function backoffSeconds(attempts: number, base: number = backoffBase()): number {
  return Math.min(base * 2 ** Math.max(attempts - 1, 0), BACKOFF_MAX_SECONDS);
}

/** Thrown when a job is not in the state the call needs (not running, or
 * running under another worker). */
export class PrintJobStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrintJobStateError';
  }
}

// ---------------------------------------------------------------------------
// Input hash
// ---------------------------------------------------------------------------

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonical(record[key])]),
    );
  }
  return value;
}

/** sha256 over a stable JSON form of the input: keys sorted, undefined dropped,
 * and the two lists whose order means nothing (garment colours, techniques)
 * sorted, so the same drop in another order is the same job. The engine
 * version is an input too: a new engine makes new bytes, so its packs are new
 * packs rather than the old ones found again. */
export function hashJobInput(input: PrintJobInput): string {
  const normalised = {
    ...input,
    garmentCodes: [...input.garmentCodes].sort(),
    techniques: [...input.techniques].sort(),
    engineVersion: ENGINE_VERSION,
  };
  return createHash('sha256').update(JSON.stringify(canonical(normalised))).digest('hex');
}

// ---------------------------------------------------------------------------
// Producer side
// ---------------------------------------------------------------------------

/** Queues a job; an identical queued or running job (same input hash) is reused.
 *
 * The check and the insert are one statement, which closes the window that a
 * separate select would leave. Two enqueues at the very same instant can still
 * both pass it (READ COMMITTED); the partial unique index on (input_hash, kind)
 * for queued and running jobs (print_jobs_active_hash_unique) refuses the
 * second insert, which `on conflict do nothing` turns into the reuse below. */
export async function enqueuePrintJob(job: EnqueueInput): Promise<{ jobId: string; deduped: boolean }> {
  const inputHash = hashJobInput(job.input);
  const maxAttempts = job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < 3; attempt++) {
    const inserted = await db.execute(sql`
      insert into print_jobs (kind, design_version_id, input, input_hash, created_by, max_attempts)
      select ${job.kind}::text, ${job.input.designVersionId}::uuid, ${JSON.stringify(job.input)}::jsonb, ${inputHash}::text,
             ${job.createdBy ?? null}::uuid, ${maxAttempts}::int
      where not exists (
        select 1 from print_jobs
        where input_hash = ${inputHash}::text and kind = ${job.kind}::text and status in ('queued', 'running')
      )
      on conflict do nothing
      returning id
    `);
    const created = inserted.rows[0] as { id: string } | undefined;
    if (created) return { jobId: created.id, deduped: false };

    const [existing] = await db
      .select({ id: schema.printJobs.id })
      .from(schema.printJobs)
      .where(and(eq(schema.printJobs.inputHash, inputHash), eq(schema.printJobs.kind, job.kind), inArray(schema.printJobs.status, ACTIVE)))
      .orderBy(asc(schema.printJobs.createdAt))
      .limit(1);
    if (existing) return { jobId: existing.id, deduped: true };
    // The twin finished between the two statements: go round and insert.
  }
  throw new Error('Could not queue the print job: the queue kept changing underneath it.');
}

// ---------------------------------------------------------------------------
// Worker side
// ---------------------------------------------------------------------------

/** Takes the oldest due job, marking it running. Null when the queue is empty.
 *
 * attempts goes up here, not on failure, so a job that kills its worker (out of
 * memory) still counts and cannot loop forever. */
export async function claimNextPrintJob(workerId: string): Promise<PrintJobRow | null> {
  const [row] = await db
    .update(schema.printJobs)
    .set({
      status: 'running',
      attempts: sql`${schema.printJobs.attempts} + 1`,
      lockedAt: sql`now()`,
      lockedBy: workerId,
      startedAt: sql`now()`,
      finishedAt: null,
    })
    .where(
      eq(
        schema.printJobs.id,
        sql`(
          select ${schema.printJobs.id} from ${schema.printJobs}
          where ${schema.printJobs.status} = 'queued' and ${schema.printJobs.runAfter} <= now()
          order by ${schema.printJobs.runAfter} asc, ${schema.printJobs.createdAt} asc
          limit 1
          for update skip locked
        )`,
      ),
    )
    .returning();
  return row ?? null;
}

/** Refreshes the lock on a running job. False when the job is no longer this
 * worker's (recovered and given to another, or finished): stop trusting it. */
export async function heartbeatPrintJob(jobId: string, workerId: string): Promise<boolean> {
  const rows = await db
    .update(schema.printJobs)
    .set({ lockedAt: sql`now()` })
    .where(and(eq(schema.printJobs.id, jobId), eq(schema.printJobs.status, 'running'), eq(schema.printJobs.lockedBy, workerId)))
    .returning({ id: schema.printJobs.id });
  return rows.length > 0;
}

/** The job must be running, and under `workerId` when one is given (the worker
 * always gives it, so a late finish from a worker that lost the job is refused). */
function runningJob(jobId: string, workerId?: string) {
  return and(
    eq(schema.printJobs.id, jobId),
    eq(schema.printJobs.status, 'running'),
    workerId ? eq(schema.printJobs.lockedBy, workerId) : undefined,
  );
}

export async function completePrintJob(jobId: string, result: PrintJobResult, workerId?: string): Promise<void> {
  const rows = await db
    .update(schema.printJobs)
    .set({ status: 'done', result, error: null, finishedAt: sql`now()`, lockedAt: null, lockedBy: null })
    .where(runningJob(jobId, workerId))
    .returning({ id: schema.printJobs.id });
  if (rows.length === 0) throw new PrintJobStateError(`Print job ${jobId} is not running${workerId ? ` under ${workerId}` : ''}, so it cannot be completed.`);
}

/** Records the error; requeues with backoff, or marks failed after max_attempts. */
export async function failPrintJob(jobId: string, error: string, workerId?: string): Promise<{ retrying: boolean }> {
  const exhausted = sql`${schema.printJobs.attempts} >= ${schema.printJobs.maxAttempts}`;
  const rows = await db
    .update(schema.printJobs)
    .set({
      status: sql`case when ${exhausted} then 'failed'::print_job_status else 'queued'::print_job_status end`,
      error: error.slice(0, 4000),
      runAfter: sql`case when ${exhausted} then ${schema.printJobs.runAfter}
        else now() + make_interval(secs => least(${backoffBase()}::float8 * power(2, ${schema.printJobs.attempts} - 1), ${BACKOFF_MAX_SECONDS}::float8)) end`,
      finishedAt: sql`case when ${exhausted} then now() else null end`,
      lockedAt: null,
      lockedBy: null,
    })
    .where(runningJob(jobId, workerId))
    .returning({ status: schema.printJobs.status });
  if (rows.length === 0) throw new PrintJobStateError(`Print job ${jobId} is not running${workerId ? ` under ${workerId}` : ''}, so it cannot be failed.`);
  return { retrying: rows[0].status === 'queued' };
}

/** Hands a running job back untouched (the worker is shutting down before it
 * could finish): requeued in its old place (run_after is already in the past,
 * so it is next up), and the attempt it used is given back. */
export async function releasePrintJob(jobId: string, workerId: string): Promise<boolean> {
  const rows = await db
    .update(schema.printJobs)
    .set({
      status: 'queued',
      attempts: sql`greatest(${schema.printJobs.attempts} - 1, 0)`,
      lockedAt: null,
      lockedBy: null,
    })
    .where(runningJob(jobId, workerId))
    .returning({ id: schema.printJobs.id });
  return rows.length > 0;
}

/** Requeues running jobs nobody has heard from for `olderThanSeconds` (their
 * worker died); jobs out of attempts fail instead. A requeued job keeps its
 * run_after, so it goes ahead of newer work. Safe to call from every worker:
 * it is one statement. */
export async function recoverStuckPrintJobs(
  opts: { olderThanSeconds?: number } = {},
): Promise<{ requeued: number; failed: number; jobIds: string[] }> {
  const seconds = opts.olderThanSeconds ?? DEFAULT_STUCK_SECONDS;
  const exhausted = sql`${schema.printJobs.attempts} >= ${schema.printJobs.maxAttempts}`;
  const rows = await db
    .update(schema.printJobs)
    .set({
      status: sql`case when ${exhausted} then 'failed'::print_job_status else 'queued'::print_job_status end`,
      error: `The worker stopped responding (no heartbeat for ${seconds} s).`,
      finishedAt: sql`case when ${exhausted} then now() else null end`,
      lockedAt: null,
      lockedBy: null,
    })
    .where(
      and(
        eq(schema.printJobs.status, 'running'),
        or(isNull(schema.printJobs.lockedAt), lt(schema.printJobs.lockedAt, sql`now() - make_interval(secs => ${seconds}::float8)`)),
      ),
    )
    .returning({ id: schema.printJobs.id, status: schema.printJobs.status });
  return {
    requeued: rows.filter((r) => r.status === 'queued').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    jobIds: rows.map((r) => r.id),
  };
}

// ---------------------------------------------------------------------------
// Status, for the UI and the admin
// ---------------------------------------------------------------------------

export async function getPrintJob(jobId: string): Promise<PrintJobRow | null> {
  const [row] = await db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId)).limit(1);
  return row ?? null;
}

export interface PrintJobStatusView {
  jobId: string;
  kind: PrintJobKind;
  designVersionId: string;
  status: PrintJobStatus;
  attempts: number;
  maxAttempts: number;
  /** the last error, kept while the job waits to retry */
  error: string | null;
  /** queued jobs: when it becomes due (a retry waits for its backoff) */
  runAfter: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** queued jobs: 1 is next up; null otherwise */
  position: number | null;
}

function toStatusView(row: PrintJobRow, position: number | null): PrintJobStatusView {
  return {
    jobId: row.id,
    kind: row.kind as PrintJobKind,
    designVersionId: row.designVersionId,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    error: row.error,
    runAfter: row.runAfter.toISOString(),
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    position,
  };
}

async function queuePosition(row: PrintJobRow): Promise<number | null> {
  if (row.status !== 'queued') return null;
  const [ahead] = await db
    .select({ n: count() })
    .from(schema.printJobs)
    .where(
      and(
        eq(schema.printJobs.status, 'queued'),
        or(
          lt(schema.printJobs.runAfter, row.runAfter),
          and(eq(schema.printJobs.runAfter, row.runAfter), lt(schema.printJobs.createdAt, row.createdAt)),
        ),
      ),
    );
  return (ahead?.n ?? 0) + 1;
}

export async function getPrintJobStatus(jobId: string): Promise<PrintJobStatusView | null> {
  const row = await getPrintJob(jobId);
  return row ? toStatusView(row, await queuePosition(row)) : null;
}

/** Newest first. `designId` matches the design recorded in the job input. */
export async function listPrintJobs(
  filter: { designVersionId?: string; designId?: string; status?: PrintJobStatus; limit?: number } = {},
): Promise<PrintJobStatusView[]> {
  const rows = await db
    .select()
    .from(schema.printJobs)
    .where(
      and(
        filter.designVersionId ? eq(schema.printJobs.designVersionId, filter.designVersionId) : undefined,
        filter.designId ? sql`${schema.printJobs.input}->>'designId' = ${filter.designId}` : undefined,
        filter.status ? eq(schema.printJobs.status, filter.status) : undefined,
      ),
    )
    .orderBy(desc(schema.printJobs.createdAt))
    .limit(Math.min(Math.max(filter.limit ?? 20, 1), 200));
  return Promise.all(rows.map(async (row) => toStatusView(row, await queuePosition(row))));
}

export interface QueueStats {
  queued: number;
  running: number;
  done: number;
  failed: number;
  /** running jobs with no heartbeat for DEFAULT_STUCK_SECONDS */
  stuck: number;
  oldestQueuedAt: string | null;
}

export async function getQueueStats(): Promise<QueueStats> {
  const byStatus = await db.select({ status: schema.printJobs.status, n: count() }).from(schema.printJobs).groupBy(schema.printJobs.status);
  const [stuck] = await db
    .select({ n: count() })
    .from(schema.printJobs)
    .where(
      and(
        eq(schema.printJobs.status, 'running'),
        or(isNull(schema.printJobs.lockedAt), lt(schema.printJobs.lockedAt, sql`now() - make_interval(secs => ${DEFAULT_STUCK_SECONDS}::float8)`)),
      ),
    );
  const [oldest] = await db.select({ at: min(schema.printJobs.createdAt) }).from(schema.printJobs).where(eq(schema.printJobs.status, 'queued'));
  const of = (status: PrintJobStatus) => byStatus.find((r) => r.status === status)?.n ?? 0;
  return {
    queued: of('queued'),
    running: of('running'),
    done: of('done'),
    failed: of('failed'),
    stuck: stuck?.n ?? 0,
    oldestQueuedAt: oldest?.at ? new Date(oldest.at).toISOString() : null,
  };
}
