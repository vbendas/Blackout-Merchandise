'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { useChat } from '@/lib/ChatContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import { ChatContainer } from './ChatContainer';

// Agent colors
const AGENT_COLORS = {
  Leopoldo: '#F59E0B',
  Francisca: '#A855F7',
  Antônia: '#3B82F6',
};

export function FloatingChat() {
  const { isOpen, toggleChat, currentAgent, unreadCount } = useChat();
  const { currentExpression } = useAvatarExpression();
  const [isPulsing, setIsPulsing] = useState(false);

  // Keyboard shortcut - Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat();
      }
    },
    [isOpen, toggleChat]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Pulse animation when new unread messages arrive
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, isOpen]);

  const agentColor = AGENT_COLORS[currentAgent];

  return (
    <>
      {/* Click outside to close - backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55]"
            onClick={toggleChat}
            aria-label="Close chat"
          />
        )}
      </AnimatePresence>

      {/* Minimized Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-[60] flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-shadow hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-zinc-950"
            style={{
              backgroundColor: agentColor,
              boxShadow: `0 0 40px ${agentColor}40`,
            }}
            aria-label="Open chat"
          >
            {/* Avatar Image */}
            <motion.div
              className="relative h-14 w-14 overflow-hidden rounded-full"
              animate={
                isPulsing
                  ? {
                      boxShadow: [`0 0 0 0 ${agentColor}40`, `0 0 0 15px ${agentColor}00`, `0 0 0 0 ${agentColor}40`],
                    }
                  : {}
              }
              transition={{ duration: 1.5, repeat: isPulsing ? Infinity : 0 }}
            >
              <img
                src={getCloudinaryUrl(currentAgent, currentExpression, 200)}
                alt={currentAgent}
                className="h-full w-full object-cover"
              />
            </motion.div>

            {/* Notification Badge */}
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}

            {/* Breathing animation ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${agentColor}` }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[58] flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl md:max-w-[380px] md:w-[380px] md:h-[600px] max-h-[calc(100vh-100px)] max-w-[calc(100vw-32px)] w-[calc(100vw-32px)] h-[calc(100vh-100px)]"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <ChatContainer mode="floating" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
