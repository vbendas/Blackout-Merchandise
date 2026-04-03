'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { useChat } from '@/lib/ChatContext';
import { getAgentColor } from '@/lib/chat/agentDetection';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';

interface ChatHeaderProps {
  onClose?: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  const { currentAgent } = useChat();
  const { currentExpression } = useAvatarExpression();

  const agentColor = getAgentColor(currentAgent);

  return (
    <div
      className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 transition-colors duration-300"
      style={{ backgroundColor: `${agentColor}20` }}
    >
      {/* Left side - Agent info */}
      <div className="flex items-center gap-3">
        {/* Agent Avatar */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAgent}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="h-10 w-10 overflow-hidden rounded-full border-2"
              style={{ borderColor: agentColor }}
            >
              <img
                src={getCloudinaryUrl(currentAgent, currentExpression, 200)}
                alt={currentAgent}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Online indicator */}
          <div
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900"
            style={{ backgroundColor: agentColor }}
          />
        </div>

        {/* Agent name and role */}
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentAgent}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-white"
            >
              {currentAgent}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-zinc-400 transition-colors duration-300">AI Assistant</span>
        </div>
      </div>

      {/* Right side - Close button only */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Close chat"
        >
          <Icon icon="lucide:x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
