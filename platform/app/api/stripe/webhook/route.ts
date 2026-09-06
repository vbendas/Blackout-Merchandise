import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripeGateway, toCheckoutSessionSnapshot, syncStripeAccountStatusByAccountId } from '@/lib/services/stripe';
import { claimWebhookEvent, handleChargeRefunded, markPaid } from '@/lib/services/orders';
import { notify } from '@/lib/services/notifications';

// Stripe webhook receiver. Handles checkout.session.completed (mark the
// order paid), account.updated (sync stripe_accounts, notify the artist once
// both flags flip true) and charge.refunded (reconcile the payout ledger).
// Every event is recorded in processed_webhook_events before dispatch, so a
// Stripe retry (or any other event type) is a fast, safe no-op.

export const runtime = 'nodejs';

function objectIdFor(event: Stripe.Event): string | undefined {
  const obj = event.data.object as { id?: string };
  return obj?.id;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = getStripeGateway().constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const firstTime = await claimWebhookEvent(event.id, objectIdFor(event));
  if (!firstTime) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaid(session.id, toCheckoutSessionSnapshot(session));
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const synced = await syncStripeAccountStatusByAccountId(account.id);
        if (synced?.status.chargesEnabled && synced.status.payoutsEnabled) {
          try {
            await notify({
              userId: synced.artistId,
              event: 'stripe.ready',
              text: 'Stripe payouts are ready — you can publish your shop.',
              prompt: 'Publish my store',
            });
          } catch (notifyErr) {
            console.error('[stripe webhook] notify(stripe.ready) failed:', notifyErr instanceof Error ? notifyErr.message : notifyErr);
          }
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent?.id ?? null);
        await handleChargeRefunded(paymentIntentId, charge.amount_refunded);
        break;
      }
      default:
        break; // recorded as processed; nothing else to do
    }
  } catch (err) {
    // Still respond 200 — Stripe retries non-2xx responses, and the event id
    // is already claimed above, so a genuine failure here needs a manual
    // replay rather than an infinite retry loop against a dedup guard.
    console.error(`[stripe webhook] handler failed for ${event.type}:`, err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ received: true });
}
