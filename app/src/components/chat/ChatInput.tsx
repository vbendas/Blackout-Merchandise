'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useRef } from 'react';
import { QuickActionsCarousel } from './QuickActionsCarousel';
import type { QuickAction } from '@/lib/chat/quickActions';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isTyping: boolean;
  isVoiceConversationActive: boolean;
  voiceConversationStatus: string;
  audioLevel: number;
  quickActions: QuickAction[];
  onQuickAction: (action: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  agentColor: string;
  isInlineRecording: boolean;
  onMicHoldStart: () => Promise<void>;
  onMicHoldEnd: () => void;
  showHoldTooltip: boolean;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  isTyping,
  isVoiceConversationActive,
  voiceConversationStatus,
  audioLevel,
  quickActions,
  onQuickAction,
  isMobile,
  isTablet,
  agentColor,
  isInlineRecording,
  onMicHoldStart,
  onMicHoldEnd,
  showHoldTooltip,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {/* Voice Conversation Overlay */}
      <AnimatePresence>
        {isVoiceConversationActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 h-8">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-white/80"
                    animate={{
                      height:
                        voiceConversationStatus === 'listening'
                          ? [4, Math.max(4, audioLevel * 0.8 + Math.random() * 20), 4]
                          : voiceConversationStatus === 'speaking'
                            ? [4, 20 + Math.random() * 12, 4]
                            : [4, 8, 4],
                    }}
                    transition={{
                      duration: 0.3 + Math.random() * 0.2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      delay: i * 0.03,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-400 capitalize">
                {voiceConversationStatus === 'idle' && 'Ready'}
                {voiceConversationStatus === 'listening' && 'Listening...'}
                {voiceConversationStatus === 'thinking' && 'Thinking...'}
                {voiceConversationStatus === 'speaking' && 'Speaking...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isVoiceConversationActive && (
        <QuickActionsCarousel actions={quickActions} onAction={onQuickAction} />
      )}

      <div className="flex items-center gap-2">
        {/* Mic Button with Hold-to-Speak */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseDown={onMicHoldStart}
            onMouseUp={onMicHoldEnd}
            onMouseLeave={onMicHoldEnd}
            onTouchStart={(e) => {
              e.preventDefault();
              onMicHoldStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onMicHoldEnd();
            }}
            className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
              isInlineRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
            aria-label="Hold to speak"
          >
            <Icon 
              icon="lucide:mic" 
              className={`${isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} ${isInlineRecording ? 'text-white' : ''}`} 
            />
          </motion.button>

          {/* Hold to Speak Tooltip */}
          <AnimatePresence>
            {showHoldTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-50"
              >
                Hold to speak
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            disabled={isTyping}
            rows={1}
            className={`w-full resize-none rounded-2xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50 ${
              isMobile ? 'px-3 py-3 text-sm' : isTablet ? 'px-5 py-4 text-base' : 'px-4 py-3 text-sm'
            }`}
            style={{ minHeight: isMobile ? '44px' : isTablet ? '56px' : '48px', maxHeight: '100px' }}
          />
          <AnimatePresence>
            {inputValue.length > 0 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute right-3 text-zinc-500 ${
                  isMobile ? 'bottom-3 text-[10px]' : isTablet ? 'bottom-4 text-xs' : 'bottom-3 text-[10px]'
                }`}
              >
                {inputValue.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSend}
          disabled={!inputValue.trim() || isTyping}
          className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
            !inputValue.trim() || isTyping
              ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
              : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/10'
          } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
          aria-label="Send message"
        >
          <Icon icon="lucide:send" className={isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
        </motion.button>
      </div>
    </>
  );
}
