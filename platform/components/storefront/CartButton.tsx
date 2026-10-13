'use client';

import Link from 'next/link';
import { useCart } from '@/components/storefront/CartProvider';

export function CartButton({ slug }: { slug: string }) {
  const { count } = useCart();
  return (
    <Link href={`/${slug}/cart`} className="mf-label sf-navlink sf-top-cart">
      Cart ({count})<span className="sr-only"> {count === 1 ? 'item' : 'items'}</span>
    </Link>
  );
}
