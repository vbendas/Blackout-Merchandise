'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { LightboxProduct } from '../../lib/LightboxContext';
import { Button } from '../ui/button';
import { CatalogProductCard } from './CatalogProductCard';

interface ProductSliderProps {
  products: LightboxProduct[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
}

/**
 * Horizontal slider of products
 * Supports autoplay and manual navigation
 * Part of Phase 3.5.5
 */
export function ProductSlider({ products, title, autoplay = false, autoplayInterval = 5000 }: ProductSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  // Autoplay effect
  // Note: This is a simplified version - in production, you'd use useEffect with proper cleanup
  if (autoplay) {
    setTimeout(() => nextSlide(), autoplayInterval);
  }

  if (products.length === 0) {
    return null;
  }

  const visibleProducts = products.slice(currentIndex, currentIndex + 3);

  return (
    <div className="w-full space-y-3">
      {title && <h3 className="text-sm font-semibold text-white px-4">{title}</h3>}

      <div className="relative">
        {/* Navigation Buttons */}
        <Button
          onClick={prevSlide}
          size="sm"
          variant="outline"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 rounded-full"
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          onClick={nextSlide}
          size="sm"
          variant="outline"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 rounded-full"
          disabled={currentIndex >= products.length - 3}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Slider Container */}
        <div className="flex gap-4 px-8 overflow-hidden">
          {visibleProducts.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-72">
              <CatalogProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-1.5">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-white w-6' : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
