'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCartState } from '@/lib/storefront/useCartState';

type CartContextValue = ReturnType<typeof useCartState>;

const CartContext = createContext<CartContextValue | null>(null);

/** Wraps every /[slug] route so the header cart count and the cart page
 * read the same in-memory state instead of two separate localStorage reads
 * drifting apart within one tab. */
export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const cart = useCartState(slug);
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
