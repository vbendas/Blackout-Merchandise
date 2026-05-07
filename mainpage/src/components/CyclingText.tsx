'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const PHRASES = [
  'Your fans wear your art.',
  'Why dress them in garbage?',
];

const COLORS = ['#fafafa', '#71717a'];

export function CyclingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: 'clamp(120px, 18vw, 220px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <h1
            className="font-black uppercase tracking-tighter leading-[1.05] text-center"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6.5rem)',
              color: COLORS[index],
              maxWidth: '20ch',
            }}
          >
            {PHRASES[index]}
          </h1>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
