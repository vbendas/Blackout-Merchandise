'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { ProductCardInline, type ProductCardInlineProps } from './ProductCardInline';

interface ProductCardCarouselProps {
  products: ProductCardInlineProps[];
  title?: string;
  onSelectProduct?: (productId: string) => void;
  onOpenDetail?: (productId: string) => void;
}

/**
 * Carousel of product cards for displaying multiple related products
 * Allows horizontal scrolling through product recommendations
 * Part of Phase 3.5.2
 */
export function ProductCardCarousel({ products, title, onSelectProduct, onOpenDetail }: ProductCardCarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('product-carousel');
    if (!container) return;

    const scrollAmount = 400; // Width of one card plus gap
    const newPosition = scrollPosition + (direction === 'left' ? -scrollAmount : scrollAmount);

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    });

    setScrollPosition(newPosition);
  };

  if (products.length === 0) {
    return null;
  }

  const showNavigation = products.length > 1;

  return (
    <div className="w-full space-y-3">
      {title && <h3 className="text-sm font-semibold text-white px-4">{title}</h3>}

      <div className="relative group">
        {/* Carousel Container */}
        <div
          id="product-carousel"
          className="flex overflow-x-auto scrollbar-hide gap-3 px-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {products.map((product) => (
            <div key={product.productId} className="flex-shrink-0" style={{ width: '320px' }}>
              <ProductCardInline {...product} onSelectProduct={onSelectProduct} onOpenDetail={onOpenDetail} />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        {showNavigation && (
          <>
            <Button
              onClick={() => scroll('left')}
              size="sm"
              variant="outline"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => scroll('right')}
              size="sm"
              variant="outline"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Scroll Hint */}
      {showNavigation && <p className="text-xs text-zinc-500 text-center">Scroll to see more products</p>}
    </div>
  );
}
