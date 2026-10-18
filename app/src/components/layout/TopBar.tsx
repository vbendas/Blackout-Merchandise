'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface TopBarProps {
  onHistoryClick?: () => void;
  onListClick?: () => void;
  onNotificationsClick?: () => void;
  notificationCount?: number;
}

export function TopBar({ onHistoryClick, onListClick, onNotificationsClick, notificationCount = 0 }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur-sm md:h-16 md:px-6">
      {/* Left side - Empty space for balance */}
      <div className="w-20 md:w-32" />

      {/* Center - Logo */}
      <div className="flex flex-1 justify-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-8 w-28 md:h-9 md:w-32"
        >
          <Image src="/logo/short.png" alt="Blackout Merchandise" fill className="object-contain" priority />
        </motion.div>
      </div>

      {/* Right side - Action icons */}
      <div className="flex w-20 items-center justify-end gap-1 md:w-32 md:gap-2">
        {/* Session History */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onHistoryClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white md:h-11 md:w-11"
          aria-label="Session history"
        >
          <Icon icon="lucide:history" className="h-5 w-5 md:h-6 md:w-6" />
        </motion.button>

        {/* My List */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onListClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white md:h-11 md:w-11"
          aria-label="My list"
        >
          <Icon icon="lucide:bookmark" className="h-5 w-5 md:h-6 md:w-6" />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNotificationsClick}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white md:h-11 md:w-11"
          aria-label="Notifications"
        >
          <Icon icon="lucide:bell" className="h-5 w-5 md:h-6 md:w-6" />

          {/* Notification badge */}
          {notificationCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </motion.span>
          )}
        </motion.button>
      </div>
    </header>
  );
}
