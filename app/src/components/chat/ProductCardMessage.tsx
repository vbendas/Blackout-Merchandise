'use client';

import { ArrowRight, ChevronRight, Eye } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  brand?: string;
  material?: string;
  baseCostEur: number;
  imageUrl?: string;
}

interface ProductCardMessageProps {
  products: Product[];
  hasMoreResults?: boolean;
  onProductSelect?: (product: Product) => void;
  onShowMore?: () => void;
}

/**
 * Displays search results as horizontal-scrolling product cards in a chat message.
 * Compact cards optimized for inline chat display with dark theme.
 */
export function ProductCardMessage({
  products,
  hasMoreResults = false,
  onProductSelect,
  onShowMore,
}: ProductCardMessageProps) {
  const formatPrice = (eur: number) => {
    return `€${eur.toFixed(2)}`;
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Horizontal scrolling container */}
      <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 -mx-1 px-1">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductSelect?.(product)}
            className="flex-shrink-0 w-[160px] sm:w-[180px] text-left group"
          >
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-600 transition-colors">
              {/* Image thumbnail */}
              <div className="relative h-28 sm:h-32 w-full bg-zinc-800 overflow-hidden">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="180px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Card content */}
              <div className="p-2.5 space-y-1.5">
                {/* Product name */}
                <h4 className="text-xs font-medium text-white line-clamp-2 leading-snug">
                  {product.name}
                </h4>

                {/* Brand + Material */}
                {(product.brand || product.material) && (
                  <p className="text-[10px] text-zinc-400 truncate">
                    {product.brand && (
                      <span className="text-zinc-300">{product.brand}</span>
                    )}
                    {product.brand && product.material && (
                      <span className="text-zinc-600 mx-1">·</span>
                    )}
                    {product.material}
                  </p>
                )}

                {/* Price */}
                <p className="text-sm font-semibold text-white">
                  {formatPrice(product.baseCostEur)}
                </p>

                {/* View details button */}
                <div className="pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    View details
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Show more button */}
        {hasMoreResults && (
          <button
            onClick={onShowMore}
            className="flex-shrink-0 w-[100px] sm:w-[120px] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600 transition-colors p-4"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium text-center">
              Show more
            </span>
          </button>
        )}
      </div>

      {/* Scroll hint */}
      {products.length > 2 && (
        <p className="text-[10px] text-zinc-600 text-center mt-1">
          Swipe to see more
        </p>
      )}
    </div>
  );
}
