'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef } from 'react';
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
  waveSubtitles: string;
  quickActions: QuickAction[];
  onQuickAction: (action: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  agentColor: string;
  onWaveHoldStart: () => Promise<void>;
  onWaveHoldEnd: () => void;
  micPermissionState?: 'granted' | 'denied' | 'prompt' | 'unknown';
  isStudioMode?: boolean;
  onImageUpload?: (file: File) => Promise<void>;
  showImageUpload?: boolean;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  isTyping,
  isVoiceConversationActive,
  voiceConversationStatus,
  waveSubtitles,
  quickActions,
  onQuickAction,
  isMobile,
  isTablet,
  agentColor,
  onWaveHoldStart,
  onWaveHoldEnd,
  micPermissionState,
  isStudioMode,
  onImageUpload,
  showImageUpload,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isHoldingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);

    isHoldingRef.current = true;
    if (buttonRef.current) {
      buttonRef.current.style.transform = 'scale(0.92)';
    }

    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        onWaveHoldStart();
      }
    }, 200);
  }, [onWaveHoldStart]);

  const handlePointerUp = useCallback(() => {
    isHoldingRef.current = false;
    if (buttonRef.current) {
      buttonRef.current.style.transform = '';
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    onWaveHoldEnd();
  }, [onWaveHoldEnd]);

  const handlePointerLeave = useCallback(() => {
    isHoldingRef.current = false;
    if (buttonRef.current) {
      buttonRef.current.style.transform = '';
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    onWaveHoldEnd();
  }, [onWaveHoldEnd]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

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
                    className={`w-1 rounded-full ${
                      voiceConversationStatus === 'speaking'
                        ? 'bg-rose-400/90'
                        : 'bg-white/80'
                    }`}
                    animate={{
                      height:
                        voiceConversationStatus === 'listening'
                          ? [4, 12 + Math.random() * 20, 4]
                          : voiceConversationStatus === 'speaking'
                            ? [4, 18 + Math.random() * 16, 4]
                            : [4, 10, 4],
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
            {/* Subtitle text during speaking */}
            <AnimatePresence>
              {voiceConversationStatus === 'speaking' && waveSubtitles && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="w-full max-w-[95%] rounded-xl bg-zinc-900/90 px-4 py-2.5 backdrop-blur-xl"
                >
                  <p className="text-sm text-white/90 leading-relaxed max-h-[80px] overflow-y-auto">
                    {waveSubtitles}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {!isVoiceConversationActive && (
        <QuickActionsCarousel actions={quickActions} onAction={onQuickAction} />
      )}

      <div className="flex items-center gap-2">
        {/* Wave Button with Hold-to-Speak */}
        <button
          ref={buttonRef}
          onPointerDown={micPermissionState === 'denied' ? undefined : handlePointerDown}
          onPointerUp={micPermissionState === 'denied' ? undefined : handlePointerUp}
          onPointerLeave={micPermissionState === 'denied' ? undefined : handlePointerLeave}
          className={`flex shrink-0 items-center justify-center rounded-full transition-all select-none relative ${
            isVoiceConversationActive
              ? 'bg-rose-600/20 text-rose-400 animate-pulse'
              : micPermissionState === 'denied'
                ? 'text-zinc-600 cursor-not-allowed opacity-50'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95'
          } ${isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'}`}
          aria-label={micPermissionState === 'denied' ? 'Microphone access denied' : 'Hold to speak'}
          title={micPermissionState === 'denied' ? 'Microphone access denied. Click for instructions.' : 'Hold to speak'}
          style={{ touchAction: 'none' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className={`text-current absolute inset-0 m-auto transition-opacity duration-150 ${
              isVoiceConversationActive ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <path
              d="M12 3v18M8 8v8M4 10v4M16 6v12M20 9v6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="opacity-70"
            />
          </svg>
          <div
            className={`flex items-center justify-center gap-[2px] h-5 absolute inset-0 m-auto transition-opacity duration-150 pointer-events-none ${
              isVoiceConversationActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {[0.6, 1, 0.7, 0.4, 0.8].map((scale, i) => (
              <motion.div
                key={i}
                className="w-[2px] rounded-full bg-rose-400"
                animate={isVoiceConversationActive ? {
                  height: [10 * scale, 18 * scale, 6 * scale, 16 * scale, 10 * scale],
                } : { height: 10 * scale }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </button>

        {/* Image Upload Button (studio mode only) */}
        {showImageUpload && (
          <label
            className={`flex shrink-0 items-center justify-center rounded-full cursor-pointer transition-all text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95 ${
              isMobile ? 'h-11 w-11' : isTablet ? 'h-14 w-14' : 'h-12 w-12'
            }`}
            aria-label="Upload image"
            title="Upload image"
          >
            <Icon icon="lucide:paperclip" className={isMobile ? 'h-5 w-5' : isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0 && onImageUpload) {
                  await onImageUpload(files[0]);
                }
              }}
            />
          </label>
        )}

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
