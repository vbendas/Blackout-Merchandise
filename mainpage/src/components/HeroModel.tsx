'use client';

import { motion } from 'framer-motion';

// ── Component ───────────────────────────────────────────────────────

interface HeroModelProps {
  modelSrc?: string;
}

export function HeroModel({ modelSrc = '/model.png' }: HeroModelProps) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-[70vh] select-none pointer-events-none"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Slow float */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="relative h-full"
      >
        {/* Model image — sepia/analog treatment, anchored to bottom */}
        <div
          className="relative h-full"
          style={{
            filter: 'sepia(0.18) contrast(1.08) saturate(0.9) brightness(0.96)',
          }}
        >
          <img
            src={modelSrc}
            alt="MerchFrom Model"
            className="h-full w-auto object-contain object-bottom"
            draggable={false}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
