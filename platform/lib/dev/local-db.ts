// The persistent PGlite database of local demo mode (see local-demo.ts). Only
// lib/db.ts loads this file, and only when LOCAL_DB_DIR is set outside
// production: it is required from inside that branch, so production never
// loads PGlite (next.config.ts also keeps it out of the bundle and the traces).
//
// PGlite is Postgres in WebAssembly and takes one process at a time. Inside a
// process the database is a singleton on globalThis, so a hot reload (which
// evaluates lib/db.ts again) and the print worker started by
// instrumentation-node.ts all share it. Across processes a lock file beside the
// folder refuses a second opener with a plain message instead of letting two of
// them write the same files.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

// Node's own require, resolved from the project folder, for the two packages that make the database. A
// bundler never sees them: PGlite ships WebAssembly and top-level awaits, which bundled (or loaded as an
// ES module external) would turn every module that imports lib/db.ts into an async one. The CommonJS builds
// load at once, here, and only here. Fetched through process.getBuiltinModule, because webpack reads an
// imported createRequire as its own and refuses an argument it can't resolve at build time.
function projectRequire(): NodeRequire {
  const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
  if (typeof getBuiltin !== 'function') throw new Error('Local demo mode needs Node 20.16 or newer.');
  const { createRequire } = getBuiltin.call(process, 'node:module') as { createRequire(from: string): NodeRequire };
  return createRequire(path.join(process.cwd(), 'noop.js'));
}
const loadPglite = () => projectRequire()('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const loadDrizzle = () => projectRequire()('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');

interface Opened {
  dir: string;
  lock: string;
  client: PGlite;
  db: PgliteDatabase<Record<string, unknown>>;
}

const SLOT = '__mfLocalDemoDb';

function slot(): Opened | undefined {
  return (globalThis as unknown as Record<string, Opened | undefined>)[SLOT];
}

/** The lock file of a database folder. A sibling, not a file inside: Postgres
 * wants its own folder to itself. */
export function lockFileFor(dir: string): string {
  return `${dir}.lock`;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: the process exists but is not ours to signal
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Throws when another live process holds the lock; a lock whose process is gone (a killed server) is stale. */
export function assertNotLockedByAnother(file: string): void {
  let held: { pid?: number; command?: string } | null = null;
  try {
    held = JSON.parse(readFileSync(file, 'utf8')) as { pid?: number; command?: string };
  } catch {
    // no lock yet, or one that is unreadable: nobody holds it
  }
  if (held && typeof held.pid === 'number' && held.pid !== process.pid && alive(held.pid)) {
    throw new Error(
      `The local demo database is open in another process (pid ${held.pid}${held.command ? `, ${held.command}` : ''}). ` +
        'PGlite allows one process at a time: stop that one first (the dev server and npm run demo:local cannot run together).',
    );
  }
}

/** Takes the lock, or throws when another live process holds it. A stale one is taken over. */
export function takeLock(file: string): void {
  assertNotLockedByAnother(file);
  mkdirSync(path.dirname(file), { recursive: true });
  const command = process.argv.slice(0, 3).map((part) => path.basename(part)).join(' ');
  writeFileSync(file, JSON.stringify({ pid: process.pid, command, since: new Date().toISOString() }));
}

function releaseLock(file: string): void {
  try {
    const held = JSON.parse(readFileSync(file, 'utf8')) as { pid?: number };
    if (held.pid === process.pid) rmSync(file, { force: true });
  } catch {
    // already gone
  }
}

/** Opens the database in `dir` (created on first use), or returns the one this
 * process already opened. The session runs in UTC like Neon does: PGlite
 * otherwise stamps `now()` defaults in an offset of its own, and drizzle reads
 * every timestamp back as UTC, so a row written by the database would come out
 * an hour or two ahead of one written by the code. */
export function openLocalDb<S extends Record<string, unknown>>(configured: string, schema: S): PgliteDatabase<S> {
  const dir = path.resolve(configured);
  const open = slot();
  if (open) {
    if (open.dir !== dir) throw new Error(`The local demo database is already open at ${open.dir}, not ${dir}.`);
    return open.db as unknown as PgliteDatabase<S>;
  }

  const lock = lockFileFor(dir);
  takeLock(lock);
  mkdirSync(dir, { recursive: true });
  const client = new (loadPglite().PGlite)(dir);
  // First in the queue: every query waits for it (PGlite runs them in order).
  client.exec("SET TIME ZONE 'UTC'").catch((err: unknown) => console.error('[local demo] could not set the session time zone:', err));
  const db = loadDrizzle().drizzle(client, { schema });
  (globalThis as unknown as Record<string, Opened>)[SLOT] = { dir, lock, client, db: db as unknown as Opened['db'] };
  process.once('exit', () => releaseLock(lock));

  pinLocalEnvironment(dir);
  return db;
}

/** What local demo mode turns off or points at disk, for everything in this process. */
function pinLocalEnvironment(dir: string): void {
  // Whatever DATABASE_URL held (a real Neon address, from .env.local) must not
  // be usable by anything that reads it in this process: demo mode talks to the
  // local database only. The reserved .invalid top-level domain never resolves.
  process.env.DATABASE_URL = 'postgresql://USER:PASSWORD@HOST/DB';
  // Print files stay on disk, never in R2.
  process.env.PRINT_STORAGE_DRIVER = 'local';
  delete process.env.PRINT_STORAGE;
  process.env.PRINT_STORAGE_DIR ||= path.join(path.dirname(dir), 'print-storage');
  // The real print services, not the sample views, and packshots from public/, not from a CDN.
  delete process.env.PRINT_MOCK;
  delete process.env.PACKSHOT_BASE_URL;
  console.log(`[local demo] database ${dir}, print files ${path.resolve(process.env.PRINT_STORAGE_DIR)}; Neon and R2 are not used.`);
}

/** Closes the database cleanly (a checkpoint for the next start) and frees the
 * lock. For scripts that build the demo; a server just exits. */
export async function closeLocalDb(): Promise<void> {
  const open = slot();
  if (!open) return;
  delete (globalThis as unknown as Record<string, Opened | undefined>)[SLOT];
  try {
    await open.client.close();
  } finally {
    releaseLock(open.lock);
  }
}
