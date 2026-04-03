import { neon } from '@neondatabase/serverless';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sqlConnection = neon(process.env.DATABASE_URL);
export const db = drizzle(sqlConnection);
export { eq, desc, and, or, sql };

/**
 * Wraps a database query with timing and logging
 * @param name - Name of the query for logging
 * @param queryFn - Async function that performs the query
 * @returns Result of the query
 */
export async function timedQuery<T>(name: string, queryFn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    console.log(`[DB] ${name} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[DB] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
