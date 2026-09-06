'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicProductListItem } from '@/lib/storefront/read-model';

function formatCents(cents: number | null): string | null {
  return cents == null ? null : `€${(cents / 100).toFixed(2)}`;
}

export function ProductCard({ slug, product }: { slug: string; product: PublicProductListItem }) {
  const [hovered, setHovered] = useState(false);
  const showSecond = hovered && Boolean(product.secondImageUrl);
  const image = showSecond ? product.secondImageUrl : product.imageUrl;

  return (
    <Link
      href={`/${slug}/product/${product.id}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="hairline relative aspect-square w-full overflow-hidden">
        <div className="absolute inset-[9%]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={`${product.name}${showSecond ? ' — alternate colour' : ''}`}
              className="h-full w-full object-contain transition-opacity duration-300"
            />
          ) : (
            <div className="mf-dim flex h-full w-full items-center justify-center text-xs">No image</div>
          )}
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-bold">{product.name}</div>
        <div className="mf-dim mt-1 text-sm">{formatCents(product.retailPriceCents) ?? '—'}</div>
      </div>
    </Link>
  );
}
