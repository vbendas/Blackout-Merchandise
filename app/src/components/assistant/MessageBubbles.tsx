'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { TypewriterText } from '@/components/ui/typewriter-text';
import { useChat } from '@/lib/ChatContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import type { AgentName } from '@/types/expressions';

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

// Agent colors for Orb
const AGENT_COLORS: Record<string, [string, string]> = {
  Leopoldo: ['#CADCFC', '#A0B9D1'],
  Francisca: ['#E5E7EB', '#D1D5DB'],
  Antônia: ['#9CA3AF', '#6B7280'],
};

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
      className="flex items-end gap-2 self-start"
    >
      {/* Agent indicator */}
      <MessageAvatar src={getCloudinaryUrl(agent, 'neutral', 100)} name={agent} className="h-6 w-6" />

      {/* Shimmering text */}
      <MessageContent from="assistant" variant="flat">
        <ShimmeringText text={TYPING_PHRASES[phraseIndex]} duration={2} repeat={true} repeatDelay={0.5} />
      </MessageContent>
    </motion.div>
  );
}

export function MessageBubbles() {
  const { messages, currentAgent, isTyping } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div ref={scrollRef} className="flex max-h-64 flex-col gap-3 overflow-y-auto px-2 py-2">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const isLastMessage = index === messages.length - 1;
          const agentColors: [string, string] = AGENT_COLORS[message.agent] || ['#CADCFC', '#A0B9D1'];

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
            >
              <Message from={isUser ? 'user' : 'assistant'}>
                {/* Avatar with glow */}
                {!isUser && (
                  <MessageAvatar
                    src={getCloudinaryUrl(message.agent, 'neutral', 100)}
                    name={message.agent}
                    className="h-6 w-6 shrink-0"
                    style={{
                      boxShadow: `0 0 10px 2px ${agentColors[0]}40`,
                    }}
                  />
                )}

                {/* Message bubble */}
                <MessageContent from={isUser ? 'user' : 'assistant'} variant="contained">
                  {isLastMessage && !isUser ? (
                    <TypewriterText text={message.content} className="text-sm leading-relaxed" />
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                  <span className={`mt-1 block text-right text-[10px] ${isUser ? 'text-blue-200' : 'text-zinc-500'}`}>
                    {formatTime(message.timestamp)}
                  </span>
                </MessageContent>
              </Message>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>{isTyping && <TypingIndicator agent={currentAgent} />}</AnimatePresence>

      {/* Empty state - welcome message */}
      {messages.length === 0 && !isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-start rounded-2xl rounded-bl-sm bg-zinc-800/90 px-4 py-3 text-sm text-zinc-300 backdrop-blur-sm"
        >
          👋 Hi there! I'm {currentAgent}. How can I help you today?
        </motion.div>
      )}
    </div>
  );
}
