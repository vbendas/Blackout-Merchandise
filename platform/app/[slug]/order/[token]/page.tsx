import { ClearCartOnSuccess } from '@/components/storefront/ClearCartOnSuccess';
import { getPublicOrder } from '@/lib/storefront/orders';
import { OrderStatusTimeline } from '@/components/storefront/OrderStatusTimeline';
import { Hairline } from '@/components/ui/Hairline';

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const order = await getPublicOrder(token);

  // A bad/expired token is a page-level 404, not a store-level one — the
  // shop itself is fine (the layout above already gated that), so this
  // renders inline instead of calling notFound() and losing the shop's
  // header/footer to the generic "No such shop." boundary.
  if (!order || order.storeSlug !== slug) {
    return (
      <div style={{ paddingInline: 'var(--gutter)', paddingBottom: '80px' }}>
        <h1 className="font-display text-2xl">Order not found</h1>
        <p className="mf-dim mt-2 text-sm">That order link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingInline: 'var(--gutter)', paddingBottom: '80px' }}>
      <h1 className="font-display text-2xl">Order {order.reference}</h1>

      {order.status === 'paid' && <p className="mt-2 text-sm">Thanks — we&apos;ll print it now.</p>}
      {order.status !== 'pending' && <ClearCartOnSuccess />}

      <div className="mt-8">
        <OrderStatusTimeline order={order} />
      </div>

      {order.tracking && (
        <div className="hairline mt-8 p-4 text-sm">
          <span className="label mf-dim">Tracking</span>
          <p className="mt-2">
            {order.tracking.carrier ?? 'Carrier'} {order.tracking.code ?? ''}
          </p>
          {order.tracking.url && (
            <a href={order.tracking.url} target="_blank" rel="noreferrer" className="mt-1 inline-block hover:opacity-80" style={{ color: 'var(--accent)' }}>
              Track shipment
            </a>
          )}
        </div>
      )}

      <div className="mt-10">
        {order.lines.map((line, i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-4 text-sm">
              <div>
                <div className="font-bold">{line.name}</div>
                <div className="mf-dim mt-1 text-xs">
                  {[line.colourName ?? line.colourCode, line.size].filter(Boolean).join(' · ')} × {line.qty}
                </div>
              </div>
              <span>{formatCents(line.priceCents * line.qty)}</span>
            </div>
            <Hairline />
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 text-sm">
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
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </div>

      <p className="label mf-dim mt-10">Questions? hello@merchfrom.com</p>
    </div>
  );
}
