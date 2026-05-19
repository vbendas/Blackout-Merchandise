import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import * as schema from './schema';

type DbType = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbType | null = null;
/** Module-scoped database URL — set by TUI to avoid leaking to child processes via process.env */
let _databaseUrl: string | null = null;

/**
 * Set the database URL for the shared db module.
 * Used by the TUI to avoid leaking credentials via process.env to child processes.
 * Must be called before any db query is executed.
 */
export function setDatabaseUrl(url: string): void {
  _databaseUrl = url;
}

function getDbInstance(): DbType {
  if (_db) return _db;

  // Prefer module-scoped URL (set by TUI), fall back to process.env (web apps)
  const databaseUrl = _databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sqlConnection = neon(databaseUrl);
  _db = drizzle(sqlConnection, { schema });
  return _db;
}

// Lazy database client — only connects when first used
// Use db.select(), db.insert(), db.query, etc. as normal
export const db = new Proxy(
  {} as DbType,
  {
    get(_target, prop) {
      const instance = getDbInstance();
      const value = instance[prop as keyof DbType];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
) as DbType;

export { eq, desc, and, or, sql };
