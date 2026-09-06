import { notFound } from 'next/navigation';
import { getStripeGateway, isStripeMockMode } from '@/lib/services/stripe';
import { getOrder } from '@/lib/services/orders';
import { getBulkOrder } from '@/lib/services/bulk';
import { payMockCheckout } from './actions';

// A plain, clearly-labelled stand-in for Stripe's hosted Checkout page while
// STRIPE_MOCK=1 — lists what the session would charge and lets a "fan" pay
// with a fake email/country instead of a card. Never reachable once real
// Stripe keys land (createCheckoutSession then returns a real hosted URL).
//
// Two session shapes land here: a POD session (metadata.orderId, a real
// 'pending' order already exists) and a bulk session (metadata.bulkOrderId
// — buildBulkCheckout, no order row until markBulkPaid). The bulk artist
// already gave a ship-to address in chat, so that branch skips the
// email/country inputs entirely.

function eur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

interface CheckoutLineView {
  label: string;
  amountCents: number;
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

  const storeId = snapshot.metadata.storeId;
  const bulkOrderId = snapshot.metadata.bulkOrderId;
  const orderId = snapshot.metadata.orderId;

  const isBulk = !!bulkOrderId;
  let lines: CheckoutLineView[];
  let shippingCents: number;
  let totalCents: number;
  let defaultEmail = '';

  if (isBulk && storeId) {
    const bulk = await getBulkOrder(storeId, bulkOrderId);
    if (!bulk) notFound();
    lines = bulk.lines.map((l) => ({ label: l.label, amountCents: l.totalCents }));
    if (bulk.setupCents > 0) lines.push({ label: 'Setup', amountCents: bulk.setupCents });
    shippingCents = bulk.shippingCents;
    totalCents = bulk.totalCents;
  } else if (orderId && storeId) {
    const order = await getOrder(storeId, orderId);
    if (!order) notFound();
    lines = order.lines.map((l) => ({
      label: `${l.label}${l.colour ? ` — ${l.colour}` : ''}${l.size ? ` / ${l.size}` : ''} × ${l.qty}`,
      amountCents: l.unitCents * l.qty,
    }));
    shippingCents = order.totals.shippingCents;
    totalCents = order.totals.grossCents;
    defaultEmail = order.fanEmail ?? '';
  } else {
    notFound();
  }

  const pay = payMockCheckout.bind(null, sessionId);
  const borderColor = 'color-mix(in srgb, var(--signal) 22%, transparent)';

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="label mf-dim mb-2">Test checkout — no card</p>
      <h1 className="font-display mb-8 text-2xl">Pay {eur(totalCents)}</h1>

      <div className="hairline mb-6" style={{ borderColor }}>
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between p-4 text-sm" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <span>{line.label}</span>
            <span>{eur(line.amountCents)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-sm" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="mf-dim">Shipping</span>
          <span>{eur(shippingCents)}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm font-bold">
          <span>Total</span>
          <span>{eur(totalCents)}</span>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-xs" style={{ color: 'var(--accent)' }}>
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={pay} className="flex flex-col gap-4">
        {!isBulk && (
          <>
            <label className="block">
              <span className="label mf-dim">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={defaultEmail}
                placeholder="you@example.com"
                className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="label mf-dim">Country</span>
              <input name="country" defaultValue="ES" maxLength={2} className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm uppercase outline-none" />
            </label>
          </>
        )}
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
