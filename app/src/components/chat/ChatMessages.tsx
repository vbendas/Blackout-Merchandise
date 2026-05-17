'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import { TypewriterText } from './TypewriterText';
import { ProductCardMessage } from './ProductCardMessage';
import { ProductDetailModal } from './ProductDetailModal';

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

/**
 * Animated typing indicator with bouncing dots.
 * Shows "{AgentName} is typing" with three pulsing dots.
 */
function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2"
    >
      {/* Agent avatar indicator */}
      <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        <div className="flex gap-[2px]">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 w-1 rounded-full bg-zinc-400"
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      {/* Typing label */}
      <div className="rounded-2xl rounded-bl-sm bg-zinc-900/80 backdrop-blur-xl px-3 py-2">
        <span className="text-xs text-zinc-500 italic flex items-center gap-1">
          {agentName} is typing
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ...
          </motion.span>
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Message enter animation variants
 */
const messageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const messageTransition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

export function ChatMessages({ messages, currentAgent, isTyping, scrollRef }: ChatMessagesProps) {
  const agentConfig = AGENT_CONFIGS[currentAgent];
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    description?: string;
    brand?: string;
    material?: string;
    weightG?: number;
    baseCostEur: number;
    suggestedRetailEur?: number;
    imageUrl?: string;
    status?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductSelect = (product: {
    id: string;
    name: string;
    brand?: string;
    material?: string;
    baseCostEur: number;
    imageUrl?: string;
  }) => {
    setSelectedProduct({
      ...product,
      description: undefined,
      weightG: undefined,
      suggestedRetailEur: undefined,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const messageAgent = message.agent || currentAgent;

            // Check if this is the latest assistant message that's still streaming
            const isStreaming =
              !isUser &&
              message.content.length > 0 &&
              index === messages.length - 1 &&
              messages[messages.length - 1].role === 'assistant';

            return (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={messageTransition}
                className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Agent avatar for assistant messages */}
                {!isUser && (
                  <div
                    className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: `${AGENT_CONFIGS[messageAgent]?.color || '#6B7280'}20`,
                      border: `1.5px solid ${AGENT_CONFIGS[messageAgent]?.color || '#6B7280'}40`,
                      color: AGENT_CONFIGS[messageAgent]?.color || '#6B7280',
                    }}
                  >
                    {AGENT_CONFIGS[messageAgent]?.name?.charAt(0) || '?'}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'rounded-br-sm bg-gradient-to-r from-zinc-700 to-zinc-600 text-white'
                      : 'rounded-bl-sm bg-zinc-900/80 text-zinc-100 backdrop-blur-xl'
                  }`}
                >
                  {message.type === 'product-card' ? (
                    <ProductCardMessage
                      products={message.metadata?.searchResults?.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        brand: p.brand,
                        material: p.material,
                        baseCostEur: p.baseCostEur / 100,
                        imageUrl: p.imageUrl,
                      })) || []}
                      onProductSelect={handleProductSelect}
                      onShowMore={() => console.log('Show more products')}
                    />
                  ) : isStreaming ? (
                    <TypewriterText
                      text={message.content}
                      isStreaming={true}
                      speed={3}
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  )}
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

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToQuote={(productId) => console.log('Add to quote:', productId)}
        onStartDesign={(productId) => console.log('Start design:', productId)}
      />
    </div>
  );
}
