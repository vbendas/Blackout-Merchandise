// The print worker inside the dev server, for local demo mode (see
// instrumentation.ts and lib/dev/local-demo.ts). The same loop, queue calls and
// job handler as worker/print-worker.ts, so "Run again", a corrected PSD and
// "Prepare print files" really run, here, against the local demo database.
//
// While a job runs its CPU-bound stages hold this process's event loop, so the
// pages answer slowly until it finishes: a full front takes a minute or two.
// That is the price of one process. Nothing here applies outside local demo
// mode, and localDemoOn() throws if LOCAL_DB_DIR reaches a production server.
import { localDemoOn } from '@/lib/dev/local-demo';

const SLOT = '__mfLocalDemoWorker';

export async function startLocalDemoWorker(): Promise<void> {
  if (!localDemoOn()) return;
  const g = globalThis as unknown as Record<string, unknown>;
  // register() can run again when the dev server reloads its modules: one worker per process.
  if (g[SLOT]) return;

  // Loaded here, after the check, so a normal server never loads the pipeline at start.
  const [jobs, pipeline, storage, { createLogger }, { startWorker }, { readWorkerConfig }] = await Promise.all([
    import('@/lib/print/jobs'),
    import('@/lib/print/pipeline'),
    import('@/lib/services/print-storage'),
    import('./worker/log'),
    import('./worker/loop'),
    import('./worker/config'),
  ]);

  // The demo's print files live on disk; R2 is never used (lib/dev/local-db.ts sets the driver).
  const driver = storage.printStorageDriverName();
  if (driver !== 'local') throw new Error(`Local demo mode keeps print files on disk, but print storage is "${driver}".`);

  const { options, logLevel } = readWorkerConfig();
  const workerId = `local-demo-${process.pid}`;
  const log = createLogger({ worker: workerId }, { level: logLevel });
  log.info('worker.config', { storage: driver, mode: 'in-process, local demo', node: process.version, pid: process.pid });

  g[SLOT] = startWorker({
    queue: {
      claim: jobs.claimNextPrintJob,
      complete: jobs.completePrintJob,
      fail: jobs.failPrintJob,
      heartbeat: jobs.heartbeatPrintJob,
      release: jobs.releasePrintJob,
      recoverStuck: jobs.recoverStuckPrintJobs,
    },
    handler: pipeline.handlePrintJob,
    log,
    // A server can't restart itself for a fresh process the way a container host restarts the worker, so no job limit.
    options: { ...options, workerId, concurrency: 1, maxJobs: 0 },
  });
}
