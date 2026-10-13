import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getBulkOrder } from '@/lib/services/bulk';
import { buildBulkCheckout } from '@/lib/services/checkout';

// POST starts payment for one run (a bulk order): the Billing page's Pay
// button. It does what the assistant's pay_bulk_order tool does, through the
// same service (checkout.buildBulkCheckout), and returns the hosted checkout
// URL for the browser to open. Errors are short codes, the page words them.

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });

  // A run of another shop looks the same as a run that does not exist.
  if (!UUID.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const run = await getBulkOrder(store.id, id);
  if (!run) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (run.status !== 'awaiting_payment') return NextResponse.json({ error: 'not_awaiting_payment' }, { status: 409 });

  const checkout = await buildBulkCheckout(store.id, id);
  if (!checkout.ok || !checkout.value.url) return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });

  return NextResponse.json({ url: checkout.value.url });
}
