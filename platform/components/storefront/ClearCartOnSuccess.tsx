'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/storefront/CartProvider';

// Rendered on the order page after a paid checkout: the cart's job is done.
export function ClearCartOnSuccess() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
