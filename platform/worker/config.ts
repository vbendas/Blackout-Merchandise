// Environment for the print worker: loading .env files and turning variables
// into WorkerOptions. Separate from the entry point so the parsing is testable.
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { parseLogLevel, type LogLevel } from './log';
import type { WorkerOptions } from './loop';

/** `npm run worker` runs from platform/: .env.local first (it wins, as in
 * Next), then .env. Variables already in the environment always win, so a
 * container host's settings are never overridden by a stray file. */
export function loadEnvFiles(dir: string = process.cwd()): void {
  for (const file of ['.env.local', '.env']) loadDotenv({ path: path.join(dir, file), quiet: true });
}

type Env = Record<string, string | undefined>;

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

export interface WorkerConfig {
  options: WorkerOptions;
  logLevel: LogLevel;
}

/**
 *   PRINT_WORKER_ID                  default <host>-<pid>-<4 hex>
 *   PRINT_WORKER_CONCURRENCY         jobs at once, 1..4, default 1 (one render can take a few GB)
 *   PRINT_WORKER_POLL_MS             wait between empty polls, default 3000; backs off to PRINT_WORKER_MAX_POLL_MS (15000)
 *   PRINT_WORKER_HEARTBEAT_MS        default 30000
 *   PRINT_WORKER_RECOVER_MS          how often to look for lost jobs, default 60000
 *   PRINT_JOB_STUCK_SECONDS          no heartbeat for this long means the worker died, default 600
 *   PRINT_JOB_TIMEOUT_MS             one job may run this long, default 1800000 (30 min)
 *   PRINT_WORKER_SHUTDOWN_GRACE_MS   how long SIGTERM waits for running jobs, default 8000
 *   PRINT_WORKER_MAX_JOBS            jobs per process before it exits (code 0) for a fresh one, default 25; 0 for no limit
 *                                    (the PSD decoder's memory only grows; the host must restart the container)
 *   LOG_LEVEL                        debug, info (default), warn, error
 */
export function readWorkerConfig(env: Env = process.env): WorkerConfig {
  const heartbeatMs = int(env, 'PRINT_WORKER_HEARTBEAT_MS', 30_000, 10, 600_000);
  const pollMs = int(env, 'PRINT_WORKER_POLL_MS', 3_000, 10, 600_000);
  const requestedStuck = int(env, 'PRINT_JOB_STUCK_SECONDS', 600, 30, 86_400);
  const workerId = env.PRINT_WORKER_ID?.trim() || `${hostname()}-${process.pid}-${randomBytes(2).toString('hex')}`;
  return {
    logLevel: parseLogLevel(env.LOG_LEVEL),
    options: {
      workerId,
      concurrency: int(env, 'PRINT_WORKER_CONCURRENCY', 1, 1, 4),
      pollMs,
      maxPollMs: Math.max(int(env, 'PRINT_WORKER_MAX_POLL_MS', 15_000, 10, 600_000), pollMs),
      heartbeatMs,
      recoverEveryMs: int(env, 'PRINT_WORKER_RECOVER_MS', 60_000, 10, 3_600_000),
      // a live job must never look lost: at least three heartbeats of margin
      stuckAfterSeconds: Math.max(requestedStuck, Math.ceil((heartbeatMs * 3) / 1000)),
      shutdownGraceMs: int(env, 'PRINT_WORKER_SHUTDOWN_GRACE_MS', 8_000, 0, 600_000),
      jobTimeoutMs: int(env, 'PRINT_JOB_TIMEOUT_MS', 30 * 60_000, 1_000, 6 * 3_600_000),
      maxJobs: int(env, 'PRINT_WORKER_MAX_JOBS', 25, 0, 100_000),
    },
  };
}
