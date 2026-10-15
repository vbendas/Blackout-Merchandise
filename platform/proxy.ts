import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { isPlatformHost, resolveStoreSlugForHost } from '@/lib/services/domains';

// Next.js 16 renamed the middleware file convention to proxy; this file
// replaces the old middleware.ts (see node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/proxy.md).

/** First path segments the platform owns, so they never name a shop: every
 * top-level route under app/ (route groups flattened: (auth) gives sign-in
 * and sign-up, (chat) gives admin and studio) plus the words registration
 * refuses as shop slugs (RESERVED_SLUGS in lib/services/registration.ts,
 * copied rather than imported to keep that module's auth and email imports
 * out of the proxy). scripts/public-routes-smoke.ts fails when the app/ tree
 * or RESERVED_SLUGS drifts from this list. */
export const APP_SEGMENTS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  // the local demo's identity page: a 404 unless AUTH_DEV_BYPASS is on (app/dev)
  'dev',
  'mock-checkout',
  'privacy',
  'register',
  'sign-in',
  'sign-up',
  'staff-invite',
  'studio',
  'terms',
  // reserved by registration only (/chat redirects to /studio in next.config.ts)
  'about',
  'chat',
  'contact',
  'waitlist',
]);

/** The characters the shop tools accept in a slug (lib/tools/store.ts). */
const SHOP_SLUG = /^[a-z0-9-]+$/;

/** App routes that are open without signing in, as path segments: ':name'
 * matches one segment, a trailing '*' matches anything below (or nothing).
 * The fan shop is not listed here — isPublicPath matches it by slug. Every
 * other route under an app segment requires sign-in, /register included. */
const PUBLIC_ROUTES = [
  // Visitors: the door and the legal pages.
  '/sign-in/*',
  '/sign-up/*',
  '/privacy',
  '/terms',
  // Fans: checkout, the test checkout that stands in for Stripe's page in
  // mock mode (it 404s once real keys are set), order status.
  '/mock-checkout/:sessionId',
  '/api/stripe/checkout',
  '/api/orders/:token',
  // The website's Apply form.
  '/api/apply',
  // Employees: the invite link answers a signed-out visitor itself, sending
  // them to sign-in with the invited address filled in and the link to come
  // back to. Accepting needs a session (app/staff-invite/actions.ts).
  '/staff-invite',
  // Machines. Webhooks, crons and the ElevenLabs voice bridge never carry a
  // Clerk session; each of them checks its own signature or bearer secret.
  '/api/health',
  '/api/webhooks/*',
  '/api/stripe/webhook',
  '/api/domains/verify',
  '/api/discord/drain',
  '/api/voice/llm',
].map((route) => route.split('/').filter(Boolean));

function matchesRoute(pattern: string[], segments: string[]): boolean {
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '*') return true;
    if (i >= segments.length) return false;
    if (!pattern[i].startsWith(':') && pattern[i] !== segments[i]) return false;
  }
  return pattern.length === segments.length;
}

/** Whether a path opens without signing in. Pure (no Clerk, no DB) so
 * scripts/public-routes-smoke.ts can test it directly. Public: '/', the
 * routes above, and the fan shop, which is /<slug> and everything under it
 * whenever the first segment is shaped like a shop slug and the app does not
 * own it. A first segment the app owns is public only through PUBLIC_ROUTES. */
export function isPublicPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return true; // '/' sends people on to sign-in or the Studio

  const first = segments[0].toLowerCase();
  if (!APP_SEGMENTS.has(first)) return SHOP_SLUG.test(first);
  return PUBLIC_ROUTES.some((pattern) => matchesRoute(pattern, segments));
}

const devBypass = process.env.AUTH_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production';

const INVITE_COOKIE = 'mf-invite';

/** Platform-Plan §7 registration gating: capture ?invite=<token> off /sign-up
 * or /register into a cookie so it survives Clerk's own redirect between the
 * two (Clerk's post-sign-up hop doesn't carry arbitrary query params along). */
function withInviteCookie(req: NextRequest, res: NextResponse): NextResponse {
  const { pathname, searchParams } = req.nextUrl;
  if (!pathname.startsWith('/sign-up') && pathname !== '/register') return res;

  const invite = searchParams.get('invite');
  if (!invite) return res;

  res.cookies.set(INVITE_COOKIE, invite, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 });
  return res;
}

/** The path a request on an artist's own domain is served from. The shop
 * lives at /<slug>, so '/' and '/cart' become '/<slug>' and '/<slug>/cart';
 * the shop's own links already start with /<slug> and pass as they are,
 * rather than doubling to /<slug>/<slug>/... Pure, so
 * scripts/public-routes-smoke.ts can test it directly. */
export function customDomainPath(slug: string, pathname: string): string {
  const shop = `/${slug}`;
  if (pathname === shop || pathname.startsWith(`${shop}/`)) return pathname;
  return pathname === '/' ? shop : `${shop}${pathname}`;
}

/** Platform-Plan §7: map a custom domain's Host header to its artist store
 * slug and rewrite to /[slug]. Runs before anything else, Clerk included —
 * a fan browsing an artist's own domain must never hit the sign-in gate, so
 * a successful rewrite here returns directly rather than going through
 * isPublicPath below. /api paths are never rewritten, so a shop's checkout
 * and order-status calls on its own domain are gated by isPublicPath like
 * any other request (both are in PUBLIC_ROUTES). resolveStoreSlugForHost is a
 * cached, HTTP-only DB call (Neon's HTTP driver) so it's safe to run here
 * even when this file executes in the edge runtime. */
async function rewriteCustomDomain(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || /\.[^/]+$/.test(pathname)) {
    return null;
  }

  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (!host || isPlatformHost(host)) return null;

  const slug = await resolveStoreSlugForHost(host);
  if (!slug) return null;

  // A clone of the request URL, not one built from the path alone, so the
  // query (?collection=...) reaches the shop page.
  const target = req.nextUrl.clone();
  target.pathname = customDomainPath(slug, pathname);
  return NextResponse.rewrite(target);
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const rewritten = await rewriteCustomDomain(req);
  if (rewritten) return withInviteCookie(req, rewritten);

  if (!isPublicPath(req.nextUrl.pathname)) {
    await auth.protect();
  }
  return withInviteCookie(req, NextResponse.next());
});

// With the local dev bypass there are no Clerk keys, so Clerk is skipped
// entirely and lib/auth.ts supplies the fixed dev user — the custom-domain
// rewrite still runs so it can be exercised locally (see scripts/domains-smoke.ts).
export default devBypass
  ? async (req: NextRequest) => withInviteCookie(req, (await rewriteCustomDomain(req)) ?? NextResponse.next())
  : withClerk;

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
