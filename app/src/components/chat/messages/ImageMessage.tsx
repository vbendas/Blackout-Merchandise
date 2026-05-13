'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageMessageProps {
  imageUrl: string;
  caption?: string;
}

export function ImageMessage({ imageUrl, caption }: ImageMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-[280px] overflow-hidden rounded-xl bg-zinc-900/80"
      >
        {!isLoaded && (
          <div className="aspect-square w-full animate-pulse bg-zinc-800" />
        )}
        
        <img
          src={imageUrl}
          alt={caption || 'Design'}
          className={`w-full cursor-pointer transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onClick={() => setIsExpanded(true)}
        />
        
        {isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white/80"
          >
            Tap to expand
          </motion.div>
        )}
      </motion.div>

      {/* Full-screen Lightbox */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setIsExpanded(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={imageUrl}
              alt={caption || 'Design'}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            <button
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition-colors hover:bg-white/20"
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
