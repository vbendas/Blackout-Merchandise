'use client';

import { ShoppingBag } from 'lucide-react';
import { getCartSummary, useCartStore } from '@/lib/cart/store';

export function CartButton() {
  const { items, openCart } = useCartStore();
  const summary = getCartSummary(items);

  return (
    <button
      onClick={openCart}
      className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors"
      aria-label={`Cart with ${summary.itemCount} items`}
    >
      <ShoppingBag className="w-5 h-5" />
      {summary.itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black text-xs font-medium rounded-full flex items-center justify-center">
          {summary.itemCount > 99 ? '99+' : summary.itemCount}
        </span>
      )}
    </button>
  );
}
