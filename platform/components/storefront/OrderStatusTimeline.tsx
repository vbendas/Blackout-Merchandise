'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicOrder } from '@/lib/storefront/orders';

const STEPS: { key: string; label: string }[] = [
  { key: 'paid', label: 'Paid' },
  { key: 'printing', label: 'In production' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

// While payment is still clearing the page asks the server again every ten
// seconds, and gives up after ten minutes (an abandoned checkout stays
// pending for good).
const POLL_MS = 10_000;
const POLL_FOR_MS = 10 * 60_000;

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
      switch (order.status) {
        case 'paid':
        case 'processing':
          return 0;
        case 'shipped':
          return 3;
        case 'fulfilled':
          return 4;
        default:
          return -1;
      }
  }
}

export function OrderStatusTimeline({ order }: { order: PublicOrder }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  const cancelled = order.status === 'cancelled';
  const current = currentStepIndex(order);
  const awaitingPayment = !cancelled && current === -1;

  // Refresh the server page until the status moves on. The effect re-runs
  // when `awaitingPayment` flips to false, which clears the timer.
  useEffect(() => {
    if (!awaitingPayment) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= POLL_FOR_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      if (document.visibilityState === 'visible') router.refresh();
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [awaitingPayment, router]);

  if (cancelled) {
    return <p>This order was cancelled.</p>;
  }

  if (awaitingPayment) {
    return (
      <div role="status">
        <p className="font-semibold">Awaiting payment.</p>
        <p className="mf-dim mt-1 text-sm">
          {gaveUp
            ? 'Still waiting. Reload this page to check again.'
            : 'This page checks again by itself.'}
        </p>
      </div>
    );
  }

  return (
    <ol role="list" className="sf-steps" aria-label="Order progress">
      {STEPS.map((step, i) => {
        // The last step, once reached, is finished rather than in progress.
        const reached = i === current && i === STEPS.length - 1;
        const state = i < current || reached ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={step.key} className="sf-step" data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
            <span aria-hidden="true" className="sf-step-mark" />
            <span className="sf-step-label">{step.label}</span>
            {state === 'done' && <span className="sf-step-state">Done</span>}
            {state === 'now' && <span className="sf-step-state">Now</span>}
            {state === 'next' && <span className="sr-only">Not yet</span>}
          </li>
        );
      })}
    </ol>
  );
}
