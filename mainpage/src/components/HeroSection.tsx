'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { SocialProof } from '@/components/SocialProof';
import { useRef, useState, useEffect, useCallback } from 'react';

// Tiles with percentage-based positions for full coverage
// Positions are in % of canvas size, sizes are in vw/vh
const TILES = [
  { id: 1, src: '/portfolio/hoodie.png', label: '.artista', left: 0, top: 0, width: 30, height: 40 },
  { id: 2, src: '/portfolio/tee.png', label: '.studiob', left: 30, top: 0, width: 20, height: 25 },
  { id: 3, src: '/portfolio/cap.png', label: '.brandc', left: 50, top: 0, width: 25, height: 30 },
  { id: 4, src: '/portfolio/tote.png', label: '.labeld', left: 75, top: 0, width: 25, height: 35 },
  { id: 5, src: '/portfolio/hoodie.png', label: '.artiste', left: 0, top: 40, width: 20, height: 30 },
  { id: 6, src: '/portfolio/tee.png', label: '.studiof', left: 20, top: 25, width: 30, height: 35 },
  { id: 7, src: '/portfolio/cap.png', label: '.brandg', left: 50, top: 30, width: 25, height: 25 },
  { id: 8, src: '/portfolio/tote.png', label: '.labelh', left: 75, top: 35, width: 25, height: 30 },
  { id: 9, src: '/portfolio/hoodie.png', label: '.artisti', left: 0, top: 70, width: 35, height: 30 },
  { id: 10, src: '/portfolio/tee.png', label: '.studioj', left: 35, top: 60, width: 30, height: 25 },
  { id: 11, src: '/portfolio/cap.png', label: '.brandk', left: 65, top: 65, width: 20, height: 20 },
  { id: 12, src: '/portfolio/tote.png', label: '.labell', left: 85, top: 60, width: 15, height: 25 },
  { id: 13, src: '/portfolio/hoodie.png', label: '.artistm', left: 10, top: 85, width: 25, height: 15 },
  { id: 14, src: '/portfolio/tee.png', label: '.studion', left: 40, top: 85, width: 30, height: 15 },
  { id: 15, src: '/portfolio/cap.png', label: '.brando', left: 75, top: 85, width: 25, height: 15 },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Canvas position
  const canvasX = useMotionValue(0);
  const canvasY = useMotionValue(0);

  // Rotation springs for each "column" (left, center, right)
  const rotLeft = useSpring(0, { stiffness: 120, damping: 25 });
  const rotCenter = useSpring(0, { stiffness: 120, damping: 25 });
  const rotRight = useSpring(0, { stiffness: 120, damping: 25 });

  // Canvas size (larger than viewport for drag room)
  const canvasWidth = typeof window !== 'undefined' ? window.innerWidth * 1.5 : 1800;
  const canvasHeight = typeof window !== 'undefined' ? window.innerHeight * 1.5 : 1200;

  // Max drag distance
  const maxDragX = (canvasWidth - (typeof window !== 'undefined' ? window.innerWidth : 1200)) / 2;
  const maxDragY = (canvasHeight - (typeof window !== 'undefined' ? window.innerHeight : 800)) / 2;

  // Scroll capture
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentX = canvasX.get();
      const currentY = canvasY.get();

      // Move canvas based on scroll
      const newX = Math.max(-maxDragX, Math.min(maxDragX, currentX - e.deltaX * 0.8));
      const newY = Math.max(-maxDragY, Math.min(maxDragY, currentY - e.deltaY * 0.8));

      canvasX.set(newX);
      canvasY.set(newY);

      // Apply rotation based on horizontal movement
      const vx = -e.deltaX * 0.8;
      rotLeft.set(vx * 0.02);
      rotCenter.set(vx * -0.015);
      rotRight.set(vx * 0.025);

      // Reset rotation
      setTimeout(() => {
        rotLeft.set(0);
        rotCenter.set(0);
        rotRight.set(0);
      }, 200);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [canvasX, canvasY, maxDragX, maxDragY, rotLeft, rotCenter, rotRight]);

  // Drag handlers
  const handleDrag = useCallback(() => {
    const vx = canvasX.getVelocity();
    rotLeft.set(vx * 0.01);
    rotCenter.set(vx * -0.008);
    rotRight.set(vx * 0.012);
  }, [canvasX, rotLeft, rotCenter, rotRight]);

  const handleDragEnd = useCallback(() => {
    rotLeft.set(0);
    rotCenter.set(0);
    rotRight.set(0);
  }, [rotLeft, rotCenter, rotRight]);

  // Get rotation for tile based on horizontal position
  const getRotation = (leftPercent: number) => {
    if (leftPercent < 33) return rotLeft;
    if (leftPercent < 66) return rotCenter;
    return rotRight;
  };

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
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
        style={{
          x: canvasX,
          y: canvasY,
          width: canvasWidth,
          height: canvasHeight,
        }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="absolute cursor-grab active:cursor-grabbing"
        initial={{
          left: -(canvasWidth - (typeof window !== 'undefined' ? window.innerWidth : 1200)) / 2,
          top: -(canvasHeight - (typeof window !== 'undefined' ? window.innerHeight : 800)) / 2,
        }}
      >
        {/* Tiles - absolutely positioned */}
        {TILES.map((tile) => {
          const rotation = getRotation(tile.left);

          return (
            <motion.div
              key={tile.id}
              className="absolute overflow-hidden"
              style={{
                left: `${tile.left}%`,
                top: `${tile.top}%`,
                width: `${tile.width}%`,
                height: `${tile.height}%`,
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
        animate={{ opacity: 1 }}
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
