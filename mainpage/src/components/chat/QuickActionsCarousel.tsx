'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuickAction } from '@/lib/chat/quickActions';

interface QuickActionsCarouselProps {
  actions: QuickAction[];
  onAction: (action: string) => void;
}

export function QuickActionsCarousel({ actions, onAction }: QuickActionsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll, actions]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 200;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  if (actions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-3 flex items-center gap-1"
      >
        {/* Left Arrow */}
        <motion.button
          initial={false}
          animate={{ opacity: canScrollLeft ? 1 : 0, width: canScrollLeft ? 24 : 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => scroll('left')}
          className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-0"
          style={{ height: 24 }}
          aria-label="Scroll left"
        >
          <Icon icon="lucide:chevron-left" className="h-3.5 w-3.5" />
        </motion.button>

        {/* Scrollable Pills */}
        <div
          ref={scrollRef}
          className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto pb-1"
          style={{ touchAction: 'pan-x' }}
        >
          {actions.map((action) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction(action.action)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:bg-zinc-700/60 hover:text-white"
            >
              <Icon icon={action.icon} className="h-3 w-3" />
              {action.label}
            </motion.button>
          ))}
        </div>

        {/* Right Arrow */}
        <motion.button
          initial={false}
          animate={{ opacity: canScrollRight ? 1 : 0, width: canScrollRight ? 24 : 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => scroll('right')}
          className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-0"
          style={{ height: 24 }}
          aria-label="Scroll right"
        >
          <Icon icon="lucide:chevron-right" className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
