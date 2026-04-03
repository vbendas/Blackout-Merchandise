'use client';

import { AnimatePresence, motion, type PanInfo, useMotionValue } from 'framer-motion';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MobileImageViewerProps {
  images: string[];
  initialIndex: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  thumbnailRef?: React.RefObject<HTMLElement | null>;
}

export function MobileImageViewer({ images, initialIndex, productName, isOpen, onClose }: MobileImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setZoomScale(1);
      x.set(0);
      y.set(0);
      scale.set(1);
    }
  }, [isOpen, initialIndex, x, y, scale]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      x.set(0);
    }
  }, [currentIndex, images.length, x]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      x.set(0);
    }
  }, [currentIndex, x]);

  // Handle drag end for swipe navigation
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Horizontal swipe for navigation
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0 && currentIndex > 0) {
        goToPrev();
      } else if (offset < 0 && currentIndex < images.length - 1) {
        goToNext();
      }
    }

    // Vertical swipe down to close
    if (info.offset.y > 100 && info.velocity.y > 0) {
      onClose();
    }

    // Reset position
    x.set(0);
    y.set(0);
  };

  // Pinch to zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      (containerRef.current as any).initialPinchDistance = distance;
      (containerRef.current as any).initialScale = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const initialDistance = (containerRef.current as any).initialPinchDistance || distance;
      const initialScale = (containerRef.current as any).initialScale || 1;
      const newScale = Math.min(Math.max(initialScale * (distance / initialDistance), 1), 3);
      setZoomScale(newScale);
      scale.set(newScale);
      setIsZoomed(newScale > 1.1);
    }
  };

  const handleTouchEnd = () => {
    if (zoomScale < 1.1) {
      setZoomScale(1);
      scale.set(1);
      setIsZoomed(false);
    }
  };

  // Double tap to zoom
  const lastTap = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap
      if (isZoomed) {
        setZoomScale(1);
        scale.set(1);
        setIsZoomed(false);
      } else {
        setZoomScale(2);
        scale.set(2);
        setIsZoomed(true);
      }
    }
    lastTap.current = now;
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] bg-black touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Image Counter */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-zinc-800/80 backdrop-blur text-white text-sm font-medium"
          >
            {currentIndex + 1} / {images.length}
          </motion.div>

          {/* Main Image Container */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <motion.div
              drag={!isZoomed}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragStart={() => {}}
              onDragEnd={handleDragEnd}
              style={{ x, y, scale }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <motion.img
                ref={imageRef}
                src={currentImage}
                alt={`${productName} - View ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain select-none"
                onClick={handleTap}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                aria-label="Previous image"
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-800/60 backdrop-blur flex items-center justify-center text-white transition-opacity ${
                  currentIndex === 0 ? 'opacity-30' : 'opacity-80 active:opacity-100'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === images.length - 1}
                aria-label="Next image"
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-800/60 backdrop-blur flex items-center justify-center text-white transition-opacity ${
                  currentIndex === images.length - 1 ? 'opacity-30' : 'opacity-80 active:opacity-100'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* Bottom Dot Indicators */}
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 px-4"
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? 'w-6 bg-white' : 'w-2 bg-zinc-500'
                  }`}
                />
              ))}
            </motion.div>
          )}

          {/* Swipe Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute bottom-20 left-0 right-0 text-center pointer-events-none"
          >
            <p className="text-zinc-400 text-xs">
              {images.length > 1 ? 'Swipe to navigate • ' : ''}Pinch to zoom • Swipe down to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
