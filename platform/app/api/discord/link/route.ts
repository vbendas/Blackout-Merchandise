import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { appUrl } from '@/lib/emails/layout';
import { buildAuthorizeUrl, completeLink, encodeState, isDiscordMockMode } from '@/lib/services/discord';

// GET starts the OAuth2 authorization-code flow (scope 'identify') so the
// artist links the Discord account the bot will DM. There is no real
// Discord app to authorize against in mock mode (DISCORD_CLIENT_ID etc are
// empty), so this links a fake 'dev#0001' account immediately instead of
// redirecting, and sends the artist straight back to chat.
export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireUser();

  if (isDiscordMockMode()) {
    const result = await completeLink(encodeState(user.id), 'mock-code');
    const url = new URL(appUrl('/studio'));
    url.searchParams.set('discord', result.ok ? 'linked' : 'error');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(buildAuthorizeUrl(user.id));
}
