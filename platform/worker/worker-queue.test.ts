// The worker loop on the real queue (PGlite), with a mocked handler in place of
// lib/print/pipeline.ts: jobs run to done, retry through a failure, give up
// after max_attempts, a dead worker's job is picked up again, a stopped worker
// hands its job back, and two workers never run the same job.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RECIPE } from '@/lib/print/defaults';
import type { PrintJobRow } from '@/lib/print/jobs';
import type { PrintJobInput, PrintJobResult } from '@/lib/print/types';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { createLogger } from './log';
import { startWorker, type JobHandler, type WorkerOptions, type WorkerQueue } from './loop';

let t: TestDb;
let jobs: typeof import('@/lib/print/jobs');
let queue: WorkerQueue;
let designId: string;
let versionId: string;
let counter = 0;

const OPTIONS: WorkerOptions = {
  workerId: 'w1',
  concurrency: 1,
  pollMs: 5,
  maxPollMs: 20,
  heartbeatMs: 20,
  recoverEveryMs: 1_000,
  stuckAfterSeconds: 600,
  shutdownGraceMs: 200,
  jobTimeoutMs: 10_000,
};

const silent = createLogger({}, { write: () => undefined });

before(async () => {
  process.env.PRINT_JOB_BACKOFF_SECONDS = '0';
  t = await setupTestDb();
  jobs = await import('@/lib/print/jobs');
  queue = {
    claim: jobs.claimNextPrintJob,
    complete: jobs.completePrintJob,
    fail: jobs.failPrintJob,
    heartbeat: jobs.heartbeatPrintJob,
    release: jobs.releasePrintJob,
    recoverStuck: jobs.recoverStuckPrintJobs,
  };
  const { schema } = await import('@/lib/db');
  const { userId, storeId } = await seedUser(t.db, { email: 'worker@blackoutmerch.test', withStore: true });
  const [design] = await t.db.insert(schema.designs).values({ storeId: storeId!, source: 'upload' }).returning();
  designId = design.id;
  const [version] = await t.db
    .insert(schema.designVersions)
    .values({ designId, version: 1, artUrl: 'https://example.test/a.png', sha256: 'x', widthPx: 1080, heightPx: 1296, source: 'upload', createdBy: userId })
    .returning();
  versionId = version.id;
});

after(async () => {
  await t.close();
});

function input(tag: string): PrintJobInput {
  counter += 1;
  return {
    designId,
    designVersionId: versionId,
    storeId: 'store',
    blankCode: 'STTU169',
    garmentCodes: [`${tag}-${counter}`],
    placements: [{ position: 'front_chest', widthMm: 280 }],
    techniques: ['dtg_dtf'],
    recipe: DEFAULT_RECIPE,
  };
}

const tagOf = (job: PrintJobRow) => (job.input as PrintJobInput).garmentCodes[0];

async function enqueue(tag: string, maxAttempts?: number): Promise<string> {
  return (await jobs.enqueuePrintJob({ kind: 'prepare', input: input(tag), maxAttempts })).jobId;
}

async function row(jobId: string): Promise<PrintJobRow> {
  const found = await jobs.getPrintJob(jobId);
  assert.ok(found);
  return found;
}

async function waitFor(condition: () => Promise<boolean>, what: string, timeoutMs = 10_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function finished(ids: string[]): Promise<boolean> {
  const rows = await Promise.all(ids.map(row));
  return rows.every((r) => r.status === 'done' || r.status === 'failed');
}

async function runWorker(handler: JobHandler, options: Partial<WorkerOptions>, body: () => Promise<void>): Promise<void> {
  const worker = startWorker({ queue, handler, log: silent, options: { ...OPTIONS, ...options } });
  try {
    await body();
  } finally {
    worker.stop('test over');
    worker.stop('test over');
    await worker.done;
  }
}

test('jobs run to done, retry after a failure, and fail for good after max_attempts', async () => {
  await t.client.query('delete from print_jobs');
  const ok = await enqueue('ok');
  const flaky = await enqueue('flaky');
  const doomed = await enqueue('doomed', 2);
  const calls = new Map<string, number>();

  const handler: JobHandler = async (job): Promise<PrintJobResult> => {
    const tag = tagOf(job).split('-')[0];
    calls.set(tag, (calls.get(tag) ?? 0) + 1);
    if (tag === 'flaky' && calls.get(tag) === 1) throw new Error('first run fails');
    if (tag === 'doomed') throw new Error('this art can never be separated');
    return { packIds: [`pack-for-${job.id}`], warnings: [{ code: 'thin_lines', message: 'Thin lines', severity: 'review' }] };
  };

  await runWorker(handler, {}, async () => {
    await waitFor(() => finished([ok, flaky, doomed]), 'all three jobs to settle');
  });

  const okRow = await row(ok);
  assert.equal(okRow.status, 'done');
  assert.equal(okRow.attempts, 1);
  assert.deepEqual(okRow.result, { packIds: [`pack-for-${ok}`], warnings: [{ code: 'thin_lines', message: 'Thin lines', severity: 'review' }] });
  assert.equal(okRow.lockedBy, null);

  const flakyRow = await row(flaky);
  assert.equal(flakyRow.status, 'done');
  assert.equal(flakyRow.attempts, 2, 'ran twice');
  assert.equal(flakyRow.error, null, 'a later success clears the old error');

  const doomedRow = await row(doomed);
  assert.equal(doomedRow.status, 'failed');
  assert.equal(doomedRow.attempts, 2);
  assert.equal(doomedRow.error, 'this art can never be separated');
  assert.ok(doomedRow.finishedAt instanceof Date);

  assert.deepEqual([calls.get('ok'), calls.get('flaky'), calls.get('doomed')], [1, 2, 2]);
});

test('a job whose worker died is requeued by the next worker and runs to the end', async () => {
  await t.client.query('delete from print_jobs');
  const orphan = await enqueue('orphan');
  await jobs.claimNextPrintJob('dead-worker');
  await t.client.query("update print_jobs set locked_at = now() - interval '1 hour' where id = $1", [orphan]);
  assert.equal((await row(orphan)).status, 'running');

  const seen: string[] = [];
  await runWorker(
    async (job) => {
      seen.push(job.id);
      return { packIds: [], warnings: [] };
    },
    { recoverEveryMs: 20, stuckAfterSeconds: 60 },
    async () => {
      await waitFor(() => finished([orphan]), 'the orphan to finish');
    },
  );
  const after = await row(orphan);
  assert.equal(after.status, 'done');
  assert.equal(after.attempts, 2, 'the dead worker\'s attempt still counts');
  assert.deepEqual(seen, [orphan]);
});

test('a stopped worker hands its unfinished job back, with the attempt returned', async () => {
  await t.client.query('delete from print_jobs');
  const id = await enqueue('slow');
  let started = false;
  const worker = startWorker({
    queue,
    log: silent,
    options: { ...OPTIONS, shutdownGraceMs: 30 },
    handler: () => {
      started = true;
      return new Promise<PrintJobResult>(() => undefined);
    },
  });
  await waitFor(async () => started, 'the job to start');
  assert.equal((await row(id)).status, 'running');
  assert.equal((await row(id)).lockedBy, 'w1');

  worker.stop('SIGTERM');
  const exit = await worker.done;
  assert.deepEqual(exit.released, [id]);
  const handedBack = await row(id);
  assert.equal(handedBack.status, 'queued');
  assert.equal(handedBack.attempts, 0);
  assert.equal(handedBack.lockedBy, null);
  assert.equal((await jobs.claimNextPrintJob('next-worker'))?.id, id, 'it is the next job up');
});

test('two workers on one queue never run the same job twice', async () => {
  await t.client.query('delete from print_jobs');
  const ids: string[] = [];
  for (let i = 0; i < 8; i++) ids.push(await enqueue('shared'));
  const runs = new Map<string, string[]>();
  const handlerFor = (worker: string): JobHandler => async (job) => {
    runs.set(job.id, [...(runs.get(job.id) ?? []), worker]);
    await new Promise((resolve) => setTimeout(resolve, 15));
    return { packIds: [], warnings: [] };
  };

  const a = startWorker({ queue, log: silent, options: { ...OPTIONS, workerId: 'worker-a' }, handler: handlerFor('worker-a') });
  const b = startWorker({ queue, log: silent, options: { ...OPTIONS, workerId: 'worker-b' }, handler: handlerFor('worker-b') });
  try {
    await waitFor(() => finished(ids), 'all eight jobs');
  } finally {
    a.stop('test over');
    b.stop('test over');
    await Promise.all([a.done, b.done]);
  }

  for (const id of ids) {
    assert.equal(runs.get(id)?.length, 1, `job ${id} ran once`);
    assert.equal((await row(id)).attempts, 1);
  }
  const workers = new Set([...runs.values()].flat());
  assert.deepEqual([...workers].sort(), ['worker-a', 'worker-b'], 'both workers took part');
});
