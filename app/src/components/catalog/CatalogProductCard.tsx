'use client';

import Image from 'next/image';
import { type LightboxProduct, useLightbox } from '../../lib/LightboxContext';

interface CatalogProductCardProps {
  product: LightboxProduct;
  onClick?: (product: LightboxProduct) => void;
}

/**
 * Product card for catalog grid
 * Clicking opens the detailed lightbox view
 * Part of Phase 3.5.5
 */
export function CatalogProductCard({ product, onClick }: CatalogProductCardProps) {
  const { openLightbox } = useLightbox();

  const handleClick = () => {
    onClick?.(product);
    openLightbox(product, 0);
  };

  return (
    <button
      onClick={handleClick}
      className="group relative h-64 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:shadow-lg"
    >
      {/* Product Image */}
      {product.imageUrls[0] && (
        <Image
          src={product.imageUrls[0]}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority={false}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content - Visible on Hover */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <h3 className="text-sm font-semibold text-white line-clamp-2">{product.name}</h3>
        {product.brand && <p className="text-xs text-zinc-400">{product.brand}</p>}
        <p className="text-xs text-zinc-500 mt-1">
          {product.colors?.length || 0} colors • {product.sizes?.length || 0} sizes
        </p>
      </div>

      {/* Badge */}
      {product.category && (
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded">
          {product.category}
        </div>
      )}
    </button>
  );
}
