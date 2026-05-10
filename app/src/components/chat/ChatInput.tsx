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
  isVoiceMode: boolean;
  onToggleVoiceMode: () => void;
  isVoiceConversationActive: boolean;
  voiceConversationStatus: string;
  audioLevel: number;
  quickActions: QuickAction[];
  onQuickAction: (action: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  agentColor: string;
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  isTyping,
  isVoiceMode,
  onToggleVoiceMode,
  isVoiceConversationActive,
  voiceConversationStatus,
  audioLevel,
  quickActions,
  onQuickAction,
  isMobile,
  isTablet,
  agentColor,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (isVoiceMode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseDown={onStartRecording}
          onMouseUp={onStopRecording}
          onMouseLeave={onStopRecording}
          onTouchStart={onStartRecording}
          onTouchEnd={onStopRecording}
          className={`flex items-center justify-center rounded-full transition-all ${
            isRecording ? 'animate-pulse' : ''
          } ${isMobile ? 'h-16 w-16' : isTablet ? 'h-24 w-24' : 'h-20 w-20'}`}
          style={{
            backgroundColor: isRecording ? '#EF4444' : agentColor,
            boxShadow: `0 0 30px ${isRecording ? '#EF4444' : agentColor}50`,
          }}
        >
          <motion.div
            animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
          >
            <Icon icon="lucide:mic" className={`text-white ${isMobile ? 'h-6 w-6' : isTablet ? 'h-10 w-10' : 'h-8 w-8'}`} />
          </motion.div>
        </motion.button>
        <p className={`text-zinc-400 ${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-xs'}`}>
          {isRecording ? `Recording... ${formatDuration(recordingDuration)}` : 'Hold to speak'}
        </p>
      </motion.div>
    );
  }

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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleVoiceMode}
          className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
            isVoiceMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
          title={isVoiceMode ? 'Text mode' : 'Voice mode'}
        >
          <Icon icon={isVoiceMode ? 'lucide:message-square' : 'lucide:mic'} className={isMobile ? 'h-4 w-4' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
        </motion.button>

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
