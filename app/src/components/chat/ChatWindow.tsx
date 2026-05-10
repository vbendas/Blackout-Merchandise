'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CHAT_CONFIG } from '@/lib/chat/config';

interface ChatWindowProps {
  isOpen: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isStudio: boolean;
  children: React.ReactNode;
  chatWindowRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({
  isOpen,
  isMobile,
  isTablet,
  isDesktop,
  isStudio,
  children,
  chatWindowRef,
}: ChatWindowProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={chatWindowRef}
          initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`z-[100] flex flex-col overflow-hidden border border-white/10 bg-zinc-950/95 backdrop-blur-2xl ${
            (isMobile || isTablet)
              ? 'fixed inset-x-4 top-4 w-[calc(100%-32px)] h-[calc(100vh-148px)] rounded-3xl'
              : isStudio
                ? 'fixed right-0 top-0 bottom-0 rounded-none border-r-0 border-y-0'
                : 'fixed bottom-[165px] right-6 rounded-3xl'
          }`}
          style={
            isDesktop
              ? isStudio
                ? {
                    width: `${CHAT_CONFIG.ui.studioWidth}px`,
                    maxWidth: 'calc(100vw - 48px)',
                    height: '100vh',
                    top: 0,
                    right: 0,
                    borderRadius: 0,
                  }
                : {
                    width: `${CHAT_CONFIG.ui.desktopWidth}px`,
                    maxWidth: 'calc(100vw - 48px)',
                    height: 'auto',
                    minHeight: '400px',
                    maxHeight: 'calc(100vh - 165px)',
                  }
              : {
                  width: 'calc(100% - 32px)',
                  height: 'auto',
                  maxHeight: 'calc(100dvh - 173px)',
                  borderRadius: '1.5rem',
                }
          }
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
