import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@db/schema';

function connect() {
  return drizzle(neon(process.env.DATABASE_URL!), { schema });
}

// Tests run against an in-process Postgres (PGlite) instead of Neon: the
// helper in scripts/test/pglite.ts puts a migrated database on this global
// before any service is imported. It is never set outside tests.
const injected = (globalThis as { __mfTestDb?: unknown }).__mfTestDb as ReturnType<typeof connect> | undefined;

// Single shared Drizzle client over Neon's HTTP driver (serverless-safe).
// Services are the only modules that should import this.
export const db = injected ?? connect();
export type Db = typeof db;
export { schema };
