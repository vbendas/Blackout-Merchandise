'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableImageCarouselProps {
  images: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  productName: string;
  onImageClick?: () => void;
}

export function DraggableImageCarousel({
  images,
  selectedIndex,
  onIndexChange,
  productName,
  onImageClick,
}: DraggableImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    startIndex: selectedIndex,
  });

  // Track drag state to distinguish taps from drags
  const isDragging = useRef(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  // Sync external index changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(selectedIndex, true);
    }
  }, [emblaApi, selectedIndex]);

  // Update parent when carousel changes
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      onIndexChange(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onIndexChange]);

  // Track drag state via pointer events to distinguish taps from drags
  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => {
      isDragging.current = false;
    };

    const onPointerMove = () => {
      isDragging.current = true;
    };

    const viewport = emblaApi.rootNode();
    if (viewport) {
      viewport.addEventListener('pointerdown', onPointerDown);
      viewport.addEventListener('pointermove', onPointerMove);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener('pointerdown', onPointerDown);
        viewport.removeEventListener('pointermove', onPointerMove);
      }
    };
  }, [emblaApi]);

  return (
    <div className="relative h-full">
      {/* Main Carousel */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((url, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 relative h-full"
              onClick={() => {
                if (onImageClick && !isDragging.current) {
                  onImageClick();
                }
              }}
            >
              <img
                src={url}
                alt={`${productName} - Image ${index + 1}`}
                className="absolute inset-0 w-full h-full object-contain p-8"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <Button
            onClick={scrollPrev}
            size="icon"
            variant="outline"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-black/60 backdrop-blur-sm border-zinc-700 hover:bg-black/80"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={scrollNext}
            size="icon"
            variant="outline"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-black/60 backdrop-blur-sm border-zinc-700 hover:bg-black/80"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Image Counter */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white border border-zinc-700">
        {selectedIndex + 1} / {images.length}
      </div>

      {/* Thumbnail Strip at Bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 max-w-full overflow-x-auto scrollbar-hide">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={cn(
                'w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative flex-shrink-0',
                idx === selectedIndex
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-zinc-700 opacity-60 hover:opacity-100 hover:border-zinc-500'
              )}
            >
              <img src={url} alt={`Thumbnail ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
