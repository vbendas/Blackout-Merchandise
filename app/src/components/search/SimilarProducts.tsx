'use client';

/**
 * SimilarProducts — "Similar Designs" horizontal carousel.
 *
 * Uses vector search to find visually similar products.
 * Shown on product detail pages.
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface SimilarProduct {
  id: string;
  name: string;
  imageUrl?: string;
  mockupUrl?: string;
  baseCostEur?: number;
  retailPrice?: number;
  _vectorDistance?: number;
}

interface SimilarProductsProps {
  productId: string;
  collection?: 'catalog_products' | 'artist_products';
  limit?: number;
  title?: string;
  onProductClick?: (product: SimilarProduct) => void;
}

export function SimilarProducts({
  productId,
  collection = 'catalog_products',
  limit = 8,
  title = 'Similar Products',
  onProductClick,
}: SimilarProductsProps) {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollIndex, setScrollIndex] = useState(0);

  useEffect(() => {
    async function fetchSimilar() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/search/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, collection, limit }),
        });

        if (!response.ok) {
          setProducts([]);
          return;
        }

        const data = await response.json();
        setProducts(data.results ?? []);
      } catch {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) fetchSimilar();
  }, [productId, collection, limit]);

  if (!isLoading && products.length === 0) return null;

  const scrollLeft = () => setScrollIndex(Math.max(0, scrollIndex - 1));
  const scrollRight = () => setScrollIndex(Math.min(products.length - 4, scrollIndex + 1));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        </div>
        {products.length > 4 && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={scrollLeft} disabled={scrollIndex <= 0} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={scrollRight} disabled={scrollIndex >= products.length - 4} className="h-7 w-7 p-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel */}
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-36 shrink-0">
              <div className="aspect-square bg-zinc-900 rounded-lg animate-pulse" />
              <div className="mt-2 h-3 bg-zinc-900 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-hidden transition-transform duration-300" style={{ transform: `translateX(-${scrollIndex * 156}px)` }}>
          {products.map((product) => {
            const imageUrl = product.imageUrl || product.mockupUrl;
            const priceCents = product.baseCostEur ?? product.retailPrice;

            return (
              <button
                key={product.id}
                onClick={() => onProductClick?.(product)}
                className="w-36 shrink-0 group text-left"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-zinc-900">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate mt-1.5">{product.name}</p>
                {priceCents != null && (
                  <p className="text-xs text-zinc-500">€{(priceCents / 100).toFixed(2)}</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
