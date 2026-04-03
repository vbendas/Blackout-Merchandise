'use client';

import type { LightboxProduct } from '../../lib/LightboxContext';
import { CatalogProductCard } from './CatalogProductCard';

interface ProductGridProps {
  products: LightboxProduct[];
  isLoading?: boolean;
  onProductClick?: (product: LightboxProduct) => void;
  _columns?: number;
}

/**
 * Grid view of products
 * Responsive layout with customizable columns
 * Part of Phase 3.5.5
 */
export function ProductGrid({ products, isLoading = false, onProductClick, _columns = 4 }: ProductGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 rounded-lg bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-zinc-400 text-sm">No products found</p>
        <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
      }}
    >
      {products.map((product) => (
        <CatalogProductCard key={product.id} product={product} onClick={onProductClick} />
      ))}
    </div>
  );
}
