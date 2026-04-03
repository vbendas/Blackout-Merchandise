'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { useChat } from '@/lib/ChatContext';
import { getAgentColor } from '@/lib/chat/agentDetection';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';

interface AssistantAvatarProps {
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
}

export function AssistantAvatar({ onClick, onHover }: AssistantAvatarProps) {
  const { currentAgent, unreadCount } = useChat();
  const { currentExpression } = useAvatarExpression();
  const [isHovered, setIsHovered] = useState(false);

  const agentColor = getAgentColor(currentAgent);
  const hasNotification = unreadCount > 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.95 }}
      className="relative"
      aria-label="Open assistant"
    >
      {/* Breathing animation ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${agentColor}40 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Notification pulse ring */}
      <AnimatePresence>
        {hasNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.6, 0],
              scale: [1, 1.5],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${agentColor}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Avatar container */}
      <motion.div
        animate={{
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
        className="relative h-24 w-24 md:h-32 md:w-32"
      >
        {/* Main avatar image - full image, no circular crop */}
        <img
          src={getCloudinaryUrl(currentAgent, currentExpression, 400)}
          alt={currentAgent}
          className="h-full w-full object-contain drop-shadow-2xl"
          style={{
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
          }}
        />
      </motion.div>

      {/* Notification badge */}
      <AnimatePresence>
        {hasNotification && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-lg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent indicator dot */}
      <div
        className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-zinc-950"
        style={{ backgroundColor: agentColor }}
      />
    </motion.button>
  );
}
