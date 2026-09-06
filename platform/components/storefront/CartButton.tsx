'use client';

import Link from 'next/link';
import { useCart } from '@/components/storefront/CartProvider';

export function CartButton({ slug }: { slug: string }) {
  const { count } = useCart();
  return (
    <Link
      href={`/${slug}/cart`}
      className="label flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 hover:opacity-80"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span>Cart</span>
      {count > 0 && (
        <span
          className="hairline flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
