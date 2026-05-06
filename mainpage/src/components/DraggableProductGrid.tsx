'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';

// Product data - asymmetrically distributed
const PRODUCTS = [
  { id: 1, src: '/portfolio/hoodie.png', label: 'Artist A', x: 0, y: 0, w: 280, h: 350, col: 0 },
  { id: 2, src: '/portfolio/tee.png', label: 'Studio B', x: 320, y: -80, w: 220, h: 280, col: 1 },
  { id: 3, src: '/portfolio/cap.png', label: 'Brand C', x: 580, y: 40, w: 180, h: 200, col: 2 },
  { id: 4, src: '/portfolio/tote.png', label: 'Label D', x: 100, y: 380, w: 240, h: 300, col: 0 },
  { id: 5, src: '/portfolio/hoodie.png', label: 'Artist E', x: 400, y: 320, w: 260, h: 320, col: 1 },
  { id: 6, src: '/portfolio/tee.png', label: 'Studio F', x: 700, y: 280, w: 200, h: 260, col: 2 },
  { id: 7, src: '/portfolio/cap.png', label: 'Brand G', x: -100, y: 650, w: 190, h: 210, col: 0 },
  { id: 8, src: '/portfolio/tote.png', label: 'Label H', x: 250, y: 700, w: 230, h: 290, col: 1 },
  { id: 9, src: '/portfolio/hoodie.png', label: 'Artist I', x: 550, y: 600, w: 270, h: 340, col: 2 },
  { id: 10, src: '/portfolio/tee.png', label: 'Studio J', x: 850, y: 500, w: 210, h: 270, col: 0 },
  { id: 11, src: '/portfolio/cap.png', label: 'Brand K', x: 150, y: 1000, w: 180, h: 200, col: 1 },
  { id: 12, src: '/portfolio/tote.png', label: 'Label L', x: 450, y: 950, w: 250, h: 310, col: 2 },
];

// Column rotation multipliers (each column rotates differently)
const COL_ROTATION = [0.02, -0.015, 0.025];

export function DraggableProductGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Motion values for the canvas position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Track velocity for rotation
  const dragVelocityX = useMotionValue(0);
  const dragVelocityY = useMotionValue(0);

  // Spring-smoothed rotation values per column
  const col0Rotate = useSpring(0, { stiffness: 100, damping: 30 });
  const col1Rotate = useSpring(0, { stiffness: 100, damping: 30 });
  const col2Rotate = useSpring(0, { stiffness: 100, damping: 30 });

  const columnRotations = [col0Rotate, col1Rotate, col2Rotate];

  // Update rotation based on drag velocity
  const handleDrag = useCallback(() => {
    const vx = dragVelocityX.get();
    const vy = dragVelocityY.get();

    // Apply rotation based on horizontal velocity
    columnRotations.forEach((rotation, i) => {
      const target = vx * COL_ROTATION[i] * 0.1;
      rotation.set(target);
    });
  }, [columnRotations, dragVelocityX, dragVelocityY]);

  // Reset rotation when drag ends
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    columnRotations.forEach((rotation) => {
      rotation.set(0);
    });
  }, [columnRotations]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Draggable Canvas */}
      <motion.div
        drag
        dragConstraints={{ left: -800, right: 800, top: -600, bottom: 600 }}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 100, bounceDamping: 20 }}
        style={{ x, y }}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="absolute inset-0"
      >
        {/* Product Cards */}
        {PRODUCTS.map((product) => {
          const columnRotation = columnRotations[product.col];

          return (
            <motion.div
              key={product.id}
              className="absolute group"
              style={{
                left: `calc(50% + ${product.x}px)`,
                top: `calc(50% + ${product.y}px)`,
                width: product.w,
                height: product.h,
                rotate: columnRotation,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: product.id * 0.1 }}
              onHoverStart={() => setHoveredId(product.id)}
              onHoverEnd={() => setHoveredId(null)}
            >
              {/* Card Container */}
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                {/* Product Image */}
                <img
                  src={product.src}
                  alt={product.label}
                  className={`w-full h-full object-contain p-4 transition-all duration-500 ${
                    hoveredId === product.id
                      ? 'saturate-100 scale-105'
                      : 'saturate-0 opacity-70'
                  }`}
                  draggable={false}
                />

                {/* Label - tiny, mysterious */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    .{product.label.toLowerCase().replace(' ', '')}
                  </span>
                </div>

                {/* Hover glow */}
                {hoveredId === product.id && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Drag hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
          ← drag to explore →
        </span>
      </motion.div>

      {/* Gradient fades */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
    </div>
  );
}
