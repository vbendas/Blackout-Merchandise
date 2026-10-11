import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { appUrl } from '@/lib/emails/layout';
import { completeLink } from '@/lib/services/discord';

// Discord's redirect_uri target: exchanges `code` for a token, reads the
// authorizing user, and stores the link. The signed `state` (not this
// route's own session) is what proves which MerchFrom user this is for —
// requireUser() here is only a defence-in-depth check that a session cookie
// is still present, matching the pattern in app/api/stripe/connect/route.ts.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await requireUser();

  const params = new URL(req.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const oauthError = params.get('error');

  const url = new URL(appUrl('/studio'));
  if (oauthError || !code || !state) {
    url.searchParams.set('discord', 'error');
    return NextResponse.redirect(url);
  }

  const result = await completeLink(state, code);
  url.searchParams.set('discord', result.ok ? 'linked' : 'error');
  return NextResponse.redirect(url);
}
