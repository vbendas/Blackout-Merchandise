import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@db/schema';
import { localDemoDir } from './dev/local-demo';

function connect() {
  return drizzle(neon(process.env.DATABASE_URL!), { schema });
}

type NeonDb = ReturnType<typeof connect>;

// Tests run against an in-process Postgres (PGlite) instead of Neon: the
// helper in scripts/test/pglite.ts puts a migrated database on this global
// before any service is imported. It is never set outside tests.
const injected = (globalThis as { __mfTestDb?: unknown }).__mfTestDb as NeonDb | undefined;

// Local demo mode (development only): LOCAL_DB_DIR names the folder of a
// persistent PGlite database (npm run demo:local builds it), and every query
// goes there; Neon is never connected. localDemoDir() is null in production
// and throws when LOCAL_DB_DIR is set there (lib/dev/local-demo.ts). PGlite is
// loaded only by lib/dev/local-db.ts, which only connectLocal requires.
//
// The database opens on the first query, not when this file is imported:
// Next imports every page's modules in worker processes of its own as well (to
// read a dynamic route's config), and PGlite takes one process only, so a
// process that merely loads this file must not open it. Neon's driver does not
// connect until a query either, so the two behave alike.
const demoDir = localDemoDir();

function connectLocal(dir: string): NeonDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { openLocalDb } = require('./dev/local-db') as typeof import('./dev/local-db');
  // The one database client the app has: every service reads it as Neon's, and
  // the two answer the calls the services make the same way (as the tests rely on).
  return openLocalDb(dir, schema) as unknown as NeonDb;
}

function lazyLocal(dir: string): NeonDb {
  let opened: NeonDb | null = null;
  return new Proxy({} as NeonDb, {
    get(_target, prop) {
      opened ??= connectLocal(dir);
      const value = Reflect.get(opened as object, prop);
      return typeof value === 'function' ? value.bind(opened) : value;
    },
  });
}

// Single shared Drizzle client over Neon's HTTP driver (serverless-safe).
// Services are the only modules that should import this.
export const db: NeonDb = injected ?? (demoDir ? lazyLocal(demoDir) : connect());
export type Db = typeof db;
export { schema };
