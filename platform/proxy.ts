import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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
]);

const devBypass = process.env.AUTH_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production';

const withClerk = clerkMiddleware(async (auth, req) => {
  // Future (Platform-Plan §7): map a custom domain's Host header to its
  // artist store slug and rewrite to /[slug] here, before the auth check
  // below, e.g.:
  //   const host = req.headers.get('host');
  //   if (host && !isPlatformHost(host)) {
  //     const slug = await lookupStoreSlugForHost(host); // cached
  //     if (slug) return NextResponse.rewrite(new URL(`/${slug}`, req.url));
  //   }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

// With the local dev bypass there are no Clerk keys, so Clerk is skipped
// entirely and lib/auth.ts supplies the fixed dev user.
export default devBypass ? () => NextResponse.next() : withClerk;

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
