'use client';

import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useViewportSize } from '@/hooks/useViewportSize';

// Cloudinary configuration
const CLOUDINARY_CLOUD = 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

function getCloudinaryUrl(publicId: string, width: number = 600): string {
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

// Gallery items
const ITEMS = [
  { id: 1, publicId: '2024061019193023_xppfml', className: 'col-span-2 row-span-2' },
  { id: 2, publicId: '2024061511335904_xnxhyx', className: 'col-span-1 row-span-1' },
  { id: 3, publicId: '2024061611442076_eendu5', className: 'col-span-1 row-span-2' },
  { id: 4, publicId: '2024072522085784_wqhpz4', className: 'col-span-1 row-span-1' },
  { id: 5, publicId: 'PXL_20240104_185659523.RAW-01.COVER_cbnu86', className: 'col-span-1 row-span-1' },
  { id: 6, publicId: 'PXL_20240319_102040539.RAW-01.COVER_bsfp1u', className: 'col-span-1 row-span-2' },
  { id: 7, publicId: 'PXL_20240319_214226810.RAW-01.COVER_ipjods', className: 'col-span-2 row-span-2' },
  { id: 8, publicId: 'PXL_20240329_140404109.RAW-01.COVER_ciokct', className: 'col-span-1 row-span-2' },
  { id: 9, publicId: 'PXL_20240429_125545466.RAW-01.COVER_xqirln', className: 'col-span-1 row-span-1' },
  { id: 10, publicId: 'PXL_20240505_122820090.RAW-01.COVER_l0m1qc', className: 'col-span-1 row-span-2' },
  { id: 11, publicId: 'PXL_20240505_144131222.RAW-01.COVER_yyw0of', className: 'col-span-1 row-span-1' },
  { id: 12, publicId: 'PXL_20240608_133049372.RAW-01.COVER_heljk8', className: 'col-span-1 row-span-1' },
  { id: 13, publicId: 'PXL_20240610_165136658.RAW-01.COVER_xmpqk1', className: 'col-span-1 row-span-1' },
  { id: 14, publicId: 'PXL_20240612_000158545.RAW-01.COVER_tquwks', className: 'col-span-1 row-span-1' },
];

// Single grid tile component
function GridTile({ item }: { item: typeof ITEMS[0] }) {
  return (
    <div className={`relative overflow-hidden ${item.className}`}>
      <img
        src={getCloudinaryUrl(item.publicId, 600)}
        alt=""
        draggable={false}
        className="w-full h-full object-cover saturate-[0.65] sepia-[0.08] contrast-[1.05] hover:saturate-100 hover:sepia-0 hover:contrast-100 transition-all duration-700"
      />
      <div
        className="absolute inset-0 opacity-30 hover:opacity-0 transition-opacity duration-700 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// Single grid instance
function GridInstance() {
  return (
    <div className="grid grid-cols-4 gap-2 auto-rows-[200px] grid-flow-dense w-full h-full">
      {ITEMS.map((item) => (
        <GridTile key={item.id} item={item} />
      ))}
    </div>
  );
}

export default function MasonryGrid() {
  const [mounted, setMounted] = useState(false);
  const { isMobile, hasMounted } = useViewportSize();
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Grid cell dimensions for tiling
  const cellSize = 200; // matches auto-rows
  const cols = 4;
  const rows = Math.ceil(ITEMS.length / cols);
  const gridW = cols * cellSize + (cols - 1) * 8; // 8px gap
  const gridH = rows * cellSize + (rows - 1) * 8;

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Prevent native drag on all images
  useEffect(() => {
    const preventDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragstart', preventDrag);
    return () => document.removeEventListener('dragstart', preventDrag);
  }, []);

  if (!mounted || !hasMounted) return null;

  return (
    <>
      {isMobile ? (
        <section className="w-full bg-black py-12 -mt-[40px] relative">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black via-black to-transparent z-10 pointer-events-none" />
          <div className="grid grid-cols-2 gap-2 px-4">
            {ITEMS.map((item) => (
              <GridTile key={item.id} item={item} />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black via-black to-transparent z-10 pointer-events-none" />
        </section>
      ) : (
        <section
          ref={containerRef}
          className="w-full h-screen bg-black relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Gradient fade at top */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />

          {/* Draggable Canvas - tiled 3x3 for infinite loop */}
          <motion.div
            drag
            dragElastic={0}
            dragMomentum={true}
            dragTransition={{ bounceStiffness: 0, bounceDamping: 0 }}
            style={{ x, y }}
            className="absolute cursor-grab active:cursor-grabbing"
            // Position so center tile is visible
            initial={{
              left: -gridW,
              top: -gridH,
            }}
          >
            {/* 3x3 tiling of the grid for seamless infinite loop */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(3, ${gridW}px)`,
                gridTemplateRows: `repeat(3, ${gridH}px)`,
                gap: 0,
              }}
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ width: gridW, height: gridH }}>
                  <GridInstance />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-36 bg-gradient-to-t from-black via-black to-transparent z-10 pointer-events-none" />

          {/* Drag hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-700">
              drag to explore
            </span>
          </motion.div>
        </section>
      )}
    </>
  );
}
