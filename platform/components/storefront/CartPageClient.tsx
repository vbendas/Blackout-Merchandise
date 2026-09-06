'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/storefront/CartProvider';
import { CartLineRow } from '@/components/storefront/CartLineRow';
import { lineKey } from '@/lib/storefront/cart';
import { checkProductsLive } from '@/lib/storefront/actions';
import { SHIPPING_COUNTRIES } from '@/lib/storefront/shipping-countries';
import type { CheckoutRequest, CheckoutResponse } from '@/lib/agent/protocol';

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

type CheckoutState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string };

export function CartPageClient({ slug }: { slug: string }) {
  const { lines, setQty, remove, removeMany, subtotalCents, count } = useCart();
  const [country, setCountry] = useState('ES');
  const [email, setEmail] = useState('');
  const [staleNotice, setStaleNotice] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>({ kind: 'idle' });
  // Runs once, the first time the (hydrated, localStorage-backed) cart is
  // seen with lines in it — not on every qty/remove change.
  const checkedRef = useRef(false);

  // Catch a product the artist archived or unpublished after it was added.
  useEffect(() => {
    if (checkedRef.current || lines.length === 0) return;
    checkedRef.current = true;
    const productIds = [...new Set(lines.map((l) => l.productId))];
    checkProductsLive(productIds).then((liveIds) => {
      const live = new Set(liveIds);
      const staleKeys = new Set(lines.filter((l) => !live.has(l.productId)).map((l) => lineKey(l)));
      if (staleKeys.size > 0) {
        removeMany(staleKeys);
        setStaleNotice(true);
      }
    });
  }, [lines, removeMany]);

  async function handleCheckout() {
    setCheckout({ kind: 'loading' });
    const body: CheckoutRequest = {
      storeSlug: slug,
      lines: lines.map((l) => ({ productId: l.productId, colourCode: l.colourCode, size: l.size, qty: l.qty })),
      country,
      email: email.trim() || undefined,
    };

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 404) {
        setCheckout({ kind: 'error', message: "Checkout isn't live yet — hang tight, it's being built." });
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setCheckout({ kind: 'error', message: text || 'Checkout failed. Please try again.' });
        return;
      }

      const data = (await res.json()) as CheckoutResponse;
      window.location.href = data.url;
    } catch {
      setCheckout({ kind: 'error', message: "Couldn't reach checkout. Please try again." });
    }
  }

  if (lines.length === 0) {
    return (
      <div style={{ paddingInline: 'var(--gutter)', paddingBlock: '80px' }}>
        <p className="mf-dim">Your cart is empty.</p>
        <Link href={`/${slug}`} className="label mt-4 inline-block hover:opacity-80" style={{ color: 'var(--accent)' }}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]" style={{ paddingInline: 'var(--gutter)' }}>
      <div>
        <h1 className="font-display mb-6 text-2xl">Cart ({count})</h1>

        {staleNotice && (
          <p className="hairline mb-6 p-3 text-xs" style={{ color: 'var(--accent)' }}>
            One or more items in your cart are no longer available and were removed.
          </p>
        )}

        {lines.map((line) => (
          <CartLineRow
            key={lineKey(line)}
            line={line}
            onQtyChange={(qty) => setQty(lineKey(line), qty)}
            onRemove={() => remove(lineKey(line))}
          />
        ))}
      </div>

      <div>
        <div className="hairline p-5">
          <div className="flex justify-between text-sm">
            <span className="mf-dim">Subtotal</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
          <p className="mf-dim mt-1 text-xs">Shipping calculated at checkout.</p>

          <label className="mt-6 block">
            <span className="label mf-dim">Destination</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm"
            >
              {SHIPPING_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: 'var(--paper)' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="label mf-dim">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="hairline mt-2 min-h-11 w-full bg-transparent p-2 text-sm outline-none"
            />
          </label>

          {checkout.kind === 'error' && (
            <p className="mt-4 text-xs" style={{ color: 'var(--accent)' }}>
              {checkout.message}
            </p>
          )}

          <button
            type="button"
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full py-3 text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', opacity: checkout.kind === 'loading' ? 0.6 : 1 }}
            onClick={handleCheckout}
            disabled={checkout.kind === 'loading'}
          >
            {checkout.kind === 'loading' ? 'Redirecting…' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
