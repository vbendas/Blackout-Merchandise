import { NextResponse, type NextRequest } from 'next/server';
import { DEV_BYPASS } from '@/lib/auth';
import { DEV_AS_COOKIE, devIdentityByKey, safeNextPath } from '@/lib/dev/identities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTH_SECONDS = 60 * 60 * 24 * 30;

/** /dev/as/<key>?next=/path (local demo mode): sets the mf_dev_as cookie that makes the dev bypass sign in
 * as that identity (lib/dev/identities.ts), then goes to `next`, a path on this site, else back to /dev.
 * /dev/as/default clears the cookie, which is the fixed dev user again. Only with AUTH_DEV_BYPASS on:
 * anywhere else this is a plain 404 and sets nothing. A link that sets a cookie is a GET on purpose (the
 * /dev page is a list of links), so it is a plain <a>, never a <Link>, which would prefetch it. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ who: string }> }): Promise<Response> {
  if (!DEV_BYPASS) return new Response(null, { status: 404 });

  const { who } = await ctx.params;
  const identity = who === 'default' ? null : devIdentityByKey(who);
  if (who !== 'default' && !identity) return new Response(null, { status: 404 });

  const target = new URL(safeNextPath(req.nextUrl.searchParams.get('next')), req.url);
  const res = NextResponse.redirect(target, 303);
  if (identity) {
    res.cookies.set(DEV_AS_COOKIE, identity.key, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: MONTH_SECONDS });
  } else {
    res.cookies.delete(DEV_AS_COOKIE);
  }
  res.headers.set('cache-control', 'no-store');
  return res;
}
