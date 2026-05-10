'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface ChatHeaderProps {
  agentName: string;
  isVoiceConversationActive: boolean;
  onToggleVoiceConversation: () => void;
  onCollapse?: () => void;
  onClose: () => void;
  isStudio: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

export function ChatHeader({
  agentName,
  isVoiceConversationActive,
  onToggleVoiceConversation,
  onCollapse,
  onClose,
  isStudio,
  isMobile,
  isTablet,
}: ChatHeaderProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center border-b border-white/10 ${
        isMobile ? 'px-4 py-3' : isTablet ? 'px-6 py-5' : 'px-5 py-4'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(161, 161, 170, 0.12) 0%, rgba(161, 161, 170, 0.04) 100%)',
      }}
    >
      {/* Voice Conversation Toggle - Left side */}
      <div className="absolute left-4 flex items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleVoiceConversation}
          className={`flex items-center justify-center rounded-full transition-all ${
            isVoiceConversationActive
              ? 'text-red-400 animate-pulse'
              : 'text-zinc-400 hover:text-white'
          } ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
          title={isVoiceConversationActive ? 'End voice conversation' : 'Start voice conversation'}
        >
          {isVoiceConversationActive ? (
            <div className="flex items-center gap-[3px] h-5">
              {[0.6, 1, 0.7, 0.4, 0.8].map((scale, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  animate={{
                    height: [12 * scale, 20 * scale, 8 * scale, 18 * scale, 12 * scale],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
              <path
                d="M12 3v18M8 8v8M4 10v4M16 6v12M20 9v6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-70"
              />
            </svg>
          )}
        </motion.button>
      </div>

      <div className="text-center">
        <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : isTablet ? 'text-lg' : 'text-base'}`}>
          {agentName}
        </h3>
      </div>

      <div className="absolute right-4 flex items-center gap-2">
        {isStudio && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCollapse}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Collapse chat"
            title="Collapse chat"
          >
            <Icon icon="lucide:panel-right-close" className="h-4 w-4" />
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Close chat"
        >
          <Icon icon="lucide:x" className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
