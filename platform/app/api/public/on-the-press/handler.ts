// GET /api/public/on-the-press: the rows of the website's "On the press" board (mainpage/index.html, the press view).
//
// Public: no sign-in (PUBLIC_ROUTES in proxy.ts) and no personal data. onThePressFeed in
// lib/services/production-progress.ts names a client only when their shop opted in (else "Private") and never gives an
// email, an order or an address. Each row carries its job's number as `run` (1001 and up, one per production job: the
// number the stations show as "No. 1001"), which says nothing of the job but its place in the line. It takes no
// parameters, so there is nothing to look up or step through.
//
// Any website may read it: every answer carries Access-Control-Allow-Origin: *. The rows are public by design and are
// sent without credentials (nothing here reads a session or a cookie), and an answer that is the same for every caller is
// one a CDN can keep safely. A list of allowed origins would make the answer differ by the Origin header, and a cache that
// does not key on Vary: Origin would then hand one site's answer to another and break the board until it expired. The
// static website therefore needs only this route's address, on whatever domain the platform runs.
//
// Cached for about 15 seconds, by a CDN (s-maxage) and in this process (memoFeed), so a crowd on the board is one read
// of the database every 15 seconds. Kept apart from route.ts so the tests run it without Next or a database.
import type { OnThePressRow } from '@/lib/services/production-progress';

export const BOARD_MAX_AGE_SECONDS = 15;

export interface BoardDeps {
  feed: () => Promise<OnThePressRow[]>;
}

/** The board's answer. */
export interface BoardBody {
  rows: OnThePressRow[];
  generatedAt: string;
}

/** The same for every caller: the rows are public and no credentials are sent or accepted. */
export function corsHeaders(): Headers {
  return new Headers({ 'Access-Control-Allow-Origin': '*' });
}

export async function handleBoard(_req: Request, deps: BoardDeps): Promise<Response> {
  const headers = corsHeaders();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  try {
    const body: BoardBody = { rows: await deps.feed(), generatedAt: new Date().toISOString() };
    headers.set('Cache-Control', `public, max-age=${BOARD_MAX_AGE_SECONDS}, s-maxage=${BOARD_MAX_AGE_SECONDS}, stale-while-revalidate=${BOARD_MAX_AGE_SECONDS}`);
    return new Response(JSON.stringify(body), { status: 200, headers });
  } catch (err) {
    // Logged for the people who run the server; the board only hears that it should try again.
    console.error('[on the press] the board could not be read:', err instanceof Error ? err.message : err);
    headers.set('Cache-Control', 'no-store');
    return new Response(JSON.stringify({ error: 'The board is not available just now. Try again in a moment.' }), { status: 503, headers });
  }
}

/** A preflight (a browser only sends one for a request that is not a simple GET) is answered for GET, from anywhere. */
export function handleBoardPreflight(): Response {
  const headers = corsHeaders();
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Max-Age', '600');
  return new Response(null, { status: 204, headers });
}

/** The feed, read at most once every `ttlMs` in this process; a read that failed is not kept. */
export function memoFeed(feed: () => Promise<OnThePressRow[]>, ttlMs: number, clock: () => number = Date.now): () => Promise<OnThePressRow[]> {
  let kept: { at: number; rows: Promise<OnThePressRow[]> } | null = null;
  return () => {
    const now = clock();
    if (!kept || now - kept.at >= ttlMs) {
      const rows = feed();
      const entry = { at: now, rows };
      kept = entry;
      rows.catch(() => {
        if (kept === entry) kept = null;
      });
    }
    return kept.rows;
  };
}
