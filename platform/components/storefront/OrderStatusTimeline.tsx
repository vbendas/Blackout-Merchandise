import type { PublicOrder } from '@/lib/storefront/orders';

const STEPS: { key: string; label: string }[] = [
  { key: 'paid', label: 'Paid' },
  { key: 'printing', label: 'In production' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function currentStepIndex(order: PublicOrder): number {
  if (order.status === 'cancelled') return -1;
  switch (order.productionStatus) {
    case 'printing':
      return 1;
    case 'packed':
      return 2;
    case 'shipped':
      return 3;
    case 'delivered':
      return 4;
    default:
      return order.status === 'paid' || order.status === 'processing' || order.status === 'fulfilled' ? 0 : -1;
  }
}

export function OrderStatusTimeline({ order }: { order: PublicOrder }) {
  if (order.status === 'cancelled') {
    return <p style={{ color: 'var(--accent)' }}>This order was cancelled.</p>;
  }

  const current = currentStepIndex(order);
  if (current === -1) {
    return <p className="mf-dim">Awaiting payment.</p>;
  }

  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-3">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: done ? 'var(--accent)' : 'color-mix(in srgb, var(--signal) 30%, transparent)' }}
            />
            <span className="label" style={{ color: done ? 'var(--accent)' : undefined, opacity: done ? 1 : 0.62 }}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
