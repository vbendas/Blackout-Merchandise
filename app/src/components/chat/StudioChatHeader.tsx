'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { GarmentStatus } from '@/types/chat';

interface StudioChatHeaderProps {
  garmentList: GarmentStatus[];
  onExit: () => void;
}

export function StudioChatHeader({ garmentList, onExit }: StudioChatHeaderProps) {
  const approvedCount = garmentList.filter((g) => g.status === 'approved').length;
  const inProgressCount = garmentList.filter((g) => g.status === 'in_progress').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl"
    >
      {/* Left: Francisca avatar + label */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
          <Icon icon="lucide:sparkles" className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Merch Studio</p>
          <p className="text-xs text-zinc-500">with Francisca</p>
        </div>
      </div>

      {/* Center: Progress */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20">
            <span className="text-[10px] font-medium text-purple-400">
              {approvedCount}
            </span>
          </div>
          <span className="text-xs text-zinc-400">
            of {garmentList.length} approved
          </span>
        </div>
        
        {inProgressCount > 0 && (
          <div className="flex items-center gap-1">
            <Icon icon="lucide:loader-2" className="h-3 w-3 animate-spin text-purple-400" />
            <span className="text-[10px] text-purple-400">{inProgressCount} in progress</span>
          </div>
        )}
      </div>

      {/* Right: Exit button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onExit}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label="Exit studio"
        title="Exit studio"
      >
        <Icon icon="lucide:arrow-right" className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
