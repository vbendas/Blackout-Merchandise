// The print job queue on PGlite: enqueue and dedupe, claim, heartbeat, complete,
// fail with backoff and retry, recovery of a lost worker, status queries.
// PGlite is one connection, so the "two workers" here take turns; what is
// checked is that each statement hands a job to exactly one of them.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RECIPE } from '@/lib/print/defaults';
import type { PrintJobInput } from '@/lib/print/types';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';

let t: TestDb;
let jobs: typeof import('@/lib/print/jobs');
let designId: string;
let versionId: string;
let userId: string;
let counter = 0;

before(async () => {
  process.env.PRINT_JOB_BACKOFF_SECONDS = '30';
  t = await setupTestDb();
  jobs = await import('@/lib/print/jobs');
  const { schema } = await import('@/lib/db');
  const seeded = await seedUser(t.db, { email: 'jobs@blackoutmerch.test', withStore: true });
  userId = seeded.userId;
  const [design] = await t.db.insert(schema.designs).values({ storeId: seeded.storeId!, source: 'upload' }).returning();
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

/** A distinct input each time unless told which colours to use. */
function input(overrides: Partial<PrintJobInput> = {}): PrintJobInput {
  counter += 1;
  return {
    designId,
    designVersionId: versionId,
    storeId: 'store',
    blankCode: 'STTU169',
    garmentCodes: [`C${String(counter).padStart(3, '0')}`],
    placements: [{ position: 'front_chest', widthMm: 280 }],
    techniques: ['screen', 'dtg_dtf'],
    recipe: DEFAULT_RECIPE,
    ...overrides,
  };
}

async function row(jobId: string) {
  const found = await jobs.getPrintJob(jobId);
  assert.ok(found, `job ${jobId} exists`);
  return found;
}

async function secondsUntilDue(jobId: string): Promise<number> {
  const res = await t.client.query<{ s: number }>('select extract(epoch from (run_after - now()))::float8 as s from print_jobs where id = $1', [jobId]);
  return res.rows[0].s;
}

async function setSql(jobId: string, assignments: string): Promise<void> {
  await t.client.query(`update print_jobs set ${assignments} where id = $1`, [jobId]);
}

/** Empties the queue between tests. */
async function clearJobs(): Promise<void> {
  await t.client.query('delete from print_jobs');
}

test('hashJobInput ignores key order and unset fields, and sees real changes', () => {
  const a = input({ garmentCodes: ['C001', 'C002'] });
  const sameButReordered = {
    techniques: [...a.techniques].reverse(),
    recipe: a.recipe,
    placements: a.placements,
    garmentCodes: ['C002', 'C001'],
    blankCode: a.blankCode,
    storeId: a.storeId,
    designVersionId: a.designVersionId,
    designId: a.designId,
    inkSystemId: undefined,
  } satisfies PrintJobInput;
  assert.equal(jobs.hashJobInput(a), jobs.hashJobInput(sameButReordered));
  assert.match(jobs.hashJobInput(a), /^[0-9a-f]{64}$/);

  assert.notEqual(jobs.hashJobInput(a), jobs.hashJobInput({ ...a, recipe: { ...a.recipe, maxScreens: 6 } }));
  assert.notEqual(jobs.hashJobInput(a), jobs.hashJobInput({ ...a, recipe: { ...a.recipe, halftone: { ...a.recipe.halftone, lpi: 45 } } }));
  assert.notEqual(jobs.hashJobInput(a), jobs.hashJobInput({ ...a, garmentCodes: ['C001'] }));
  assert.notEqual(jobs.hashJobInput(a), jobs.hashJobInput({ ...a, placements: [{ position: 'back', widthMm: 280 }] }));
  assert.notEqual(jobs.hashJobInput(a), jobs.hashJobInput({ ...a, rerun: { packId: 'p', settings: { maxScreens: 4 } } }));
});

test('enqueue stores the job queued, and an identical queued or running job is reused', async () => {
  await clearJobs();
  const a = input();
  const first = await jobs.enqueuePrintJob({ kind: 'prepare', input: a, createdBy: userId });
  assert.equal(first.deduped, false);

  const stored = await row(first.jobId);
  assert.equal(stored.status, 'queued');
  assert.equal(stored.kind, 'prepare');
  assert.equal(stored.attempts, 0);
  assert.equal(stored.maxAttempts, 3);
  assert.equal(stored.designVersionId, versionId);
  assert.equal(stored.inputHash, jobs.hashJobInput(a));
  assert.equal(stored.createdBy, userId);
  assert.deepEqual(stored.input, JSON.parse(JSON.stringify(a)));

  const again = await jobs.enqueuePrintJob({ kind: 'prepare', input: { ...a, garmentCodes: [...a.garmentCodes] } });
  assert.deepEqual(again, { jobId: first.jobId, deduped: true });

  // running counts as active
  const claimed = await jobs.claimNextPrintJob('w1');
  assert.equal(claimed?.id, first.jobId);
  assert.deepEqual(await jobs.enqueuePrintJob({ kind: 'prepare', input: a }), { jobId: first.jobId, deduped: true });

  // a different input, or a different kind, is its own job
  const other = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  assert.equal(other.deduped, false);
  assert.notEqual(other.jobId, first.jobId);
  const rerun = await jobs.enqueuePrintJob({ kind: 'rerun', input: a });
  assert.equal(rerun.deduped, false);

  // once it is done the same input can run again (the ink system may have changed)
  await jobs.completePrintJob(first.jobId, { packIds: [], warnings: [] }, 'w1');
  const afterDone = await jobs.enqueuePrintJob({ kind: 'prepare', input: a });
  assert.equal(afterDone.deduped, false);
  assert.notEqual(afterDone.jobId, first.jobId);

  const custom = await jobs.enqueuePrintJob({ kind: 'prepare', input: input(), maxAttempts: 5 });
  assert.equal((await row(custom.jobId)).maxAttempts, 5);
});

test('enqueue refuses a design version that does not exist', async () => {
  await assert.rejects(() => jobs.enqueuePrintJob({ kind: 'prepare', input: input({ designVersionId: '00000000-0000-4000-8000-000000000000' }) }));
});

test('claim takes the oldest due job, marks it running, and never hands one job out twice', async () => {
  await clearJobs();
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) ids.push((await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId);
  // oldest due first: make the order explicit rather than trust insert timing
  await setSql(ids[0], "run_after = now() - interval '30 seconds'");
  await setSql(ids[1], "run_after = now() - interval '20 seconds'");
  await setSql(ids[2], "run_after = now() - interval '10 seconds'");

  const one = await jobs.claimNextPrintJob('worker-a');
  const two = await jobs.claimNextPrintJob('worker-b');
  const three = await jobs.claimNextPrintJob('worker-a');
  assert.deepEqual([one?.id, two?.id, three?.id], ids);
  assert.equal(await jobs.claimNextPrintJob('worker-b'), null, 'an empty queue gives null');

  assert.equal(one?.status, 'running');
  assert.equal(one?.attempts, 1);
  assert.equal(one?.lockedBy, 'worker-a');
  assert.equal(two?.lockedBy, 'worker-b');
  assert.ok(one?.lockedAt instanceof Date);
  assert.ok(one?.startedAt instanceof Date);
  assert.equal(one?.finishedAt, null);
});

test('claim skips jobs that are not due yet, and the claim statement locks with SKIP LOCKED', async () => {
  await clearJobs();
  const { jobId: later } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  await setSql(later, "run_after = now() + interval '1 hour'");
  assert.equal(await jobs.claimNextPrintJob('w'), null);

  const statements: string[] = [];
  const original = t.client.query.bind(t.client);
  (t.client as { query: unknown }).query = ((text: string, ...rest: unknown[]) => {
    statements.push(text);
    return (original as (...a: unknown[]) => unknown)(text, ...rest);
  }) as typeof t.client.query;
  try {
    await jobs.claimNextPrintJob('w');
  } finally {
    (t.client as { query: unknown }).query = original;
  }
  const claim = statements.find((s) => /^\s*update "print_jobs"/i.test(s));
  assert.ok(claim, 'the claim is one UPDATE statement');
  assert.match(claim, /for update skip locked/i);
});

test('complete records the result and releases the lock; only the worker that holds the job can', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  await assert.rejects(() => jobs.completePrintJob(jobId, { packIds: [], warnings: [] }), { name: 'PrintJobStateError' }, 'a queued job is not running');

  await jobs.claimNextPrintJob('w1');
  await assert.rejects(() => jobs.completePrintJob(jobId, { packIds: ['x'], warnings: [] }, 'w2'), { name: 'PrintJobStateError' });
  assert.equal((await row(jobId)).status, 'running');

  const result = { packIds: ['pack-1', 'pack-2'], warnings: [{ code: 'thin_lines', message: 'Thin lines', severity: 'review' as const }] };
  await jobs.completePrintJob(jobId, result, 'w1');
  const done = await row(jobId);
  assert.equal(done.status, 'done');
  assert.deepEqual(done.result, result);
  assert.equal(done.error, null);
  assert.equal(done.lockedBy, null);
  assert.equal(done.lockedAt, null);
  assert.ok(done.finishedAt instanceof Date);

  await assert.rejects(() => jobs.completePrintJob(jobId, result, 'w1'), { name: 'PrintJobStateError' }, 'twice is an error');
});

test('fail requeues with a doubling backoff, and gives up after max_attempts', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });

  await jobs.claimNextPrintJob('w1');
  assert.deepEqual(await jobs.failPrintJob(jobId, 'engine ran out of memory', 'w1'), { retrying: true });
  let job = await row(jobId);
  assert.equal(job.status, 'queued');
  assert.equal(job.error, 'engine ran out of memory');
  assert.equal(job.attempts, 1);
  assert.equal(job.lockedBy, null);
  assert.equal(job.finishedAt, null);
  let wait = await secondsUntilDue(jobId);
  assert.ok(wait > 25 && wait <= 30.5, `first retry in ~30 s, got ${wait}`);
  assert.equal(await jobs.claimNextPrintJob('w1'), null, 'not claimable during the backoff');

  await setSql(jobId, 'run_after = now()');
  const second = await jobs.claimNextPrintJob('w2');
  assert.equal(second?.attempts, 2);
  assert.deepEqual(await jobs.failPrintJob(jobId, 'second failure'), { retrying: true });
  wait = await secondsUntilDue(jobId);
  assert.ok(wait > 55 && wait <= 60.5, `second retry in ~60 s, got ${wait}`);

  await setSql(jobId, 'run_after = now()');
  await jobs.claimNextPrintJob('w1');
  assert.deepEqual(await jobs.failPrintJob(jobId, 'third failure'), { retrying: false });
  job = await row(jobId);
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'third failure');
  assert.equal(job.attempts, 3);
  assert.ok(job.finishedAt instanceof Date);
  assert.equal(await jobs.claimNextPrintJob('w1'), null, 'a failed job is not retried');

  await assert.rejects(() => jobs.failPrintJob(jobId, 'again'), { name: 'PrintJobStateError' });
});

test('the SQL backoff and backoffSeconds agree, up to the cap', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input(), maxAttempts: 20 });
  for (const attempts of [1, 2, 3, 4, 5, 8, 12]) {
    await setSql(jobId, `status = 'running', attempts = ${attempts}, locked_by = 'w', locked_at = now()`);
    await jobs.failPrintJob(jobId, 'x', 'w');
    const wait = await secondsUntilDue(jobId);
    const expected = jobs.backoffSeconds(attempts, 30);
    assert.ok(Math.abs(wait - expected) < 1.5, `attempts ${attempts}: ${wait} vs ${expected}`);
  }
  assert.equal(jobs.backoffSeconds(1, 30), 30);
  assert.equal(jobs.backoffSeconds(4, 30), 240);
  assert.equal(jobs.backoffSeconds(12, 30), 600);
});

test('PRINT_JOB_BACKOFF_SECONDS=0 retries at once', async () => {
  await clearJobs();
  process.env.PRINT_JOB_BACKOFF_SECONDS = '0';
  try {
    const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
    await jobs.claimNextPrintJob('w');
    assert.deepEqual(await jobs.failPrintJob(jobId, 'x', 'w'), { retrying: true });
    assert.equal((await jobs.claimNextPrintJob('w'))?.id, jobId);
  } finally {
    process.env.PRINT_JOB_BACKOFF_SECONDS = '30';
  }
});

test('heartbeat refreshes the lock for the worker that holds the job and nobody else', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  assert.equal(await jobs.heartbeatPrintJob(jobId, 'w1'), false, 'queued');
  await jobs.claimNextPrintJob('w1');

  await setSql(jobId, "locked_at = now() - interval '5 minutes'");
  assert.equal(await jobs.heartbeatPrintJob(jobId, 'w2'), false, 'another worker cannot keep it alive');
  assert.equal(await jobs.heartbeatPrintJob(jobId, 'w1'), true);
  const age = await t.client.query<{ s: number }>('select extract(epoch from (now() - locked_at))::float8 as s from print_jobs where id = $1', [jobId]);
  assert.ok(age.rows[0].s < 5, `the lock is fresh again, ${age.rows[0].s} s old`);

  await jobs.completePrintJob(jobId, { packIds: [], warnings: [] }, 'w1');
  assert.equal(await jobs.heartbeatPrintJob(jobId, 'w1'), false, 'done');
});

test('recovery requeues jobs whose worker went quiet, fails the ones out of attempts, leaves live ones', async () => {
  await clearJobs();
  const lost = (await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId;
  const exhausted = (await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId;
  const alive = (await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId;
  const waiting = (await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId;
  await setSql(lost, "run_after = now() - interval '4 minutes'");
  await setSql(exhausted, "run_after = now() - interval '3 minutes'");
  await setSql(alive, "run_after = now() - interval '2 minutes'");
  await jobs.claimNextPrintJob('dead-worker'); // lost
  await jobs.claimNextPrintJob('dead-worker'); // exhausted
  await jobs.claimNextPrintJob('live-worker'); // alive

  await setSql(lost, "locked_at = now() - interval '20 minutes'");
  await setSql(exhausted, "locked_at = now() - interval '20 minutes', attempts = max_attempts");
  await setSql(alive, "locked_at = now() - interval '30 seconds'");

  const result = await jobs.recoverStuckPrintJobs({ olderThanSeconds: 600 });
  assert.deepEqual({ requeued: result.requeued, failed: result.failed }, { requeued: 1, failed: 1 });
  assert.deepEqual([...result.jobIds].sort(), [lost, exhausted].sort());

  const requeued = await row(lost);
  assert.equal(requeued.status, 'queued');
  assert.equal(requeued.attempts, 1, 'the lost attempt still counts');
  assert.equal(requeued.lockedBy, null);
  assert.match(requeued.error ?? '', /stopped responding/);

  const gaveUp = await row(exhausted);
  assert.equal(gaveUp.status, 'failed');
  assert.ok(gaveUp.finishedAt instanceof Date);

  assert.equal((await row(alive)).status, 'running');
  assert.equal((await row(waiting)).status, 'queued');
  assert.deepEqual(await jobs.recoverStuckPrintJobs({ olderThanSeconds: 600 }), { requeued: 0, failed: 0, jobIds: [] });

  // the recovered job runs again, ahead of the job that was queued after it
  assert.equal((await jobs.claimNextPrintJob('new-worker'))?.id, lost);
  assert.equal((await jobs.claimNextPrintJob('new-worker'))?.id, waiting);
});

test('a worker that lost its job cannot finish it later', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  await jobs.claimNextPrintJob('slow');
  await setSql(jobId, "locked_at = now() - interval '20 minutes'");
  await jobs.recoverStuckPrintJobs();
  const taken = await jobs.claimNextPrintJob('fast');
  assert.equal(taken?.id, jobId);
  assert.equal(taken?.attempts, 2);

  assert.equal(await jobs.heartbeatPrintJob(jobId, 'slow'), false);
  await assert.rejects(() => jobs.completePrintJob(jobId, { packIds: ['stale'], warnings: [] }, 'slow'), { name: 'PrintJobStateError' });
  await assert.rejects(() => jobs.failPrintJob(jobId, 'stale', 'slow'), { name: 'PrintJobStateError' });
  await jobs.completePrintJob(jobId, { packIds: ['fresh'], warnings: [] }, 'fast');
  assert.deepEqual((await row(jobId)).result, { packIds: ['fresh'], warnings: [] });
});

test('release hands a running job back at once and gives the attempt back', async () => {
  await clearJobs();
  const { jobId } = await jobs.enqueuePrintJob({ kind: 'prepare', input: input() });
  await jobs.claimNextPrintJob('w1');
  assert.equal(await jobs.releasePrintJob(jobId, 'w2'), false);
  assert.equal(await jobs.releasePrintJob(jobId, 'w1'), true);

  const released = await row(jobId);
  assert.equal(released.status, 'queued');
  assert.equal(released.attempts, 0);
  assert.equal(released.lockedBy, null);
  assert.ok((await secondsUntilDue(jobId)) <= 0.5, 'due immediately');
  assert.equal((await jobs.claimNextPrintJob('w3'))?.id, jobId);
  assert.equal(await jobs.releasePrintJob('00000000-0000-4000-8000-000000000000', 'w'), false);
});

test('status queries: one job with its place in the queue, lists by version, and the queue totals', async () => {
  await clearJobs();
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) ids.push((await jobs.enqueuePrintJob({ kind: 'prepare', input: input() })).jobId);
  await setSql(ids[0], "run_after = now() - interval '30 seconds'");
  await setSql(ids[1], "run_after = now() - interval '20 seconds'");
  await setSql(ids[2], "run_after = now() - interval '10 seconds'");

  assert.equal((await jobs.getPrintJobStatus(ids[0]))?.position, 1);
  assert.equal((await jobs.getPrintJobStatus(ids[2]))?.position, 3);
  assert.equal(await jobs.getPrintJobStatus('00000000-0000-4000-8000-000000000000'), null);

  await jobs.claimNextPrintJob('w1');
  const running = await jobs.getPrintJobStatus(ids[0]);
  assert.equal(running?.status, 'running');
  assert.equal(running?.position, null);
  assert.equal(running?.attempts, 1);
  assert.equal(running?.maxAttempts, 3);
  assert.equal(running?.designVersionId, versionId);
  assert.equal(running?.kind, 'prepare');
  assert.ok(running?.startedAt && !Number.isNaN(Date.parse(running.startedAt)));
  assert.equal((await jobs.getPrintJobStatus(ids[1]))?.position, 1, 'the next one moves up');

  await jobs.failPrintJob(ids[0], 'broke', 'w1');
  const retrying = await jobs.getPrintJobStatus(ids[0]);
  assert.equal(retrying?.status, 'queued');
  assert.equal(retrying?.error, 'broke', 'the last error stays visible while it waits');
  assert.equal(retrying?.position, 3, 'a retry waits behind the jobs that are due');

  const all = await jobs.listPrintJobs({ designVersionId: versionId });
  assert.equal(all.length, 3);
  assert.equal((await jobs.listPrintJobs({ designId })).length, 3);
  assert.equal((await jobs.listPrintJobs({ designId: '00000000-0000-4000-8000-000000000000' })).length, 0);
  assert.equal((await jobs.listPrintJobs({ status: 'running' })).length, 0);
  assert.equal((await jobs.listPrintJobs({ limit: 2 })).length, 2);

  await jobs.claimNextPrintJob('w1');
  await setSql(ids[1], "locked_at = now() - interval '20 minutes'");
  const stats = await jobs.getQueueStats();
  assert.deepEqual({ queued: stats.queued, running: stats.running, done: stats.done, failed: stats.failed, stuck: stats.stuck }, { queued: 2, running: 1, done: 0, failed: 0, stuck: 1 });
  assert.ok(stats.oldestQueuedAt && !Number.isNaN(Date.parse(stats.oldestQueuedAt)));
});
