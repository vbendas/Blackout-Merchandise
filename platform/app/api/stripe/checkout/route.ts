import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { buildCheckout } from '@/lib/services/checkout';
import type { CheckoutRequest } from '@/lib/agent/protocol';

// Public, unauthenticated — this is the fan storefront's checkout call.
// Rate-limited by IP rather than by user (there is no user). Errors return a
// plain-text body (not JSON) because the cart page reads res.text() directly
// on a non-2xx response — see components/storefront/CartPageClient.tsx.

export const runtime = 'nodejs';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`checkout:${clientIp(req)}`);
  if (!rate.allowed) {
    return new NextResponse('Too many checkout attempts — please try again in a moment.', {
      status: 429,
      headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() },
    });
  }

  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return new NextResponse('Invalid request body.', { status: 400 });
  }

  if (!body.storeSlug || !Array.isArray(body.lines) || body.lines.length === 0 || !body.country) {
    return new NextResponse('storeSlug, at least one cart line, and a destination country are required.', { status: 400 });
  }

  const result = await buildCheckout(body);
  if (!result.ok) return new NextResponse(result.error, { status: 400 });

  return NextResponse.json(result.value);
}
