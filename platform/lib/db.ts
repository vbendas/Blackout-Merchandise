import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@db/schema';

// Single shared Drizzle client over Neon's HTTP driver (serverless-safe).
// Services are the only modules that should import this.
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type Db = typeof db;
export { schema };
