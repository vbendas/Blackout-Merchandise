'use client';

import { useUser } from '@clerk/nextjs';
import { Loader2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPrice, getCartSummary, useCartStore } from '@/lib/cart/store';

function CheckoutContent() {
  const router = useRouter();
  const { user } = useUser();
  const { items, clearCart } = useCartStore();
  const summary = getCartSummary(items);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!user?.id) {
      setError('Please sign in to complete your purchase.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          userId: user.id,
          storeId: items[0]?.storeId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        clearCart();
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h1 className="text-xl font-semibold mb-2">Your cart is empty</h1>
          <p className="text-zinc-400 mb-4">Add some items to your cart first</p>
          <button onClick={() => router.push('/')} className="text-white hover:text-zinc-300">
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-zinc-900 rounded-lg">
                  <div className="w-20 h-20 relative bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                    <Image src={item.mockupUrl} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-zinc-400">{item.storeName}</p>
                    <p className="text-sm text-zinc-400">Qty: {item.quantity}</p>
                    <p className="font-medium mt-1">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-zinc-900 rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Payment</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal ({summary.itemCount} items)</span>
                  <span>{formatPrice(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Shipping</span>
                  <span className="text-zinc-500">Included</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-zinc-700">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">{formatPrice(summary.total)}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">{error}</div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isLoading || items.length === 0}
                className="w-full py-3 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(summary.total)}`
                )}
              </button>

              <p className="text-xs text-zinc-500 mt-4 text-center">
                Secure payment powered by Stripe. Apple Pay and Google Pay available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  // During static generation, ClerkProvider may not be available.
  // Render a placeholder to avoid the useUser hook throwing.
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasClerk = clerkPubKey && !clerkPubKey.includes('placeholder');

  if (!hasClerk) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h1 className="text-xl font-semibold mb-2">Checkout</h1>
          <p className="text-zinc-400">Authentication service not configured.</p>
        </div>
      </div>
    );
  }

  return <CheckoutContent />;
}
