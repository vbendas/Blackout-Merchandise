'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { TypewriterText } from '@/components/ui/typewriter-text';
import { useChat } from '@/lib/ChatContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import type { AgentName } from '@/types/expressions';
import { ChatMessageRenderer } from './ChatMessageRenderer';

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

const TYPING_PHRASES = [
  'Agent is thinking...',
  'Processing your request...',
  'Analyzing the data...',
  'Generating response...',
  'Almost there...',
];

function TypingIndicator({ agent }: { agent: AgentName }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 self-start"
    >
      <MessageAvatar src={getCloudinaryUrl(agent, 'neutral', 200)} name={agent} className="h-14 w-14" />

      <MessageContent from="assistant" variant="flat">
        <ShimmeringText text={TYPING_PHRASES[phraseIndex]} duration={2} repeat={true} repeatDelay={0.5} />
      </MessageContent>
    </motion.div>
  );
}

const UI_HIDE_DELAY = 2000;

export function FloatingAssistant() {
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { messages, currentAgent, isTyping, unreadCount, isOpen, closeChat, sendMessage, designFlowStep } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Force visibility when in design workflow
  const shouldBeVisible = isOpen || designFlowStep !== 'idle';

  // ESC key handler to close chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Show bubbles function - respects context isOpen
  const showBubbles = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (!isHovered) {
      hideTimeoutRef.current = setTimeout(() => {
        // Only auto-hide if not hovered
      }, UI_HIDE_DELAY);
    }
  }, [isHovered]);

  // Show on new messages (only if chat is already open)
  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      showBubbles();
    }
  }, [messages, showBubbles, isOpen]);

  // Show on unread count change (only if chat is already open)
  useEffect(() => {
    if (unreadCount > 0 && isOpen) {
      showBubbles();
    }
  }, [unreadCount, showBubbles, isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    showBubbles();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Don't auto-close during design workflow
    if (designFlowStep !== 'idle') {
      return;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      closeChat();
    }, UI_HIDE_DELAY);
  };

  if ((messages.length === 0 && !isTyping) || !shouldBeVisible) {
    return null;
  }

  return (
    <>
      {/* Background Overlay */}
      {shouldBeVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChat}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldBeVisible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="fixed top-0 z-50 pointer-events-none"
        style={{
          left: '64px',
          right: '0',
          bottom: '114px',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-full h-full flex flex-col">
          {/* Eney style - no container, just floating bubbles */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            className="overflow-y-auto flex flex-col gap-3 scrollbar-hide pb-8 pointer-events-auto h-full pl-2.5 pr-2"
            onClick={(e) => {
              // Close chat when clicking on the container background (not on messages)
              if (e.target === e.currentTarget) {
                closeChat();
              }
            }}
          >
            <div className="flex-1 pointer-events-none" />
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const isLastMessage = index === messages.length - 1;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    layout
                    className="pointer-events-auto"
                  >
                    <Message from={isUser ? 'user' : 'assistant'}>
                      {/* Avatar with black background (no orb) */}
                      {!isUser && (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-black">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MessageAvatar
                              src={getCloudinaryUrl(message.agent, 'neutral', 200)}
                              name={message.agent}
                              className="h-12 w-12"
                            />
                          </div>
                        </div>
                      )}

                      {isUser && (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/20 bg-zinc-700 flex items-center justify-center">
                          <Icon icon="lucide:user" className="w-7 h-7 text-zinc-400" />
                        </div>
                      )}

                      {/* Message bubble */}
                      <MessageContent from={isUser ? 'user' : 'assistant'} variant="contained">
                        {isLastMessage && !isUser ? (
                          <TypewriterText text={message.content} className="text-sm leading-relaxed" />
                        ) : (
                          <ChatMessageRenderer
                            message={message}
                            onAction={(actionText) => {
                              if (actionText === '__TRIGGER_UPLOAD__') {
                                return;
                              }
                              sendMessage(actionText);
                            }}
                          />
                        )}
                        <span
                          className={`mt-1 block text-right text-[10px] ${isUser ? 'text-blue-200' : 'text-zinc-500'}`}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </MessageContent>
                    </Message>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <AnimatePresence>{isTyping && <TypingIndicator agent={currentAgent} />}</AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
