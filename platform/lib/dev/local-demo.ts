// Local demo mode (development only): a persistent local database (PGlite,
// Postgres in WebAssembly) stands in for Neon, so the print-prep build can be
// run and looked at while its tables exist nowhere shared.
//
// It is switched on by LOCAL_DB_DIR, the folder of the database. It never
// applies in production, and a LOCAL_DB_DIR found in a production environment
// is an error rather than something to ignore: a setting that quietly swaps the
// database must not be able to travel into a deploy. Every demo path in the app
// (lib/db.ts, instrumentation-node.ts, the art loader in lib/print/pipeline.ts,
// the redirect on /) asks localDemoOn(), so there is one rule.
//
// No imports at all, so the instrumentation (which Next also compiles for the
// edge runtime), the scripts and the tests can all use it.

export const LOCAL_DB_ENV = 'LOCAL_DB_DIR';

type Env = Record<string, string | undefined>;

/** The folder of the local database as it is configured (lib/dev/local-db.ts
 * resolves it against the working directory), or null when the demo is off.
 * Throws when LOCAL_DB_DIR is set in production. */
export function localDemoDir(env: Env = process.env): string | null {
  const dir = env[LOCAL_DB_ENV]?.trim();
  if (!dir) return null;
  if (env.NODE_ENV === 'production') {
    throw new Error(`${LOCAL_DB_ENV} is a development-only setting (a local PGlite database in place of Neon) and must not be set in production. Unset it.`);
  }
  return dir;
}

/** True when the app runs on the local demo database. */
export function localDemoOn(env: Env = process.env): boolean {
  return localDemoDir(env) !== null;
}
