'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/storefront/CartProvider';
import { CartLineRow } from '@/components/storefront/CartLineRow';
import { lineKey } from '@/lib/storefront/cart';
import { checkProductsLive } from '@/lib/storefront/actions';
import { formatCents } from '@/lib/storefront/present';
import { SHIPPING_COUNTRIES } from '@/lib/storefront/shipping-countries';
import type { CheckoutRequest, CheckoutResponse } from '@/lib/agent/protocol';

const CHECKOUT_CLOSED = 'Checkout is closed right now. Try again soon.';
const CHECKOUT_FAILED = "Checkout didn't start. Try again in a moment.";

/** A plain sentence for a failed checkout call. The server's own text is only
 * read to pick the sentence, never shown: it speaks in system terms. */
function checkoutErrorMessage(status: number, serverText: string): string {
  if (status === 404) return CHECKOUT_CLOSED;
  if (status === 429) return 'Too many tries. Wait a moment, then try again.';
  if (status >= 500) return 'Something went wrong on our side. Try again in a moment.';

  const text = serverText.toLowerCase();
  if (text.includes('cannot accept payments')) return CHECKOUT_CLOSED;
  if (text.includes('ship to that country') || text.includes('destination country')) {
    return "We can't ship to that destination yet. Pick another country.";
  }
  if (
    text.includes('no longer available') ||
    text.includes('not currently for sale') ||
    text.includes("doesn't come in") ||
    text.includes('no price')
  ) {
    return "Something in your cart isn't available anymore. Remove it and try again.";
  }
  return CHECKOUT_FAILED;
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

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setCheckout({ kind: 'error', message: checkoutErrorMessage(res.status, text) });
        return;
      }

      const data = (await res.json()) as CheckoutResponse;
      if (!data.url) {
        setCheckout({ kind: 'error', message: CHECKOUT_FAILED });
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckout({ kind: 'error', message: "We couldn't reach checkout. Check your connection and try again." });
    }
  }

  if (lines.length === 0) {
    return (
      <div className="pb-20 pt-8">
        <h1 className="sf-title">Cart</h1>
        <p className="mf-dim mt-6">Your cart is empty.</p>
        <Link href={`/${slug}`} className="mf-ulink mt-4 inline-block">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 pt-8 md:grid-cols-[1fr_340px]">
      <div>
        <h1 className="sf-title mb-6">Cart ({count})</h1>

        {staleNotice && (
          <p role="status" className="sf-notice mb-6">
            Something in your cart isn&apos;t available anymore, so we removed it.
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
        <div className="sf-box">
          <div className="flex justify-between text-sm">
            <span className="mf-dim">Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotalCents)}</span>
          </div>
          <p className="mf-dim mt-1 text-xs">Shipping calculated at checkout.</p>

          <label className="mt-6 block">
            <span className="mf-label mf-dim">Destination</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="sf-field mt-2">
              {SHIPPING_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: 'var(--paper)' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="mf-label mf-dim">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="sf-field mt-2"
            />
          </label>

          {checkout.kind === 'error' && (
            <p role="alert" className="sf-notice mt-4">
              {checkout.message}
            </p>
          )}

          <button
            type="button"
            className="mf-pill sf-cta mt-6 w-full"
            onClick={handleCheckout}
            disabled={checkout.kind === 'loading'}
            aria-busy={checkout.kind === 'loading'}
          >
            {checkout.kind === 'loading' ? 'Redirecting…' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
