import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// We store the db instance but type it as 'any' to avoid drizzle-orm version conflicts
// between the TUI's own drizzle-orm and the shared /src/db's drizzle-orm.
// All actual queries go through @db-root/catalog and @db-root/knowledge functions.
let _db: any = null;

/**
 * Initialize the database connection using the decrypted config URL.
 * Uses setDatabaseUrl() to avoid leaking credentials via process.env to child processes.
 */
export async function initDatabase(databaseUrl: string): Promise<void> {
  if (_db) return;
  // Set the module-scoped URL so the shared db/index.ts lazy proxy uses it
  const { setDatabaseUrl } = await import('@db-root/index');
  setDatabaseUrl(databaseUrl);
  
  // Also create a local connection for testConnection
  const sqlConnection = neon(databaseUrl);
  _db = drizzle(sqlConnection);
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!_db) return false;
    const { sql } = await import('drizzle-orm');
    await _db.execute(sql`SELECT 1 as test`);
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    return false;
  }
}
