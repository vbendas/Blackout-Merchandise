'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';

// Tightly packed product tiles - no gaps, masonry-style
// Each tile has varied aspect ratios for visual chaos
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
  // Extra row for more coverage
  { id: 13, src: '/portfolio/hoodie.png', label: '.artistm', col: 0, row: 5, colSpan: 1, rowSpan: 1 },
  { id: 14, src: '/portfolio/tee.png', label: '.studion', col: 1, row: 5, colSpan: 2, rowSpan: 1 },
  { id: 15, src: '/portfolio/cap.png', label: '.brando', col: 3, row: 5, colSpan: 1, rowSpan: 1 },
];

// Column rotation multipliers
const COL_ROTATION = [0.03, -0.02, 0.025, -0.015];

export function DraggableProductGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring-smoothed rotation per column
  const col0 = useSpring(0, { stiffness: 120, damping: 25 });
  const col1 = useSpring(0, { stiffness: 120, damping: 25 });
  const col2 = useSpring(0, { stiffness: 120, damping: 25 });
  const col3 = useSpring(0, { stiffness: 120, damping: 25 });
  const columnRotations = [col0, col1, col2, col3];

  const handleDrag = useCallback(() => {
    const vx = x.getVelocity();
    columnRotations.forEach((rot, i) => {
      rot.set(vx * COL_ROTATION[i] * 0.05);
    });
  }, [columnRotations, x]);

  const handleDragEnd = useCallback(() => {
    columnRotations.forEach((rot) => rot.set(0));
  }, [columnRotations]);

  // Grid config
  const cols = 4;
  const cellW = 280; // base cell width
  const cellH = 280; // base cell height

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Draggable Canvas */}
      <motion.div
        drag
        dragConstraints={{ left: -600, right: 600, top: -400, bottom: 400 }}
        dragElastic={0.08}
        dragTransition={{ bounceStiffness: 100, bounceDamping: 25 }}
        style={{ x, y }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="absolute"
        // Center the grid initially, offset so it fills the screen
        initial={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
      >
        {/* CSS Grid - no gaps, tightly packed */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
            gridAutoRows: `${cellH}px`,
            gap: '2px', // minimal hairline gap like Nicola Romei's 0.2vw margin
          }}
        >
          {TILES.map((tile) => {
            const rotation = columnRotations[tile.col % 4];

            return (
              <motion.div
                key={tile.id}
                className="relative overflow-hidden bg-zinc-900"
                style={{
                  gridColumn: `${tile.col + 1} / span ${tile.colSpan}`,
                  gridRow: `${tile.row + 1} / span ${tile.rowSpan}`,
                  rotate: rotation,
                }}
                onHoverStart={() => setHoveredId(tile.id)}
                onHoverEnd={() => setHoveredId(null)}
              >
                {/* Product Image - fills entire tile */}
                <img
                  src={tile.src}
                  alt={tile.label}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    hoveredId === tile.id
                      ? 'saturate-100 scale-105'
                      : 'saturate-0 opacity-80'
                  }`}
                  draggable={false}
                />

                {/* Tiny label - bottom corner */}
                <div className="absolute bottom-2 left-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    {tile.label}
                  </span>
                </div>

                {/* Hover overlay */}
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

      {/* Drag hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-700">
          drag to explore
        </span>
      </motion.div>

      {/* Edge fades */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-black to-transparent" />
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-black to-transparent" />
      </div>
    </div>
  );
}
