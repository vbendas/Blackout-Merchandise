import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isPlatformHost, resolveStoreSlugForHost } from '@/lib/services/domains';

// Next.js 16 renamed the middleware file convention to proxy; this file
// replaces the old middleware.ts (see node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/proxy.md).
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/stripe/webhook',
  '/api/health',
  '/api/domains/verify',
]);

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

/** Platform-Plan §7: map a custom domain's Host header to its artist store
 * slug and rewrite to /[slug]. Runs before anything else, Clerk included —
 * a fan browsing an artist's own domain must never hit the sign-in gate, so
 * a successful rewrite here returns directly rather than going through the
 * public-route matcher below (which stays scoped to the platform's own
 * routes; widening it to "any single path segment" would have accidentally
 * made /register and friends public too). resolveStoreSlugForHost is a
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

  const target = pathname === '/' ? `/${slug}` : `/${slug}${pathname}`;
  return NextResponse.rewrite(new URL(target, req.url));
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const rewritten = await rewriteCustomDomain(req);
  if (rewritten) return withInviteCookie(req, rewritten);

  if (!isPublicRoute(req)) {
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
