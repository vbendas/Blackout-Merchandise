// Print worker (WP5): claims print_jobs with SKIP LOCKED, runs
// lib/print/pipeline.ts handlePrintJob, records the result, retries failures.
// A Node 20 process, never a request handler: a full-front render at 600 ppi
// with 8 plates needs a few GB and minutes. Run with `npm run worker` (loads
// .env.local), or in the container built from worker/Dockerfile.
//
// Needs DATABASE_URL and the print storage variables (lib/services/print-storage.ts),
// and PACKSHOT_BASE_URL (or NEXT_PUBLIC_APP_URL) where public/ is not on disk.
// Tuning variables are listed in worker/config.ts. SIGTERM and SIGINT stop it
// gracefully; a second signal stops it at once.
import { loadEnvFiles, readWorkerConfig } from './config';
import { createLogger, errorFields } from './log';
import { startWorker } from './loop';

async function main(): Promise<number> {
  // Before anything imports lib/db, which connects from DATABASE_URL on import.
  loadEnvFiles();
  const { options, logLevel } = readWorkerConfig();
  const log = createLogger({ worker: options.workerId }, { level: logLevel });

  if (!process.env.DATABASE_URL) {
    log.error('worker.config', { error: 'DATABASE_URL is not set.' });
    return 1;
  }

  const [jobs, pipeline, storage] = await Promise.all([
    import('@/lib/print/jobs'),
    import('@/lib/print/pipeline'),
    import('@/lib/services/print-storage'),
  ]);

  let driver: string;
  try {
    // Fail at start, not on the first job, when storage is misconfigured.
    driver = storage.printStorageDriverName();
  } catch (err) {
    log.error('worker.config', errorFields(err));
    return 1;
  }
  log.info('worker.config', { storage: driver, node: process.version, pid: process.pid });

  const worker = startWorker({
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
    options,
  });

  process.on('SIGTERM', () => worker.stop('SIGTERM'));
  process.on('SIGINT', () => worker.stop('SIGINT'));
  // With a handler registered Node no longer crashes on these, and the state
  // after one is unknown: hand the jobs back and let the host restart us.
  const crash = (event: string) => (err: unknown) => {
    log.error(event, errorFields(err));
    worker.stop(event, 1);
    worker.stop(event, 1);
  };
  process.on('uncaughtException', crash('uncaughtException'));
  process.on('unhandledRejection', crash('unhandledRejection'));

  const exit = await worker.done;
  return exit.code;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), level: 'error', event: 'worker.fatal', ...errorFields(err) })}\n`);
    process.exit(1);
  });
