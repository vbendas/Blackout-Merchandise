import Link from 'next/link';
import { connection } from 'next/server';
import { ClearCartOnSuccess } from '@/components/storefront/ClearCartOnSuccess';
import { getPublicOrder } from '@/lib/storefront/orders';
import { formatCents, safeExternalUrl } from '@/lib/storefront/present';
import { OrderStatusTimeline } from '@/components/storefront/OrderStatusTimeline';
import { Hairline } from '@/components/ui/Hairline';

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  // The status changes after the page is first seen (production, shipping),
  // so this page is rendered per request, never cached.
  await connection();

  const { slug, token } = await params;

  const order = await getPublicOrder(token);

  // A bad/expired token is a page-level 404, not a store-level one — the
  // shop itself is fine (the layout above already gated that), so this
  // renders inline instead of calling notFound() and losing the shop's
  // header/footer to the generic "No such shop." boundary.
  if (!order || order.storeSlug !== slug) {
    return (
      <div className="pb-20 pt-8">
        <h1 className="sf-title">Order not found</h1>
        <p className="mf-dim mt-2 text-sm">That order link is invalid or has expired.</p>
        <Link href={`/${slug}`} className="mf-ulink mt-6 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  // Paid and waiting for the press; once production moves on the timeline says so.
  const justPaid = order.status === 'paid' && (order.productionStatus === null || order.productionStatus === 'queued');
  const trackingHref = order.tracking?.url ? safeExternalUrl(order.tracking.url) : null;

  return (
    <div className="pb-6 pt-8">
      <h1 className="sf-title">Order {order.reference}</h1>

      {/* Stays in the page across refreshes, so a status change is announced. */}
      <div role="status">{justPaid && <p className="mt-2 text-sm">Thanks. We&apos;ll print it now.</p>}</div>
      {order.status !== 'pending' && <ClearCartOnSuccess />}

      <div className="mt-8">
        <OrderStatusTimeline order={order} />
      </div>

      {order.tracking && (
        <div className="sf-box mt-8 text-sm">
          <span className="mf-label mf-dim">Tracking</span>
          <p className="mt-2">
            {order.tracking.carrier ?? 'Carrier'} {order.tracking.code ?? ''}
          </p>
          {trackingHref && (
            <a href={trackingHref} target="_blank" rel="noreferrer" className="mf-ulink mt-1 inline-block">
              Track shipment
            </a>
          )}
        </div>
      )}

      <div className="mt-10">
        {order.lines.map((line, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-4 py-4 text-sm">
              <div>
                <div className="font-semibold">{line.name}</div>
                <div className="mf-dim mt-1 text-xs">
                  {[line.colourName ?? line.colourCode, line.size].filter(Boolean).join(' · ')} × {line.qty}
                </div>
              </div>
              <span className="tabular-nums">{formatCents(line.priceCents * line.qty)}</span>
            </div>
            <Hairline />
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 text-sm tabular-nums">
        <div className="flex justify-between">
          <span className="mf-dim">Subtotal</span>
          <span>{formatCents(order.subtotalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="mf-dim">Shipping</span>
          <span>{formatCents(order.shippingCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="mf-dim">Tax</span>
          <span>{formatCents(order.taxCents)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </div>

      <p className="mf-label mf-dim mt-10">Questions? hello@blackoutmerch.example</p>
    </div>
  );
}
