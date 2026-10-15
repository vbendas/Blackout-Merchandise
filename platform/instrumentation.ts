import { localDemoDir } from './lib/dev/local-demo';

// Next calls register() once when a server starts, and the server takes no
// request before it returns. It does nothing in a normal run. In local demo
// mode (LOCAL_DB_DIR, development only; lib/dev/local-demo.ts) it starts the
// print worker inside the dev server, because the local database (PGlite) takes
// one process only and so the separate `npm run worker` cannot share it.
export async function register(): Promise<void> {
  // A LOCAL_DB_DIR in a production environment is an error: the server does not start.
  const demo = localDemoDir();

  // Node's runtime only, and never in production: both NEXT_RUNTIME and NODE_ENV are replaced by a
  // constant when the app is built, so the branch, and the worker and pipeline modules behind the
  // import, are cut from a production build altogether (they would be traced into every function).
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV !== 'production' && demo) {
    const { startLocalDemoWorker } = await import('./instrumentation-node');
    await startLocalDemoWorker();
  }
}
