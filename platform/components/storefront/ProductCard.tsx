'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicProductListItem } from '@/lib/storefront/read-model';
import { formatPrice } from '@/lib/storefront/present';

// One numbered piece: the garment on its ecru plate, a hairline, then number,
// name, price and the spec line. The image is decorative (alt is empty)
// because the name follows in the same link.
export function ProductCard({
  slug,
  product,
  index,
}: {
  slug: string;
  product: PublicProductListItem;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const image = hovered && product.secondImageUrl ? product.secondImageUrl : product.imageUrl;

  return (
    <Link
      href={`/${slug}/product/${product.id}`}
      className="sf-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="sf-plate mf-plate">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            className="transition-opacity duration-300"
          />
        ) : (
          <span className="sf-plate-empty">No image</span>
        )}
      </span>
      <span className="sf-info">
        <span className="sf-n" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="sf-nm">{product.name}</span>
        <span className="sf-pr">{formatPrice(product.retailPriceCents)}</span>
        {product.specLine && <span className="sf-sp">{product.specLine}</span>}
      </span>
    </Link>
  );
}
