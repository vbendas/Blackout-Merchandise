/**
 * Opens the local demo database for a script (local demo mode,
 * lib/dev/local-demo.ts): the persistent PGlite database at LOCAL_DB_DIR, with
 * every migration of platform/drizzle applied. It goes through lib/db.ts, the
 * way the dev server does, so a script and the server open the database the same
 * way and Neon is never connected. Used by `npm run demo:local` and by
 * seed.ts / seed-print.ts when LOCAL_DB_DIR is set.
 *
 * The database takes one process at a time (lib/dev/local-db.ts keeps a lock),
 * so close() before the dev server starts.
 */
import path from 'node:path';
import { localDemoDir } from '../lib/dev/local-demo';
import type { SeedDb } from './seed-print';

export interface DemoDatabase {
  db: SeedDb;
  dir: string;
  /** closes the database cleanly and frees its lock */
  close: () => Promise<void>;
}

export async function openDemoDatabase(): Promise<DemoDatabase> {
  const dir = localDemoDir();
  if (!dir) throw new Error('LOCAL_DB_DIR is not set: this opens the local demo database only, never Neon.');
  const { db } = await import('../lib/db');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const { closeLocalDb } = await import('../lib/dev/local-db');
  await migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: path.resolve(__dirname, '../drizzle') });
  return { db: db as unknown as SeedDb, dir, close: closeLocalDb };
}
