import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { appBaseUrl, completeMockOnboarding, getStripeAccountStatus, isStripeMockMode, startOnboarding, syncStripeAccountStatus } from '@/lib/services/stripe';

// POST creates the shop's Express account (if missing) and returns an
// onboarding Account Link. GET is that link's return_url / refresh_url
// landing: in mock mode it completes onboarding immediately (there is no
// hosted UI to visit), then either way re-syncs stripe_accounts from Stripe
// and sends the artist back to chat with a notice.

export const runtime = 'nodejs';

function connectBaseUrl(): string {
  return `${appBaseUrl()}/api/stripe/connect`;
}

export async function POST() {
  const { store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });

  const base = connectBaseUrl();
  const result = await startOnboarding(store.id, { returnUrl: `${base}?return=1`, refreshUrl: `${base}?refresh=1` });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ url: result.url });
}

export async function GET(req: NextRequest) {
  const { store } = await requireUser();
  const chatUrl = new URL('/studio', appBaseUrl());
  if (!store) return NextResponse.redirect(chatUrl);

  const params = new URL(req.url).searchParams;
  const isReturnOrRefresh = params.has('return') || params.has('refresh');

  if (isReturnOrRefresh && isStripeMockMode()) {
    const current = await getStripeAccountStatus(store.id);
    if (current.accountId) completeMockOnboarding(current.accountId);
  }

  const synced = await syncStripeAccountStatus(store.id);
  chatUrl.searchParams.set('notice', synced?.chargesEnabled && synced?.payoutsEnabled ? 'stripe_ready' : 'stripe_action_required');
  return NextResponse.redirect(chatUrl);
}
