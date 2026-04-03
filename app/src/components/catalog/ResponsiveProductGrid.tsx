'use client';

import type React from 'react';
import type { Product } from '@/data/products';

interface ResponsiveProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  isLoading?: boolean;
}

/**
 * Responsive Product Grid Component
 *
 * Responsive grid layout:
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 3 columns
 * - Large: 4 columns
 *
 * Consistent 16px gap between items
 */
export function ResponsiveProductGrid({
  products,
  onProductClick,
  isLoading = false,
}: ResponsiveProductGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden animate-pulse">
            <div className="aspect-square bg-[#f3f3f3]" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-[#f3f3f3] rounded w-3/4" />
              <div className="h-3 bg-[#f3f3f3] rounded w-1/2" />
              <div className="flex justify-between items-center">
                <div className="h-5 bg-[#f3f3f3] rounded w-16" />
                <div className="h-8 bg-[#f3f3f3] rounded-full w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f3f3f3] flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <h3 className="text-lg font-semibold text-black mb-1">No products found</h3>
        <p className="text-sm text-[#666666]">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg text-left"
        >
          {/* Placeholder Image Container */}
          <div className="aspect-[3/4] relative overflow-hidden bg-zinc-800">
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
              >
                <title>Product image placeholder</title>
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            {/* Category Badge */}
            <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-medium uppercase tracking-wider text-white">
              {product.category}
            </span>
            {/* Quick Actions (visible on hover) */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full">Configure</span>
            </div>
          </div>
          {/* Info */}
          <div className="p-4 space-y-1">
            <h3 className="font-medium text-sm truncate text-white">{product.name}</h3>
            <p className="text-xs text-zinc-400">{product.description}</p>
            <p className="font-semibold text-white">${product.price}</p>
            <p className="text-xs text-zinc-500">
              {product.colors.length} colors • {product.sizes.length} sizes
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
