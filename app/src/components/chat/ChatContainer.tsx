'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/lib/ChatContext';
import type { AgentName } from '@/types/expressions';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';

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

export interface ChatContainerProps {
  mode: 'floating' | 'embedded';
  className?: string;
}

// Welcome message component
function WelcomeMessage({
  agent,
  onSuggestionClick,
}: {
  agent: AgentName;
  onSuggestionClick: (suggestion: string) => void;
}) {
  const welcomeInfo = WELCOME_MESSAGES[agent] || WELCOME_MESSAGES.Leopoldo;
  const borderColor = AGENT_BORDER_COLORS[agent] || '#6B7280';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2" style={{ borderColor }}>
          <img
            src={`https://res.cloudinary.com/merch-from/image/upload/merch-from/avatars/${agent.toLowerCase()}/happy/v2/200.webp`}
            alt={agent}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
            <p className="text-sm text-zinc-100">{welcomeInfo.title}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {welcomeInfo.suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSuggestionClick(suggestion)}
                className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ChatContainer({ mode, className }: ChatContainerProps) {
  const { messages, currentAgent, isTyping, sendMessage, toggleChat } = useChat();

  // Auto-scroll to bottom when messages change - handled via useEffect in parent if needed
  // For now, we rely on the ScrollArea's natural behavior

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Handle message click in rich content
  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <ChatHeader onClose={mode === 'floating' ? () => toggleChat() : undefined} />

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 min-h-full flex flex-col">
          {/* Empty state / Welcome message */}
          <AnimatePresence>
            {messages.length === 0 && <WelcomeMessage agent={currentAgent} onSuggestionClick={handleSuggestionClick} />}
          </AnimatePresence>

          {/* Messages list */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onSendMessage={handleSendMessage} />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && <TypingIndicator agentName={currentAgent} isTyping={true} />}
            </AnimatePresence>
          </div>
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
