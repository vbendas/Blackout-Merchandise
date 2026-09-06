'use server';

import { redirect } from 'next/navigation';
import { getStripeGateway } from '@/lib/services/stripe';
import { markPaid } from '@/lib/services/orders';

// The mock checkout's "Pay (test)" button calls this directly instead of
// going through a webhook — see stripe.ts / orders.ts for why markPaid is
// idempotent regardless of which path calls it.
export async function payMockCheckout(sessionId: string, formData: FormData): Promise<void> {
  const gateway = getStripeGateway();
  const snapshot = await gateway.retrieveCheckoutSession(sessionId);

  const email = (formData.get('email') as string | null)?.trim();
  const country = (formData.get('country') as string | null)?.trim().toUpperCase();

  const merged = {
    ...snapshot,
    customerEmail: email || snapshot.customerEmail,
    shippingDetails: country ? { name: null, address: { country } } : snapshot.shippingDetails,
  };

  const result = await markPaid(sessionId, merged);

  redirect(result.ok ? (snapshot.successUrl ?? '/') : `/mock-checkout/${sessionId}?error=${encodeURIComponent(result.error)}`);
}
