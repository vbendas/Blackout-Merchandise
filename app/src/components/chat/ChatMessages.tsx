'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { ChatMessage, AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentAgent: AgentId;
  isTyping: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2"
    >
      <span className="text-xs text-zinc-500 italic">
        {agentName} is typing
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ...
        </motion.span>
      </span>
    </motion.div>
  );
}

export function ChatMessages({ messages, currentAgent, isTyping, scrollRef }: ChatMessagesProps) {
  const agentConfig = AGENT_CONFIGS[currentAgent];

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const messageAgent = message.agent || currentAgent;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'rounded-br-sm bg-gradient-to-r from-zinc-700 to-zinc-600 text-white'
                      : 'rounded-bl-sm bg-zinc-900/80 text-zinc-100 backdrop-blur-xl'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  <span className="mt-1 block text-right text-[10px] text-zinc-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && <TypingIndicator agentName={agentConfig.name} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
