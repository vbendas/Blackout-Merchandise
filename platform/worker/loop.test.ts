// The worker loop against a fake queue and a mocked handler: completing and
// failing jobs, heartbeats, graceful shutdown, the grace period, timeouts,
// retried bookkeeping, concurrency. No database here (worker-queue.test.ts
// runs the same loop on the real queue).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PrintJobRow } from '@/lib/print/jobs';
import type { PrintJobResult } from '@/lib/print/types';
import { createLogger, errorFields, parseLogLevel } from './log';
import { loadEnvFiles, readWorkerConfig } from './config';
import { startWorker, type JobHandler, type RunningWorker, type WorkerOptions, type WorkerQueue } from './loop';

const OPTIONS: WorkerOptions = {
  workerId: 'test-worker',
  concurrency: 1,
  pollMs: 5,
  maxPollMs: 20,
  heartbeatMs: 10,
  recoverEveryMs: 50,
  stuckAfterSeconds: 600,
  shutdownGraceMs: 300,
  jobTimeoutMs: 5_000,
};

function fakeJob(n: number): PrintJobRow {
  return {
    id: `job-${n}`,
    kind: 'prepare',
    designVersionId: `version-${n}`,
    status: 'running',
    input: {},
    inputHash: `hash-${n}`,
    attempts: 1,
    maxAttempts: 3,
    runAfter: new Date(),
    lockedAt: new Date(),
    lockedBy: 'test-worker',
    error: null,
    result: null,
    createdBy: null,
    createdAt: new Date(),
    startedAt: new Date(),
    finishedAt: null,
  };
}

const RESULT: PrintJobResult = { packIds: ['pack-1'], warnings: [] };

interface Harness {
  queue: WorkerQueue;
  pending: PrintJobRow[];
  completed: { id: string; result: PrintJobResult; worker: string }[];
  failed: { id: string; error: string; worker: string }[];
  heartbeats: string[];
  released: string[];
  claims: { count: number };
  recovers: { count: number };
  logs: Record<string, unknown>[];
  log: ReturnType<typeof createLogger>;
}

function harness(jobs: PrintJobRow[], overrides: Partial<WorkerQueue> = {}): Harness {
  const h: Harness = {
    pending: [...jobs],
    completed: [],
    failed: [],
    heartbeats: [],
    released: [],
    claims: { count: 0 },
    recovers: { count: 0 },
    logs: [],
    queue: undefined as unknown as WorkerQueue,
    log: undefined as unknown as ReturnType<typeof createLogger>,
  };
  h.log = createLogger({ worker: 'test-worker' }, { write: (line) => h.logs.push(JSON.parse(line)) });
  h.queue = {
    claim: async () => {
      h.claims.count++;
      return h.pending.shift() ?? null;
    },
    complete: async (id, result, worker) => void h.completed.push({ id, result, worker }),
    fail: async (id, error, worker) => {
      h.failed.push({ id, error, worker });
      return { retrying: true };
    },
    heartbeat: async (id) => {
      h.heartbeats.push(id);
      return true;
    },
    release: async (id) => {
      h.released.push(id);
      return true;
    },
    recoverStuck: async () => {
      h.recovers.count++;
      return { requeued: 0, failed: 0, jobIds: [] };
    },
    ...overrides,
  };
  return h;
}

async function waitFor(condition: () => boolean, what: string, timeoutMs = 3_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 3));
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts a worker and always stops it, so a failing test cannot leave timers behind. */
async function withWorker(h: Harness, handler: JobHandler, run: (worker: RunningWorker) => Promise<void>, options: Partial<WorkerOptions> = {}): Promise<void> {
  const worker = startWorker({ queue: h.queue, handler, log: h.log, options: { ...OPTIONS, ...options } });
  try {
    await run(worker);
  } finally {
    worker.stop('test over');
    worker.stop('test over');
    await worker.done;
  }
}

const events = (h: Harness, event: string) => h.logs.filter((l) => l.event === event);

test('a finished job is completed under this worker, and the loop keeps polling', async () => {
  const h = harness([fakeJob(1)]);
  await withWorker(h, async () => RESULT, async () => {
    await waitFor(() => h.completed.length === 1, 'the job to complete');
    assert.deepEqual(h.completed[0], { id: 'job-1', result: RESULT, worker: 'test-worker' });
    assert.equal(h.failed.length, 0);
    const claimsAfterJob = h.claims.count;
    await waitFor(() => h.claims.count > claimsAfterJob + 1, 'more polls of the empty queue');
  });
  const started = events(h, 'job.started')[0];
  assert.equal(started.jobId, 'job-1');
  assert.equal(started.attempt, 1);
  assert.equal(events(h, 'job.done')[0].packs, 1);
});

test('a job that throws is failed with its message, and the next one still runs', async () => {
  const h = harness([fakeJob(1), fakeJob(2), fakeJob(3)]);
  await withWorker(
    h,
    async (job) => {
      if (job.id === 'job-1') throw new Error('engine ran out of memory');
      if (job.id === 'job-2') throw 'a string, not an Error';
      return RESULT;
    },
    async () => {
      await waitFor(() => h.completed.length === 1 && h.failed.length === 2, 'three outcomes');
    },
  );
  assert.deepEqual(h.failed.map((f) => [f.id, f.error, f.worker]), [
    ['job-1', 'engine ran out of memory', 'test-worker'],
    ['job-2', 'a string, not an Error', 'test-worker'],
  ]);
  assert.equal(h.completed[0].id, 'job-3');
  const failure = events(h, 'job.failed')[0];
  assert.equal(failure.error, 'engine ran out of memory');
  assert.match(String(failure.stack), /Error: engine ran out of memory/);
  assert.equal(events(h, 'job.will_retry').length, 2);
});

test('a job the queue has given up on is logged as such', async () => {
  const h = harness([fakeJob(1)], { fail: async () => ({ retrying: false }) });
  await withWorker(h, async () => {
    throw new Error('bad art');
  }, async () => {
    await waitFor(() => events(h, 'job.gave_up').length === 1, 'the give-up log');
  });
});

test('a running job heartbeats, and stops when it ends', async () => {
  const h = harness([fakeJob(1)]);
  await withWorker(h, async () => {
    await delay(80);
    return RESULT;
  }, async () => {
    await waitFor(() => h.completed.length === 1, 'the job to complete');
    assert.ok(h.heartbeats.length >= 3, `heartbeats during the job: ${h.heartbeats.length}`);
    assert.ok(h.heartbeats.every((id) => id === 'job-1'));
    const total = h.heartbeats.length;
    await delay(50);
    assert.equal(h.heartbeats.length, total, 'no heartbeats once the job is over');
  });
});

test('a lost lock is reported once, not on every heartbeat', async () => {
  const h = harness([fakeJob(1)], { heartbeat: async () => false });
  await withWorker(h, async () => {
    await delay(80);
    return RESULT;
  }, async () => {
    await waitFor(() => h.completed.length === 1, 'the job to complete');
  });
  assert.equal(events(h, 'job.lock_lost').length, 1);
});

test('stopping an idle worker is immediate and exits with code 0', async () => {
  const h = harness([]);
  const worker = startWorker({ queue: h.queue, handler: async () => RESULT, log: h.log, options: { ...OPTIONS, pollMs: 5_000, maxPollMs: 5_000 } });
  await delay(20);
  const stoppedAt = Date.now();
  worker.stop('SIGTERM');
  const exit = await worker.done;
  assert.ok(Date.now() - stoppedAt < 500, 'the long poll sleep was cut short');
  assert.deepEqual(exit, { code: 0, reason: 'SIGTERM', released: [] });
});

test('stopping waits for the running job, and claims nothing more', async () => {
  const h = harness([fakeJob(1), fakeJob(2)]);
  let finish: () => void = () => undefined;
  const worker = startWorker({
    queue: h.queue,
    log: h.log,
    options: OPTIONS,
    handler: () =>
      new Promise<PrintJobResult>((resolve) => {
        finish = () => resolve(RESULT);
      }),
  });
  await waitFor(() => events(h, 'job.started').length === 1, 'the job to start');
  worker.stop('SIGTERM');
  await delay(30);
  assert.equal(h.completed.length, 0, 'still draining');
  finish();
  const exit = await worker.done;
  assert.deepEqual(exit, { code: 0, reason: 'SIGTERM', released: [] });
  assert.deepEqual(h.completed.map((c) => c.id), ['job-1']);
  assert.deepEqual(h.pending.map((j) => j.id), ['job-2'], 'the second job was never claimed');
  assert.equal(h.released.length, 0);
});

test('when the grace period runs out the unfinished job is handed back, and its late result is dropped', async () => {
  const h = harness([fakeJob(1)]);
  const worker = startWorker({
    queue: h.queue,
    log: h.log,
    options: { ...OPTIONS, shutdownGraceMs: 40 },
    // finishes after the worker has already given the job back
    handler: () => new Promise<PrintJobResult>((resolve) => setTimeout(() => resolve(RESULT), 150)),
  });
  await waitFor(() => events(h, 'job.started').length === 1, 'the job to start');
  worker.stop('SIGTERM');
  const exit = await worker.done;
  assert.deepEqual(exit, { code: 0, reason: 'SIGTERM', released: ['job-1'] });
  assert.deepEqual(h.released, ['job-1']);

  const beatsAtRelease = h.heartbeats.length;
  await waitFor(() => events(h, 'job.abandoned').length === 1, 'the late finish to be noticed');
  assert.equal(h.completed.length + h.failed.length, 0, 'handed back untouched, neither completed nor failed');
  assert.equal(h.heartbeats.length, beatsAtRelease, 'no heartbeats for a job that is no longer ours');
});

test('a second stop does not wait for the grace period', async () => {
  const h = harness([fakeJob(1)]);
  const worker = startWorker({ queue: h.queue, log: h.log, options: { ...OPTIONS, shutdownGraceMs: 60_000 }, handler: () => new Promise<PrintJobResult>(() => undefined) });
  await waitFor(() => events(h, 'job.started').length === 1, 'the job to start');
  worker.stop('SIGTERM');
  worker.stop('SIGTERM');
  const exit = await Promise.race([worker.done, delay(1_000).then(() => 'too slow' as const)]);
  assert.notEqual(exit, 'too slow');
  assert.deepEqual(h.released, ['job-1']);
});

test('a job claimed just as the worker stops is handed back without running', async () => {
  let handed: (job: PrintJobRow | null) => void = () => undefined;
  const h = harness([], {
    claim: () => new Promise<PrintJobRow | null>((resolve) => (handed = resolve)),
  });
  let ran = false;
  const worker = startWorker({ queue: h.queue, log: h.log, options: OPTIONS, handler: async () => ((ran = true), RESULT) });
  await delay(10);
  worker.stop('SIGTERM');
  handed(fakeJob(9));
  const exit = await worker.done;
  assert.equal(ran, false);
  assert.deepEqual(h.released, ['job-9']);
  assert.deepEqual(exit.code, 0);
});

test('a job that runs too long is failed, and the worker exits with code 1 for a clean restart', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const h = harness([fakeJob(1), fakeJob(2)]);
    const worker = startWorker({
      queue: h.queue,
      log: h.log,
      options: { ...OPTIONS, jobTimeoutMs: 40 },
      // hangs past the timeout, then rejects: nobody is listening any more
      handler: () => new Promise<PrintJobResult>((_, reject) => setTimeout(() => reject(new Error('late failure')), 120)),
    });
    const exit = await worker.done;
    assert.equal(exit.code, 1);
    assert.match(exit.reason, /timed out/);
    assert.equal(h.failed.length, 1);
    assert.equal(h.failed[0].id, 'job-1');
    assert.match(h.failed[0].error, /ran for more than/);
    assert.deepEqual(h.pending.map((j) => j.id), ['job-2'], 'no new job after the timeout');
    await delay(200);
    assert.deepEqual(unhandled, [], 'the abandoned handler rejecting later is not an unhandled rejection');
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('a queue that cannot be reached is logged and retried, not fatal', async () => {
  let calls = 0;
  const h = harness([fakeJob(1)], {
    claim: async () => {
      calls++;
      if (calls <= 2) throw new Error('connection refused');
      return calls === 3 ? fakeJob(1) : null;
    },
  });
  await withWorker(h, async () => RESULT, async () => {
    await waitFor(() => h.completed.length === 1, 'the job after the outage');
  });
  const errors = events(h, 'worker.loop_error');
  assert.equal(errors.length, 2);
  assert.equal(errors[0].error, 'connection refused');
});

test('recording a result is retried through a blip, but not when the job is no longer ours', async () => {
  let completeCalls = 0;
  const blip = harness([fakeJob(1)], {
    complete: async () => {
      completeCalls++;
      if (completeCalls === 1) throw new Error('fetch failed');
    },
  });
  await withWorker(blip, async () => RESULT, async () => {
    await waitFor(() => completeCalls === 2, 'the second complete call', 5_000);
  });
  assert.equal(events(blip, 'job.done').length, 1);

  let stateCalls = 0;
  const lost = harness([fakeJob(2)], {
    complete: async () => {
      stateCalls++;
      throw Object.assign(new Error('Print job job-2 is not running'), { name: 'PrintJobStateError' });
    },
  });
  await withWorker(lost, async () => RESULT, async () => {
    await waitFor(() => events(lost, 'job.complete_failed').length === 1, 'the complete failure log');
  });
  assert.equal(stateCalls, 1, 'not retried');
  assert.equal(lost.failed.length, 0, 'a result that could not be recorded is not turned into a failure');
});

test('concurrency runs that many jobs at once, and no more', async () => {
  const h = harness([fakeJob(1), fakeJob(2), fakeJob(3), fakeJob(4)]);
  let active = 0;
  let peak = 0;
  await withWorker(
    h,
    async () => {
      active++;
      peak = Math.max(peak, active);
      await delay(40);
      active--;
      return RESULT;
    },
    async () => {
      await waitFor(() => h.completed.length === 4, 'all four jobs');
    },
    { concurrency: 2 },
  );
  assert.equal(peak, 2);
});

test('lost jobs are looked for at start and then regularly, with the configured age', async () => {
  const ages: number[] = [];
  const h = harness([], {
    recoverStuck: async ({ olderThanSeconds }) => {
      ages.push(olderThanSeconds);
      return { requeued: 1, failed: 0, jobIds: ['job-x'] };
    },
  });
  await withWorker(h, async () => RESULT, async () => {
    await waitFor(() => ages.length >= 3, 'three recovery passes');
  }, { stuckAfterSeconds: 123, recoverEveryMs: 20 });
  assert.ok(ages.every((age) => age === 123));
  assert.equal(events(h, 'jobs.recovered')[0].requeued, 1);
});

test('logs are one JSON object per line with the level, event and fields', () => {
  const lines: string[] = [];
  const log = createLogger({ worker: 'w1' }, { level: 'warn', write: (l) => lines.push(l) });
  log.info('quiet');
  log.child({ jobId: 'j1' }).warn('job.slow', { ms: 5 });
  log.error('boom', errorFields(new Error('bad')));
  assert.equal(lines.length, 2);
  const [warn, error] = lines.map((l) => JSON.parse(l));
  assert.deepEqual({ level: warn.level, event: warn.event, worker: warn.worker, jobId: warn.jobId, ms: warn.ms }, { level: 'warn', event: 'job.slow', worker: 'w1', jobId: 'j1', ms: 5 });
  assert.ok(!Number.isNaN(Date.parse(warn.ts)));
  assert.equal(error.error, 'bad');
  assert.equal(parseLogLevel('DEBUG'), 'debug');
  assert.equal(parseLogLevel('loud'), 'info');
});

test('config: defaults, overrides, and limits that keep a live job from looking lost', () => {
  const defaults = readWorkerConfig({});
  assert.equal(defaults.options.concurrency, 1);
  assert.equal(defaults.options.pollMs, 3_000);
  assert.equal(defaults.options.heartbeatMs, 30_000);
  assert.equal(defaults.options.stuckAfterSeconds, 600);
  assert.equal(defaults.options.shutdownGraceMs, 8_000);
  assert.equal(defaults.options.jobTimeoutMs, 30 * 60_000);
  assert.match(defaults.options.workerId, /-\d+-[0-9a-f]{4}$/);
  assert.equal(defaults.logLevel, 'info');

  const custom = readWorkerConfig({
    PRINT_WORKER_ID: 'eu-1',
    PRINT_WORKER_CONCURRENCY: '3',
    PRINT_WORKER_POLL_MS: '500',
    PRINT_WORKER_MAX_POLL_MS: '100',
    PRINT_WORKER_HEARTBEAT_MS: '60000',
    PRINT_JOB_STUCK_SECONDS: '90',
    LOG_LEVEL: 'debug',
  });
  assert.equal(custom.options.workerId, 'eu-1');
  assert.equal(custom.options.concurrency, 3);
  assert.equal(custom.options.maxPollMs, 500, 'the idle ceiling is never below the base poll');
  assert.equal(custom.options.stuckAfterSeconds, 180, 'at least three heartbeats of margin');
  assert.equal(custom.logLevel, 'debug');

  assert.equal(defaults.options.maxJobs, 25, 'a fresh process every 25 jobs by default');
  assert.equal(readWorkerConfig({ PRINT_WORKER_MAX_JOBS: '0' }).options.maxJobs, 0, '0 turns it off');
  assert.equal(readWorkerConfig({ PRINT_WORKER_CONCURRENCY: '99' }).options.concurrency, 4);
  assert.equal(readWorkerConfig({ PRINT_WORKER_CONCURRENCY: '0' }).options.concurrency, 1);
  assert.equal(readWorkerConfig({ PRINT_WORKER_CONCURRENCY: 'lots' }).options.concurrency, 1);
});

test('env files: .env.local wins over .env, the real environment wins over both, and missing files are fine', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'worker-env-'));
  const names = ['WP5_TEST_A', 'WP5_TEST_B', 'WP5_TEST_C'];
  try {
    await writeFile(path.join(dir, '.env.local'), 'WP5_TEST_A=from-local\nWP5_TEST_B=from-local\n');
    await writeFile(path.join(dir, '.env'), 'WP5_TEST_A=from-env\nWP5_TEST_C=from-env\n');
    process.env.WP5_TEST_B = 'from-process';
    loadEnvFiles(dir);
    assert.equal(process.env.WP5_TEST_A, 'from-local');
    assert.equal(process.env.WP5_TEST_B, 'from-process');
    assert.equal(process.env.WP5_TEST_C, 'from-env');

    const empty = await mkdtemp(path.join(tmpdir(), 'worker-env-empty-'));
    assert.doesNotThrow(() => loadEnvFiles(empty));
    await rm(empty, { recursive: true, force: true });
  } finally {
    for (const name of names) delete process.env[name];
    await rm(dir, { recursive: true, force: true });
  }
});

test('after maxJobs jobs the worker claims nothing more and exits cleanly, so the host starts a fresh process', async () => {
  const h = harness([fakeJob(1), fakeJob(2), fakeJob(3)]);
  const worker = startWorker({ queue: h.queue, handler: async () => RESULT, log: h.log, options: { ...OPTIONS, maxJobs: 2 } });
  const exit = await worker.done;
  assert.equal(exit.code, 0);
  assert.match(exit.reason, /ran 2 jobs; restarting for a fresh process/);
  assert.deepEqual(h.completed.map((c) => c.id), ['job-1', 'job-2']);
  assert.equal(h.pending.length, 1, 'the third job is left for the next process');
});
