'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { TypewriterText } from '@/components/ui/typewriter-text';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { useChat } from '@/lib/ChatContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import type { AgentName } from '@/types/expressions';

// Agent colors - two colors for Orb gradient
const AGENT_COLORS: Record<string, [string, string]> = {
  Leopoldo: ['#CADCFC', '#A0B9D1'],
  Francisca: ['#E5E7EB', '#D1D5DB'],
  Antônia: ['#9CA3AF', '#6B7280'],
};

// Border colors for avatars (single color)
const AGENT_BORDER_COLORS: Record<string, string> = {
  Leopoldo: '#F59E0B',
  Francisca: '#A855F7',
  Antônia: '#3B82F6',
};

// Welcome messages per agent
const WELCOME_MESSAGES: Record<string, { title: string; suggestions: string[] }> = {
  Leopoldo: {
    title: 'Olá! Sou Leopoldo, seu assistente de loja.',
    suggestions: ['Como posso aumentar minhas vendas?', 'Qual é minha receita atual?', 'Como funciona o pagamento?'],
  },
  Francisca: {
    title: 'Oi! Sou Francisca, especialista em design.',
    suggestions: ['Quero criar um mockup', 'Me mostre produtos disponíveis', 'Como usar o Studio?'],
  },
  Antônia: {
    title: 'Oi! Sou Antônia, do suporte.',
    suggestions: ['Onde está meu pedido?', 'Tenho um problema com entrega', 'Como faço uma devolução?'],
  },
};

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
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
  const { currentExpression } = useAvatarExpression();

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
      className="flex items-end gap-2"
    >
      {/* Agent Avatar */}
      <MessageAvatar src={getCloudinaryUrl(agent, currentExpression, 200)} name={agent} className="h-8 w-8" />

      {/* Shimmering text instead of dots */}
      <MessageContent from="assistant" variant="flat">
        <ShimmeringText text={TYPING_PHRASES[phraseIndex]} duration={2} repeat={true} repeatDelay={0.5} />
      </MessageContent>
    </motion.div>
  );
}

export function ChatMessages() {
  const { messages, currentAgent, isTyping, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const welcomeInfo = WELCOME_MESSAGES[currentAgent];

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden p-4">
      <div className="flex flex-col gap-4">
        {/* Empty state / Welcome message */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              {/* Welcome message */}
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2"
                  style={{ borderColor: AGENT_BORDER_COLORS[currentAgent] }}
                >
                  <img
                    src={getCloudinaryUrl(currentAgent, 'happy', 200)}
                    alt={currentAgent}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
                    <p className="text-sm text-zinc-100">{welcomeInfo.title}</p>
                  </div>

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {welcomeInfo.suggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => sendMessage(suggestion)}
                        className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const isLastMessage = index === messages.length - 1;
            const agentColors: [string, string] = AGENT_COLORS[message.agent as keyof typeof AGENT_COLORS] || [
              '#CADCFC',
              '#A0B9D1',
            ];

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
                  {/* Avatar with glow (only for AI messages) */}
                  {!isUser && (
                    <MessageAvatar
                      src={getCloudinaryUrl(message.agent, 'neutral', 200)}
                      name={message.agent}
                      className="h-8 w-8 shrink-0"
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                    <span className="mt-1 block text-right text-[10px] text-zinc-500">
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
      </div>
    </div>
  );
}
