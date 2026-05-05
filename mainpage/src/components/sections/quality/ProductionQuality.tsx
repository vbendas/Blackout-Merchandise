'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import ScrollBaseAnimation from '@/../components/uilayouts/scroll-text-marque';

const CLOUDINARY_CLOUD = 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;
function getCloudinaryUrl(publicId: string, width: number = 800): string {
  return `${CLOUDINARY_BASE}/f_auto,q_auto,w_${width}/${publicId}`;
}

// The "Messy Desk" Pile - Scattered Initial Positions
// DOUBLED ITEMS, Random Rotations, Messier Scatter
const POLAROID_ITEMS = [
  {
    id: 'card-1',
    type: 'machine',
    title: 'Anatol Volt M',
    note: 'All-Electric Beast',
    publicId: 'PXL_20240319_214226810.RAW-01.COVER_ipjods',
    rotation: -12,
    x: -80,
    y: 40,
    textRotation: -2,
  },
  {
    id: 'card-2',
    type: 'personality',
    title: 'Leopoldo',
    note: 'The Manager',
    publicId: 'PXL_20240104_185659523.RAW-01.COVER_cbnu86',
    rotation: 15,
    x: 120,
    y: -90,
    textRotation: 3,
  },
  {
    id: 'card-3',
    type: 'machine',
    title: 'Brother GTX PRO',
    note: 'Industrial Grade',
    publicId: '2024061019193023_xppfml',
    rotation: -8,
    x: -140,
    y: -30,
    textRotation: -1,
  },
  {
    id: 'card-4',
    type: 'material',
    title: 'Supplies',
    note: 'Magna Colours',
    publicId: 'PXL_20240505_122820090.RAW-01.COVER_l0m1qc',
    rotation: 6,
    x: 90,
    y: 110,
    textRotation: 2,
  },
  {
    id: 'card-5',
    type: 'material',
    title: 'Heavyweight Box',
    note: '400gsm Fleece',
    publicId: 'PXL_20240329_140404109.RAW-01.COVER_ciokct',
    rotation: -18,
    x: -40,
    y: 80,
    textRotation: -3,
  },
  // --- DUPLICATES / EXPANDED SET FOR "MESSY PILE" FEEL ---
  {
    id: 'card-6',
    type: 'process',
    title: 'Screen',
    note: 'Mesh Prep',
    publicId: 'PXL_20240319_214226810.RAW-01.COVER_ipjods', // Reusing image for demo
    rotation: 22,
    x: 180,
    y: 20,
    textRotation: 1,
  },
  {
    id: 'card-7',
    type: 'process',
    title: 'Curing',
    note: 'Tunnel Dryer',
    publicId: 'PXL_20240505_122820090.RAW-01.COVER_l0m1qc', // Reusing image
    rotation: -25,
    x: -180,
    y: -60,
    textRotation: -4,
  },
  {
    id: 'card-8',
    type: 'process',
    title: 'Vulture',
    note: 'Quality Control',
    publicId: '2024061019193023_xppfml', // Reusing image
    rotation: 5,
    x: -20,
    y: -120,
    textRotation: 0,
  },
];

export function ProductionQuality() {
  const [cards] = useState(POLAROID_ITEMS);

  // Manage Z-Index order. Key: Card ID, Value: Z-Index
  const [zIndices, setZIndices] = useState(() => {
    const initial: Record<string, number> = {};
    POLAROID_ITEMS.forEach((item, index) => {
      initial[item.id] = index;
    });
    return initial;
  });

  const bringToFront = (id: string) => {
    setZIndices((prev) => {
      const maxZ = Math.max(...Object.values(prev));
      if (prev[id] === maxZ) return prev; // Already on top
      return { ...prev, [id]: maxZ + 1 };
    });
  };

  return (
    <section
      className="relative z-30 bg-black py-0 overflow-hidden flex flex-col gap-0"
      style={{
        marginTop: '-110px',
        boxShadow: '0 0 50px 20px rgba(0,0,0,0.9)',
        zIndex: 20,
        // GPU acceleration to prevent flicker with fixed navbar
        willChange: 'transform',
        transform: 'translateZ(0)',
        isolation: 'isolate',
      }}
    >
      {/* Fade edges - REMOVED for full width video */}
      {/* <div className="absolute left-0 top-0 bottom-0 w-[35px] bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" /> */}
      {/* <div className="absolute right-0 top-0 bottom-0 w-[35px] bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none" /> */}

      {/* Top/Bottom Shadow Transition */}
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />

      <div className="flex flex-col gap-0 py-10 relative z-20 pointer-events-none">
        {/* Single Line Hook (The Scream - Straightened) */}
        <ScrollBaseAnimation
          baseVelocity={-0.2}
          clasname="font-black uppercase tracking-tighter leading-[0.85] text-[13vw]"
        >
          <div className="flex items-center gap-12 pr-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-12">
                {/* Outline Text */}
                <span className="text-transparent whitespace-nowrap" style={{ WebkitTextStroke: '2px #52525b' }}>
                  YOUR FANS WEAR YOUR ART.
                </span>

                {/* Solid Pop Text */}
                <span className="text-white whitespace-nowrap">WHY DRESS THEM IN GARBAGE?</span>
              </div>
            ))}
          </div>
        </ScrollBaseAnimation>
      </div>

      {/* The Messy Desk (Draggable Stack) */}
      <div className="relative w-full h-[700px] md:h-[650px] lg:h-[700px] flex items-center justify-center overflow-hidden cursor-crosshair">
        {/* Background Video Layer - CCTV/Workshop Vibe */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-60 filter grayscale sepia-[0.2] contrast-[1.1] brightness-[0.8] scale-105"
          >
            <source
              src="https://online.fliphtml5.com/spwkv/ysyv/files/pageConfig/a2c8ddc1700e238dae50abc1a51146f3_1748608256058.mp4"
              type="video/mp4"
            />
          </video>
          {/* Dark overlay to ensure text readability if needed, though cards are opaque */}
          <div className="absolute inset-0 bg-black/20" />
          {/* Grain/Scanline Texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>

        {/* Top Inner Shadow (Tunnel Ledge) - z-20 to sit ON TOP of cards */}
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black via-black/80 to-transparent z-20 pointer-events-none" />

        {/* Tablet: scaled down to fit 8 cards without overflow */}
        <div className="relative w-full max-w-[1000px] h-[600px] flex items-center justify-center perspective-1000 z-10
          -translate-x-2 scale-[0.72] md:scale-[0.85] lg:scale-100">
          {cards.map((item) => (
            <Card key={item.id} item={item} zIndex={zIndices[item.id]} onInteract={() => bringToFront(item.id)} />
          ))}
        </div>

        {/* Bottom Inner Shadow - z-20 to sit ON TOP of cards */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />

        {/* Drag hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="text-zinc-600 text-xs uppercase tracking-widest text-center mt-4 relative z-10"
        >
          Drag to explore
        </motion.p>
      </div>
    </section>
  );
}

function Card({ item, zIndex, onInteract }: { item: any; zIndex: number; onInteract: () => void }) {
  return (
    <motion.div
      style={{
        zIndex: zIndex,
        // Initial Scatter Position
        x: item.x,
        y: item.y,
        // GPU Acceleration to prevent flickering
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
      drag
      dragMomentum={false} // Stops immediately on release (stick where thrown)
      onDragStart={onInteract} // Bring to front
      onTapStart={onInteract} // Bring to front on click
      whileDrag={{ scale: 1.05, rotate: 0, cursor: 'grabbing' }}
      initial={{ scale: 0.9, opacity: 0, rotate: item.rotation }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: item.rotation,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      // Tablet-optimized sizes: 260x220 → 280x240 → 320x260
      className="absolute rounded-sm w-[260px] h-[220px] md:w-[280px] md:h-[240px] lg:w-[320px] lg:h-[260px] bg-[#e6e6e6] p-3 pb-10 shadow-2xl origin-center cursor-grab active:cursor-grabbing border border-zinc-900/10"
    >
      {/* Polaroid Photo Area */}
      {/* Polaroid Photo Area */}
      <div className="w-full h-[82%] bg-zinc-900 overflow-hidden relative mb-2 shadow-inner pointer-events-none">
        <img
          src={getCloudinaryUrl(item.publicId, 600)}
          alt={item.title}
          // Aggressive Analog Filters: Visible Blur, High Sepia, Slightly More Saturated
          className="w-full h-full object-cover filter contrast-[1.25] saturate-[0.75] sepia-[0.4] blur-[0.8px] brightness-[0.85]"
          draggable={false}
        />

        {/* Dust/Scratch Overlay - 60% Opacity + Mix Blend Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-60 mix-blend-overlay" />

        {/* Gloss Reflection Gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>

      {/* Handwritten Note - Blue Pen */}
      {/* Centered Vertically in the white space */}
      <div className="absolute bottom-0 left-0 w-full h-[18%] flex justify-center items-center pointer-events-none pb-5 md:pb-8">
        <div
          className="font-caveat text-2xl md:text-3xl text-[#000099] font-bold leading-none opacity-90"
          style={{
            transform: `rotate(${item.textRotation}deg)`,
          }}
        >
          {item.note}
        </div>
      </div>
    </motion.div>
  );
}
