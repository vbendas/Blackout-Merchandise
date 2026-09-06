import { notFound } from 'next/navigation';
import { getStripeGateway, isStripeMockMode } from '@/lib/services/stripe';
import { getOrder } from '@/lib/services/orders';
import { payMockCheckout } from './actions';

// A plain, clearly-labelled stand-in for Stripe's hosted Checkout page while
// STRIPE_MOCK=1 — lists what the session would charge and lets a "fan" pay
// with a fake email/country instead of a card. Never reachable once real
// Stripe keys land (createCheckoutSession then returns a real hosted URL).

function eur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isStripeMockMode()) notFound();

  const { sessionId } = await params;
  const { error } = await searchParams;

  const gateway = getStripeGateway();
  const snapshot = await gateway.retrieveCheckoutSession(sessionId).catch(() => null);
  if (!snapshot) notFound();

  const orderId = snapshot.metadata.orderId;
  const storeId = snapshot.metadata.storeId;
  const order = orderId && storeId ? await getOrder(storeId, orderId) : null;
  if (!order) notFound();

  const pay = payMockCheckout.bind(null, sessionId);
  const borderColor = 'color-mix(in srgb, var(--signal) 22%, transparent)';

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="label mf-dim mb-2">Test checkout — no card</p>
      <h1 className="font-display mb-8 text-2xl">Pay {eur(order.totals.grossCents)}</h1>

      <div className="hairline mb-6" style={{ borderColor }}>
        {order.lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between p-4 text-sm" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <span>
              {line.label}
              {line.colour ? ` — ${line.colour}` : ''}
              {line.size ? ` / ${line.size}` : ''} × {line.qty}
            </span>
            <span>{eur(line.unitCents * line.qty)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-sm" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="mf-dim">Shipping</span>
          <span>{eur(order.totals.shippingCents)}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm font-bold">
          <span>Total</span>
          <span>{eur(order.totals.grossCents)}</span>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-xs" style={{ color: 'var(--accent)' }}>
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={pay} className="flex flex-col gap-4">
        <label className="block">
          <span className="label mf-dim">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={order.fanEmail ?? ''}
            placeholder="you@example.com"
            className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="label mf-dim">Country</span>
          <input name="country" defaultValue="ES" maxLength={2} className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm uppercase outline-none" />
        </label>
        <button
          type="submit"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full py-3 text-sm font-bold"
          style={{ background: 'var(--signal)', color: 'var(--paper)' }}
        >
          Pay (test)
        </button>
      </form>
    </div>
  );
}
