/**
 * Public routes (UX plan WP-K): in production every request passes the Clerk
 * gate in proxy.ts, which AUTH_DEV_BYPASS=1 skips locally, so a fan route
 * left behind sign-in only shows up once deployed. This checks proxy.ts's
 * isPublicPath against a table of paths, then checks the table and
 * APP_SEGMENTS against the app/ tree: every route under app/ needs a row
 * here (a new route must be sorted into public or protected), and every
 * top-level route must be in APP_SEGMENTS (otherwise the proxy would read it
 * as a shop slug and leave it open). APP_SEGMENTS must also hold
 * registration's RESERVED_SLUGS and nothing else, so it never shuts a real
 * shop behind sign-in, and RESERVED_SLUGS must hold every top-level route, so
 * no artist can register a shop address the app already uses. Last, it checks
 * customDomainPath, the path an artist's own domain serves each request from.
 *
 * No server, network or database. proxy.ts imports the domains service, and
 * lib/db.ts calls neon() at import time, so a placeholder DATABASE_URL is set
 * when none is (nothing connects) and every value import is a dynamic
 * import() inside main().
 *
 * Run with: `npx tsx scripts/public-routes-smoke.ts` (from `platform/`).
 */

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

process.env.DATABASE_URL ??= 'postgresql://USER:PASSWORD@HOST/DB';

const PUBLIC_PATHS = [
  // the door
  '/',
  '/sign-in',
  '/sign-in/factor-one',
  '/sign-up',
  '/sign-up/verify-email-address',
  // the fan shop, its checkout and order status
  '/hellslain-merch',
  '/hellslain-merch/',
  '/hellslain-merch/product/abc',
  '/hellslain-merch/cart',
  '/hellslain-merch/order/tok',
  '/hellslain-merch/about',
  '/mock-checkout/cs_mock_123',
  '/api/stripe/checkout',
  '/api/orders/tok',
  // legal pages
  '/privacy',
  '/terms',
  // the website's Apply form
  '/api/apply',
  // machines with their own signature or bearer secret
  '/api/health',
  '/api/stripe/webhook',
  '/api/webhooks/clerk',
  '/api/domains/verify',
  '/api/discord/drain',
  '/api/voice/llm',
];

const PROTECTED_PATHS = [
  // the Studio
  '/studio',
  '/studio/',
  '/studio/s/x',
  '/studio/settings',
  '/studio/billing',
  '/studio/catalogue',
  '/studio/catalogue?category=Jackets',
  '/chat',
  '/register',
  // admin
  '/admin',
  '/admin/production',
  '/admin/supplier',
  // artist APIs
  '/api/agent',
  '/api/agent/history',
  '/api/agent/confirm',
  '/api/agent/suggest',
  '/api/agent/mock',
  '/api/agent/mock/confirm',
  '/api/agent/mock/history',
  '/api/studio/sessions',
  '/api/studio/sessions/x',
  '/api/studio/collections',
  '/api/studio/collections/x',
  '/api/studio/profile',
  '/api/studio/home',
  '/api/catalogue',
  '/api/catalogue/STSU177',
  '/api/studio/runs/x/pay',
  '/api/uploads',
  '/api/stripe/connect',
  '/api/discord/link',
  '/api/discord/callback',
  '/api/voice/session',
  '/api/voice/transcribe',
  '/api/voice/tts',
  // near misses of public routes, and words registration keeps for the app
  '/api',
  '/api/orders',
  '/api/orders/tok/refund',
  '/api/stripe',
  '/api/apply/x',
  '/mock-checkout',
  '/privacy/x',
  '/register/x',
  '/waitlist',
  '/about',
  '/contact',
  // other spellings of app routes
  '/STUDIO',
  '/Admin/production',
  '//studio',
  '/%73tudio',
];

/** On an artist's own domain: [shop slug, requested path, path served]. */
const CUSTOM_DOMAIN_PATHS: [string, string, string][] = [
  // the short paths a fan types
  ['hellslain-merch', '/', '/hellslain-merch'],
  ['hellslain-merch', '/cart', '/hellslain-merch/cart'],
  ['hellslain-merch', '/about', '/hellslain-merch/about'],
  ['hellslain-merch', '/product/abc', '/hellslain-merch/product/abc'],
  ['hellslain-merch', '/order/tok', '/hellslain-merch/order/tok'],
  // the shop's own links already start with the slug: never doubled
  ['hellslain-merch', '/hellslain-merch', '/hellslain-merch'],
  ['hellslain-merch', '/hellslain-merch/', '/hellslain-merch/'],
  ['hellslain-merch', '/hellslain-merch/cart', '/hellslain-merch/cart'],
  ['hellslain-merch', '/hellslain-merch/product/abc', '/hellslain-merch/product/abc'],
  // a first segment that only begins with the slug is a different segment
  ['merch', '/merchandise', '/merch/merchandise'],
  ['hellslain', '/hellslain-merch/cart', '/hellslain/hellslain-merch/cart'],
];

let failures = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  if (!ok) failures += 1;
}

/** URL segments of every page and route handler under app/, with route
 * groups and parallel-route slots dropped and private folders skipped, as
 * Next.js routes them. */
function appRoutes(appDir: string): { file: string; segments: string[] }[] {
  const routes: { file: string; segments: string[] }[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('_')) continue;
        const isTransparent = /^\(.*\)$/.test(entry.name) || entry.name.startsWith('@');
        walk(path.join(dir, entry.name), isTransparent ? segments : [...segments, entry.name]);
      } else if (/^(page|route)\.(tsx?|jsx?|mdx)$/.test(entry.name)) {
        routes.push({ file: path.relative(appDir, path.join(dir, entry.name)), segments });
      }
    }
  };
  walk(appDir, []);
  return routes;
}

function routeMatches(route: string[], segments: string[]): boolean {
  if (route.length === 0) return segments.length === 0;
  const [head, ...rest] = route;
  if (head.startsWith('[[...')) return true;
  if (head.startsWith('[...')) return segments.length > 0;
  if (segments.length === 0) return false;
  return (head.startsWith('[') || head === segments[0]) && routeMatches(rest, segments.slice(1));
}

/** Static beats dynamic beats catch-all, segment by segment, as in Next.js. */
function specificity(route: string[]): number[] {
  return route.map((s) => (s.startsWith('[[...') ? 0 : s.startsWith('[...') ? 1 : s.startsWith('[') ? 2 : 3));
}

function beats(a: string[], b: string[]): boolean {
  const [x, y] = [specificity(a), specificity(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) > (y[i] ?? -1);
  }
  return false;
}

async function main() {
  const { APP_SEGMENTS, customDomainPath, isPublicPath } = await import('../proxy');
  const { RESERVED_SLUGS } = await import('../lib/services/registration');

  console.log('=== public without signing in ===');
  for (const p of PUBLIC_PATHS) check(p, isPublicPath(p));

  console.log('\n=== needs sign-in ===');
  for (const p of PROTECTED_PATHS) check(p, !isPublicPath(p));

  const appDir = path.resolve('app');
  if (!existsSync(appDir)) throw new Error('No app/ folder here: run this from platform/.');
  const routes = appRoutes(appDir);

  console.log(`\n=== every route under app/ has a row above (${routes.length} routes) ===`);
  const table = [...PUBLIC_PATHS, ...PROTECTED_PATHS].map((p) => p.split('/').filter(Boolean));
  const covered = new Set<string>();
  for (const segments of table) {
    const best = routes
      .filter((r) => routeMatches(r.segments, segments))
      .reduce<(typeof routes)[number] | null>((winner, r) => (!winner || beats(r.segments, winner.segments) ? r : winner), null);
    if (best) covered.add(best.file);
  }
  for (const route of routes) check(`app/${route.file}`, covered.has(route.file));

  console.log('\n=== APP_SEGMENTS in proxy.ts ===');
  const topLevel = new Set(routes.map((r) => r.segments[0]).filter((s): s is string => !!s));
  for (const segment of topLevel) {
    if (segment.startsWith('[')) {
      check(`top-level dynamic route /${segment} is the shop`, segment === '[slug]');
    } else {
      check(`top-level route /${segment} is in APP_SEGMENTS`, APP_SEGMENTS.has(segment));
    }
  }
  for (const word of RESERVED_SLUGS) check(`reserved slug "${word}" is in APP_SEGMENTS`, APP_SEGMENTS.has(word));
  for (const word of APP_SEGMENTS) {
    check(`"${word}" in APP_SEGMENTS is an app route or a reserved slug`, topLevel.has(word) || RESERVED_SLUGS.has(word));
  }

  console.log('\n=== RESERVED_SLUGS in lib/services/registration.ts ===');
  for (const segment of topLevel) {
    if (!segment.startsWith('[')) check(`top-level route /${segment} can't be taken as a shop address`, RESERVED_SLUGS.has(segment));
  }

  console.log('\n=== custom domains: the path each request is served from ===');
  for (const [slug, requested, expected] of CUSTOM_DOMAIN_PATHS) {
    const served = customDomainPath(slug, requested);
    check(`${slug}: ${requested} -> ${expected}`, served === expected, served === expected ? undefined : { served });
  }

  console.log(`\n${failures === 0 ? 'Smoke test passed.' : `Smoke test FAILED (${failures} check(s)).`}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
