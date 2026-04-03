'use client';

import { motion } from 'framer-motion';

const brands = [
  'ATLAS',
  'NEXUS',
  'VERTEX',
  'OASIS',
  'ECHO',
  'PRISM',
  'QUANTUM',
  'HORIZON',
  'AETHER',
  'LUMINA',
  'ZENITH',
  'NOVA',
];

export function LogoCarousel() {
  return (
    <div className="w-full relative overflow-hidden py-10 mt-8">
      {/* Label */}
      <div className="text-center mb-8">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em]">Trusted by industry leaders</p>
      </div>

      {/* Marquee Container */}
      <div className="relative flex w-full overflow-hidden mask-linear-fade">
        {/* Gradient Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        {/* Moving Track - Infinite Loop */}
        {/* We render the branding list twice to ensure seamless looping */}
        <div className="flex">
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '-50%' }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="flex flex-shrink-0 gap-16 pr-16"
          >
            {[...brands, ...brands].map((brand, i) => (
              <span
                key={i}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 to-zinc-500 opacity-80 hover:opacity-100 transition-opacity uppercase tracking-tighter cursor-default select-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {brand}
              </span>
            ))}
          </motion.div>

          {/* Second track for safety if screen is super wide, though the first one is doubled already */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '-50%' }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="flex flex-shrink-0 gap-16 pr-16"
            aria-hidden="true"
          >
            {[...brands, ...brands].map((brand, i) => (
              <span
                key={`dup-${i}`}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 to-zinc-500 opacity-80 hover:opacity-100 transition-opacity uppercase tracking-tighter cursor-default select-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {brand}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
