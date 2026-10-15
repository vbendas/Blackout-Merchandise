/**
 * Print prep seed: the shop's ink system profile (WP6).
 *
 * Inserts DEFAULT_INK_SYSTEM from `lib/print/defaults.ts` (the MagnaPrint HB
 * data sheet, Print-Prep-Plan section 5) as the active `ink_systems` row, but
 * only when no active row exists. When one exists the run writes nothing, so
 * an admin's edits are never overwritten and re-running is safe.
 *
 * Run with: `npm run seed:print` (from `platform/`). Writes to whatever
 * DATABASE_URL points at, so check it first. With LOCAL_DB_DIR set (local demo
 * mode, lib/dev/local-demo.ts) it writes to that local PGlite database instead
 * and never connects to Neon. The connection is made in main(), so a test can
 * import `seedInkSystem` and run it on PGlite.
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '../../src/db/schema';

import { DEFAULT_INK_SYSTEM } from '../lib/print/defaults';
import { localDemoDir } from '../lib/dev/local-demo';

export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface InkSystemSeedResult {
  id: string;
  /** 'kept' means an active row already existed, so nothing was written */
  action: 'inserted' | 'kept';
}

export async function seedInkSystem(db: SeedDb): Promise<InkSystemSeedResult> {
  const [active] = await db
    .select({ id: schema.inkSystems.id })
    .from(schema.inkSystems)
    .where(eq(schema.inkSystems.isActive, true))
    .limit(1);
  if (active) return { id: active.id, action: 'kept' };

  const profile = DEFAULT_INK_SYSTEM;
  const [row] = await db
    .insert(schema.inkSystems)
    .values({ name: profile.name, profile, isActive: true })
    .returning({ id: schema.inkSystems.id });
  return { id: row.id, action: 'inserted' };
}

async function main(): Promise<void> {
  let db: SeedDb;
  let close: (() => Promise<void>) | null = null;
  if (localDemoDir()) {
    // Local demo mode: the local PGlite database, with its migrations applied. Neon is never opened.
    const { openDemoDatabase } = await import('./local-demo-db');
    const demo = await openDemoDatabase();
    db = demo.db;
    close = demo.close;
    console.log('[seed:print] using the local demo database (LOCAL_DB_DIR), not Neon');
  } else {
    config({ path: '.env.local', quiet: true });
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined (expected in platform/.env.local)');
    }
    db = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  try {
    const result = await seedInkSystem(db);
    if (result.action === 'inserted') {
      console.log(`[seed:print] inserted the default ink system (${result.id})`);
    } else {
      console.log(`[seed:print] kept the active ink system (${result.id}); nothing changed`);
    }
  } finally {
    await close?.();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('[seed:print] failed:', error);
    process.exitCode = 1;
  });
}
