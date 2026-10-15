// Test database: an in-process Postgres (PGlite) with every migration in
// platform/drizzle applied. Call setupTestDb() BEFORE importing any module that
// imports lib/db.ts (use dynamic import() after it), because lib/db.ts reads
// the injected client at import time. Never touches Neon.
//
//   const t = await setupTestDb();
//   const { listPrepressQueue } = await import('@/lib/services/prepress');
//   ...
//   await t.close();
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@db/schema';

export interface TestDb {
  db: PgliteDatabase<typeof schema>;
  client: PGlite;
  close: () => Promise<void>;
}

const MIGRATIONS = path.resolve(__dirname, '../../drizzle');

export async function setupTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  (globalThis as { __mfTestDb?: unknown }).__mfTestDb = db;
  return {
    db,
    client,
    close: async () => {
      delete (globalThis as { __mfTestDb?: unknown }).__mfTestDb;
      await client.close();
    },
  };
}

/** Inserts a user (and, for artists, a store) and returns their ids. */
export async function seedUser(
  db: PgliteDatabase<typeof schema>,
  input: { email: string; role?: 'artist' | 'staff' | 'admin'; withStore?: boolean },
): Promise<{ userId: string; storeId: string | null }> {
  const [user] = await db
    .insert(schema.users)
    .values({ clerkId: `test-${input.email}`, email: input.email, role: input.role ?? 'artist' })
    .returning();
  if (!input.withStore) return { userId: user.id, storeId: null };
  const slug = input.email.split('@')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const [store] = await db.insert(schema.artistStores).values({ artistId: user.id, slug, name: slug }).returning();
  return { userId: user.id, storeId: store.id };
}
