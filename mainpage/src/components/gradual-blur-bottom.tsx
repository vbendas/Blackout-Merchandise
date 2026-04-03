'use client';

import { motion } from 'framer-motion';

export function GradualBlurBottom() {
  return (
    <div className="fixed bottom-0 left-0 z-40 w-full h-[100px] pointer-events-none">
      <div
        className="relative w-full h-full backdrop-blur-[2px] bg-black"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
        }}
      />
    </div>
  );
}
