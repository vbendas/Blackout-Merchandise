'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

export function GradualBlurBottom() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 200], [0, 1]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 z-40 w-full h-[100px] pointer-events-none"
      style={{ opacity }}
    >
      <div
        className="relative w-full h-full backdrop-blur-[1px] bg-black"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
        }}
      />
    </motion.div>
  );
}
