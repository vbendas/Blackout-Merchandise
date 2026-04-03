'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useViewportSize } from '@/hooks/useViewportSize';

// Cloudinary configuration
const CLOUDINARY_CLOUD = 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

// Build Cloudinary URL with optimizations
function getCloudinaryUrl(publicId: string, width: number = 600): string {
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

// Gallery items with Cloudinary public_ids
// Perfect rectangle layout: 4 columns × 6 rows = 24 cell-rows
// Distribution: 2 large (2x2=8), 4 tall (1x2=8), 8 small (1x1=8) = 24 total ✓
// Maintains visual asymmetry while ending all columns at same height
const ITEMS = [
  { id: 1, publicId: '2024061019193023_xppfml', className: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-2' }, // Large hero - tablet 1 col, desktop 2 cols
  { id: 2, publicId: '2024061511335904_xnxhyx', className: 'col-span-1 row-span-1' }, // Small
  { id: 3, publicId: '2024061611442076_eendu5', className: 'col-span-1 lg:row-span-2 row-span-1' }, // Tall - tablet no span, desktop span
  { id: 4, publicId: '2024072522085784_wqhpz4', className: 'col-span-1 row-span-1' }, // Small
  { id: 5, publicId: 'PXL_20240104_185659523.RAW-01.COVER_cbnu86', className: 'col-span-1 row-span-1' }, // Small
  { id: 6, publicId: 'PXL_20240319_102040539.RAW-01.COVER_bsfp1u', className: 'col-span-1 lg:row-span-2 row-span-1' }, // Tall - tablet no span
  { id: 7, publicId: 'PXL_20240319_214226810.RAW-01.COVER_ipjods', className: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-2' }, // Large - tablet 1 col, desktop 2 cols
  { id: 8, publicId: 'PXL_20240329_140404109.RAW-01.COVER_ciokct', className: 'col-span-1 lg:row-span-2 row-span-1' }, // Tall - tablet no span
  { id: 9, publicId: 'PXL_20240429_125545466.RAW-01.COVER_xqirln', className: 'col-span-1 row-span-1' }, // Small
  { id: 10, publicId: 'PXL_20240505_122820090.RAW-01.COVER_l0m1qc', className: 'col-span-1 lg:row-span-2 row-span-1' }, // Tall - tablet no span
  { id: 11, publicId: 'PXL_20240505_144131222.RAW-01.COVER_yyw0of', className: 'col-span-1 row-span-1' }, // Small
  { id: 12, publicId: 'PXL_20240608_133049372.RAW-01.COVER_heljk8', className: 'col-span-1 row-span-1' }, // Small
  { id: 13, publicId: 'PXL_20240610_165136658.RAW-01.COVER_xmpqk1', className: 'col-span-1 row-span-1' }, // Small
  { id: 14, publicId: 'PXL_20240612_000158545.RAW-01.COVER_tquwks', className: 'col-span-1 row-span-1' }, // Small
];

export default function MasonryGrid() {
  const [mounted, setMounted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Key to reset timer
  const [direction, setDirection] = useState(1); // 1 for next, -1 for previous
  const { isMobile, hasMounted } = useViewportSize();

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  // Auto-advance slider on mobile every 3 seconds
  useEffect(() => {
    if (!isMobile || !hasMounted || isDragging) return;

    const timer = setInterval(() => {
      setDirection(1); // Auto-advance always goes forward
      setCurrentSlide((prev) => (prev + 1) % ITEMS.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [isMobile, hasMounted, isDragging, timerKey, currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null ? (prev - 1 + ITEMS.length) % ITEMS.length : null));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % ITEMS.length : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + ITEMS.length) % ITEMS.length : null));
  }, []);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % ITEMS.length : null));
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  if (!mounted || !hasMounted) return null;

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * Math.abs(velocity);
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentSlide((prev) => {
      const next = prev + newDirection;
      if (next < 0) return ITEMS.length - 1;
      if (next >= ITEMS.length) return 0;
      return next;
    });
    // Reset timer after manual navigation
    setTimerKey((prev) => prev + 1);
  };

  return (
    <>
      {isMobile ? (
        // MOBILE: Slider/Carousel - Full Width
        // Tablet shows 2-column grid below
        <section className="w-full bg-black py-12 -mt-[40px] relative">
          {/* Gradient fade at top */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black via-black to-transparent z-10 pointer-events-none" />

          {/* Slider Container - Full Width */}
          <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);

                  if (swipe > swipeConfidenceThreshold) {
                    if (offset.x < 0) {
                      paginate(1); // Drag left = go to next
                    } else {
                      paginate(-1); // Drag right = go to previous
                    }
                  }

                  // Reset dragging state and timer after a brief delay
                  setTimeout(() => {
                    setIsDragging(false);
                    setTimerKey((prev) => prev + 1);
                  }, 100);
                }}
                className="absolute w-full h-full cursor-grab active:cursor-grabbing"
                onClick={() => setSelectedIndex(currentSlide)}
              >
                <img
                  src={getCloudinaryUrl(ITEMS[currentSlide].publicId, 1200)}
                  alt={`Portfolio ${ITEMS[currentSlide].id}`}
                  className="w-full h-full object-cover saturate-[0.4] sepia-[0.15] contrast-[1.05] blur-[0.5px]"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black via-black to-transparent z-10 pointer-events-none" />
        </section>
      ) : (
        // DESKTOP: Grid
        <section className="w-full min-h-screen bg-black px-4 pt-0 pb-0 relative">
          {/* Gradient fade at top */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />

          {/* Chaotic Grid - CSS Grid */}
          {/* Mobile: 1 col, Tablet: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[300px] md:auto-rows-[250px] lg:auto-rows-[200px] grid-flow-dense max-w-[90rem] mx-auto relative z-0">
            {ITEMS.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className={`relative group overflow-hidden rounded-sm cursor-pointer ${item.className}`}
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={getCloudinaryUrl(item.publicId, 600)}
                  alt={`Portfolio ${item.id}`}
                  className="w-full h-full object-cover saturate-[0.4] sepia-[0.15] contrast-[1.05] blur-[0.5px] group-hover:saturate-100 group-hover:sepia-0 group-hover:contrast-100 group-hover:blur-0 transition-all duration-700 ease-in-out scale-105 group-hover:scale-100"
                />
                {/* Film grain overlay */}
                <div
                  className="absolute inset-0 opacity-30 group-hover:opacity-0 transition-opacity duration-700 pointer-events-none mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* Gradient fade at bottom */}
          {/* Gradient fade at bottom - Larger and darker as requested */}
          <div className="absolute bottom-0 left-0 w-full h-36 bg-gradient-to-t from-black via-black to-transparent z-10 pointer-events-none" />
        </section>
      )}

      {/* Lightbox Modal - Portaled to body to escape z-index trap */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedIndex !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                onClick={closeLightbox}
              >
                {/* Close button */}
                <button
                  onClick={closeLightbox}
                  className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-[9999]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Previous arrow */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 md:left-8 text-white/60 hover:text-white transition-colors z-[9999] p-2"
                >
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
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                {/* Next arrow */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 md:right-8 text-white/60 hover:text-white transition-colors z-[9999] p-2"
                >
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
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>

                {/* Image */}
                <motion.img
                  key={selectedIndex}
                  src={getCloudinaryUrl(ITEMS[selectedIndex].publicId, 1200)}
                  alt={`Portfolio ${ITEMS[selectedIndex].id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Image counter */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">
                  {selectedIndex + 1} / {ITEMS.length}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
