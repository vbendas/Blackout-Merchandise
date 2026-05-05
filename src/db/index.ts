import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const sqlConnection = neon(process.env.DATABASE_URL);
export const db = drizzle(sqlConnection, { schema });
export { eq, desc, and, or, sql };
