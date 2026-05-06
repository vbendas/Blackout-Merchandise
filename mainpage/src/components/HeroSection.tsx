'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { SocialProof } from '@/components/SocialProof';
import { DraggableProductGrid } from '@/components/DraggableProductGrid';
import { useRef, useState, useEffect, useCallback } from 'react';

// Tightly packed product tiles
const TILES = [
  { id: 1, src: '/portfolio/hoodie.png', label: '.artista', col: 0, row: 0, colSpan: 2, rowSpan: 2 },
  { id: 2, src: '/portfolio/tee.png', label: '.studiob', col: 2, row: 0, colSpan: 1, rowSpan: 1 },
  { id: 3, src: '/portfolio/cap.png', label: '.brandc', col: 3, row: 0, colSpan: 1, rowSpan: 1 },
  { id: 4, src: '/portfolio/tote.png', label: '.labeld', col: 2, row: 1, colSpan: 2, rowSpan: 1 },
  { id: 5, src: '/portfolio/hoodie.png', label: '.artiste', col: 0, row: 2, colSpan: 1, rowSpan: 2 },
  { id: 6, src: '/portfolio/tee.png', label: '.studiof', col: 1, row: 2, colSpan: 1, rowSpan: 1 },
  { id: 7, src: '/portfolio/cap.png', label: '.brandg', col: 2, row: 2, colSpan: 2, rowSpan: 1 },
  { id: 8, src: '/portfolio/tote.png', label: '.labelh', col: 1, row: 3, colSpan: 2, rowSpan: 1 },
  { id: 9, src: '/portfolio/hoodie.png', label: '.artisti', col: 3, row: 2, colSpan: 1, rowSpan: 2 },
  { id: 10, src: '/portfolio/tee.png', label: '.studioj', col: 0, row: 4, colSpan: 2, rowSpan: 1 },
  { id: 11, src: '/portfolio/cap.png', label: '.brandk', col: 2, row: 4, colSpan: 1, rowSpan: 1 },
  { id: 12, src: '/portfolio/tote.png', label: '.labell', col: 3, row: 4, colSpan: 1, rowSpan: 1 },
  { id: 13, src: '/portfolio/hoodie.png', label: '.artistm', col: 0, row: 5, colSpan: 1, rowSpan: 1 },
  { id: 14, src: '/portfolio/tee.png', label: '.studion', col: 1, row: 5, colSpan: 2, rowSpan: 1 },
  { id: 15, src: '/portfolio/cap.png', label: '.brando', col: 3, row: 5, colSpan: 1, rowSpan: 1 },
  { id: 16, src: '/portfolio/tote.png', label: '.labelp', col: 0, row: 6, colSpan: 2, rowSpan: 1 },
  { id: 17, src: '/portfolio/hoodie.png', label: '.artistq', col: 2, row: 6, colSpan: 2, rowSpan: 2 },
  { id: 18, src: '/portfolio/tee.png', label: '.studior', col: 0, row: 7, colSpan: 1, rowSpan: 1 },
  { id: 19, src: '/portfolio/cap.png', label: '.brands', col: 1, row: 7, colSpan: 1, rowSpan: 1 },
];

const COL_ROTATION = [0.03, -0.02, 0.025, -0.015];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(true);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const col0 = useSpring(0, { stiffness: 120, damping: 25 });
  const col1 = useSpring(0, { stiffness: 120, damping: 25 });
  const col2 = useSpring(0, { stiffness: 120, damping: 25 });
  const col3 = useSpring(0, { stiffness: 120, damping: 25 });
  const columnRotations = [col0, col1, col2, col3];

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const cols = isMobile ? 2 : isTablet ? 3 : 4;
  const cellW = isMobile ? 160 : isTablet ? 220 : 280;
  const cellH = isMobile ? 160 : isTablet ? 220 : 280;

  const gridWidth = cols * cellW;
  const gridRows = Math.ceil(TILES.length / cols);
  const gridHeight = gridRows * cellH;

  const maxDragX = Math.max(0, (gridWidth - (typeof window !== 'undefined' ? window.innerWidth : 1200)) / 2 + 100);
  const maxDragY = Math.max(0, (gridHeight - (typeof window !== 'undefined' ? window.innerHeight : 800)) / 2 + 100);

  // Wheel handler - consume scroll to move grid
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!scrollLocked) return;

      const currentX = x.get();
      const currentY = y.get();

      const atBoundaryY = Math.abs(currentY) >= maxDragY - 20;
      const atBoundaryX = Math.abs(currentX) >= maxDragX - 20;

      // If scrolling down and at bottom boundary, unlock scroll
      if (e.deltaY > 0 && atBoundaryY) {
        setScrollLocked(false);
        return;
      }

      // If scrolling up and at top boundary, unlock scroll
      if (e.deltaY < 0 && atBoundaryY) {
        setScrollLocked(false);
        return;
      }

      e.preventDefault();

      const newX = Math.max(-maxDragX, Math.min(maxDragX, currentX - e.deltaX * 0.5));
      const newY = Math.max(-maxDragY, Math.min(maxDragY, currentY - e.deltaY * 0.5));

      x.set(newX);
      y.set(newY);

      const vx = -e.deltaX * 0.5;
      columnRotations.forEach((rot, i) => {
        rot.set(vx * COL_ROTATION[i] * 0.1);
      });

      setTimeout(() => {
        columnRotations.forEach((rot) => rot.set(0));
      }, 150);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scrollLocked, x, y, maxDragX, maxDragY, columnRotations]);

  // Re-lock when scrolling back to top
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 50) {
        setScrollLocked(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrag = useCallback(() => {
    const vx = x.getVelocity();
    columnRotations.forEach((rot, i) => {
      rot.set(vx * COL_ROTATION[i] * 0.05);
    });
  }, [columnRotations, x]);

  const handleDragEnd = useCallback(() => {
    columnRotations.forEach((rot) => rot.set(0));
  }, [columnRotations]);

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative h-screen overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Social Proof */}
      <div className="absolute top-[122px] md:top-[100px] lg:top-[122px] left-0 w-full z-[55] pointer-events-none hidden md:block">
        <div className="max-w-7xl mx-auto px-6">
          <div className="pointer-events-auto inline-block scale-90 md:scale-85 lg:scale-90 origin-left">
            <SocialProof />
          </div>
        </div>
      </div>

      <div className="absolute top-[110px] max-[389px]:top-[75px] left-1/2 -translate-x-1/2 z-[55] md:hidden scale-90 opacity-90 pointer-events-auto w-full flex justify-center">
        <SocialProof />
      </div>

      {/* Draggable Canvas */}
      <motion.div
        drag
        dragConstraints={{
          left: -maxDragX,
          right: maxDragX,
          top: -maxDragY,
          bottom: maxDragY,
        }}
        dragElastic={0.05}
        dragTransition={{ bounceStiffness: 100, bounceDamping: 25 }}
        style={{ x, y }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="absolute left-1/2 top-1/2 cursor-grab active:cursor-grabbing"
        initial={{ x: '-50%', y: '-50%' }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
            gridAutoRows: `${cellH}px`,
            gap: '2px',
          }}
        >
          {TILES.map((tile) => {
            const rotation = columnRotations[tile.col % 4];

            return (
              <motion.div
                key={tile.id}
                className="relative overflow-hidden bg-zinc-900"
                style={{
                  gridColumn: `${tile.col + 1} / span ${Math.min(tile.colSpan, cols)}`,
                  gridRow: `${tile.row + 1} / span ${tile.rowSpan}`,
                  rotate: rotation,
                }}
                onHoverStart={() => setHoveredId(tile.id)}
                onHoverEnd={() => setHoveredId(null)}
              >
                <img
                  src={tile.src}
                  alt={tile.label}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    hoveredId === tile.id ? 'saturate-100 scale-105' : 'saturate-0 opacity-80'
                  }`}
                  draggable={false}
                />
                <div className="absolute bottom-2 left-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                    {tile.label}
                  </span>
                </div>
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/30 to-transparent transition-opacity duration-300 ${
                    hoveredId === tile.id ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Small headline overlay */}
      <motion.div
        className="absolute bottom-24 left-8 md:left-16 z-20 pointer-events-none"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-light text-zinc-400 tracking-tight leading-tight">
          <span className="text-white font-medium">Premium merchandise</span>
          <br />
          for artists who care
        </h1>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="absolute bottom-24 right-8 md:right-16 z-20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.7 }}
      >
        <a
          href="/waitlist"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
          }}
        >
          Join Waitlist
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollLocked ? 1 : 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-700">
          scroll or drag to explore
        </span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Edge fades */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-black to-transparent" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-black to-transparent" />
      </div>
    </section>
  );
}
