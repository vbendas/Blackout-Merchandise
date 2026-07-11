import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import * as schema from './schema';
let _db = null;
function getDbInstance() {
    if (_db)
        return _db;
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not defined');
    }
    const sqlConnection = neon(databaseUrl);
    _db = drizzle(sqlConnection, { schema });
    return _db;
}
// Lazy database client — only connects when first used
// Use db.select(), db.insert(), db.query, etc. as normal
export const db = new Proxy({}, {
    get(_target, prop) {
        const instance = getDbInstance();
        const value = instance[prop];
        return typeof value === 'function' ? value.bind(instance) : value;
    },
});
export { eq, desc, and, or, sql };
