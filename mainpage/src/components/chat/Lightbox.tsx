'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export function Lightbox({
  isOpen,
  onClose,
  images,
  currentIndex = 0,
  onIndexChange,
  actionButtons = [],
}: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    const next = (activeIndex + 1) % images.length;
    setActiveIndex(next);
    onIndexChange?.(next);
  }, [activeIndex, images.length, onIndexChange]);

  const goToPrevious = useCallback(() => {
    const prev = (activeIndex - 1 + images.length) % images.length;
    setActiveIndex(prev);
    onIndexChange?.(prev);
  }, [activeIndex, images.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToNext, goToPrevious]);

  const handlePreviousKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToPrevious();
    }
  };

  const handleNextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToNext();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
      >
        <div className="flex items-center justify-between p-4">
          <div className="text-white text-sm">
            {activeIndex + 1} / {images.length}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <section 
          className="flex-1 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label="Image viewer"
        >
          {images.length > 1 && (
            <button
              onClick={goToPrevious}
              onKeyDown={handlePreviousKeyDown}
              className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-full max-h-full"
          >
            <Image
              src={images[activeIndex]}
              alt={`Viewing image ${activeIndex + 1} of ${images.length}`}
              width={800}
              height={800}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              priority
            />
          </motion.div>

          {images.length > 1 && (
            <button
              onClick={goToNext}
              onKeyDown={handleNextKeyDown}
              className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </section>

        {actionButtons.length > 0 && (
          <fieldset 
            className="p-4 flex justify-center gap-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Action buttons"
          >
            {actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.onClick}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  button.variant === 'primary' 
                    ? 'bg-green-600 text-white hover:bg-green-700' :
                  button.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700' :
                  'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {button.label}
              </button>
            ))}
          </fieldset>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Image navigation">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveIndex(index);
                  onIndexChange?.(index);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === activeIndex ? 'bg-white' : 'bg-white/30'
                }`}
                aria-label={`Go to image ${index + 1}`}
                aria-selected={index === activeIndex}
                role="tab"
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
