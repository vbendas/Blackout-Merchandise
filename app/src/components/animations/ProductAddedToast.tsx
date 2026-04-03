'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';

interface ProductAddedToastProps {
  show: boolean;
  productName: string;
  onComplete: () => void;
}

/**
 * Toast notification shown when product is added to My Selection
 * Auto-dismisses after 2 seconds
 * Bottom-center position
 */
export function ProductAddedToast({ show, productName, onComplete }: ProductAddedToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[80] bg-emerald-500 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
            className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Check className="w-3 h-3" />
          </motion.div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="font-medium text-sm">{productName} added</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
