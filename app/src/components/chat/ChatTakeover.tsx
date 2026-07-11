'use client';

import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@/components/chat/CatChatProvider';
import { AGENT_CONFIGS } from '@/types/chat';
import { AgentAvatar } from './AgentAvatar';
import { QuickActionsCarousel } from './QuickActionsCarousel';
import { TypewriterText } from './TypewriterText';
import { cn } from '@/lib/utils';
import type { CardMessageData } from '@/types/chat';
import { ProductCardInline } from './ProductCardInline';
import { MockupCardInline } from './MockupCardInline';
import { DesignCardInline } from './DesignCardInline';

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function CardRenderer({ cardData }: { cardData: CardMessageData }) {
  switch (cardData.cardType) {
    case 'product':
      return (
        <ProductCardInline
          productId={cardData.productId}
          name={cardData.name}
          brand={cardData.brand}
          category={cardData.category}
          imageUrl={cardData.imageUrl}
          baseCost={cardData.baseCost}
          suggestedRetail={cardData.suggestedRetail}
          colors={cardData.colors}
          specs={cardData.specs}
        />
      );
    case 'mockup':
      return (
        <MockupCardInline
          mockupId={cardData.productId}
          productName={cardData.name}
          mockupUrl={cardData.imageUrl}
          designPreviewUrl={cardData.imageUrl}
          colors={cardData.colors}
        />
      );
    case 'design':
      return (
        <DesignCardInline
          designId={cardData.productId}
          title={cardData.name}
          imageUrl={cardData.imageUrl}
          description={cardData.category}
          generatedBy="ai"
          tags={cardData.brand ? [cardData.brand] : undefined}
        />
      );
    default:
      return null;
  }
}

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2"
    >
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

interface ChatTakeoverProps {
  isOpen: boolean;
  onClose: () => void;
  liftingSuggestion?: { text: string; id: string } | null;
}

export function ChatTakeover({ isOpen, onClose, liftingSuggestion }: ChatTakeoverProps) {
  const {
    currentAgent,
    messages,
    isTyping,
    quickActions,
    sendMessage,
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const agentConfig = AGENT_CONFIGS[currentAgent];

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;
    await sendMessage(inputValue.trim());
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Auto-focus textarea when takeover opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleQuickAction = useCallback(
    (action: string) => {
      if (!action.trim()) return;
      sendMessage(action.trim());
    },
    [sendMessage]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[20px]"
            onClick={onClose}
          />

          {/* Scaled body hint */}
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 0.98 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[5] pointer-events-none"
          >
            <div className="w-full h-full bg-zinc-950/50" />
          </motion.div>

          {/* Chat Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 300,
            }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-[100] flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full overflow-hidden">
                  <AgentAvatar
                    agentName={agentConfig.name}
                    expression={isTyping ? 'thinking' : 'neutral'}
                    size="sm"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{agentConfig.name}</p>
                  <p className="text-xs text-zinc-500">{agentConfig.role}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Minimize chat"
              >
                <Icon icon="lucide:minimize-2" className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="h-16 w-16 rounded-full overflow-hidden mb-4">
                    <AgentAvatar
                      agentName={agentConfig.name}
                      expression="happy"
                      size="md"
                    />
                  </div>
                  <p className="text-lg font-medium text-white mb-2">
                    {agentConfig.name}
                  </p>
                  <p className="text-sm text-zinc-500 max-w-sm">
                    How can I help you today?
                  </p>
                </div>
              )}

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const isLast = index === messages.length - 1;
                
                // Get agent for this message (supports multi-agent conversations)
                const messageAgentId = message.agent || currentAgent;
                const messageAgentConfig = AGENT_CONFIGS[messageAgentId];
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const prevAgentId = prevMessage?.agent || currentAgent;
                
                // Show avatar when:
                // 1. First assistant message
                // 2. Previous message was from user
                // 3. Agent changed from previous message
                const showAvatar = !isUser && (
                  index === 0 || 
                  messages[index - 1].role === 'user' || 
                  messageAgentId !== prevAgentId
                );
                
                // Show agent name label when agent changes
                const showAgentLabel = !isUser && 
                  prevMessage?.role === 'assistant' && 
                  messageAgentId !== prevAgentId;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'flex gap-3',
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    {!isUser && showAvatar && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 mt-1">
                          <AgentAvatar
                            agentName={messageAgentConfig.name}
                            expression={isLast && isTyping ? 'thinking' : 'neutral'}
                            size="sm"
                          />
                        </div>
                      </div>
                    )}
                    {!isUser && !showAvatar && (
                      <div className="w-7 shrink-0" />
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        'max-w-[80%]',
                        isUser ? 'items-end' : 'items-start'
                      )}
                    >
                      {/* Agent name label (shown on agent change) */}
                      {showAgentLabel && (
                        <span className="text-[10px] text-zinc-500 mb-1 ml-1 block">
                          {messageAgentConfig.name}
                        </span>
                      )}
                      <div
                        className={cn(
                          'px-4 py-2.5 rounded-2xl',
                          isUser
                            ? 'bg-amber-400/90 text-black rounded-br-sm'
                            : 'bg-zinc-800/80 text-white rounded-bl-sm'
                        )}
                      >
                        {message.type === 'text' && (
                          <div className="text-sm whitespace-pre-wrap">
                            {isLast && !isUser && message.content.length > 50 ? (
                              <TypewriterText text={message.content} />
                            ) : (
                              message.content
                            )}
                          </div>
                        )}
                        {message.metadata?.cardData && (
                          <div className="mt-2">
                            <CardRenderer cardData={message.metadata.cardData} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {isTyping && (
                  <TypingIndicator agentName={agentConfig.name} />
                )}
              </AnimatePresence>

              {/* Ghost message for layoutId lift animation */}
              <AnimatePresence>
                {liftingSuggestion && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-row-reverse gap-3"
                  >
                    <div className="max-w-[80%] items-end">
                      <div className="px-4 py-2.5 rounded-2xl bg-amber-400/90 text-black rounded-br-sm">
                        <motion.span
                          layoutId={`suggestion-lift-${liftingSuggestion.id}`}
                          className="text-sm inline-block"
                        >
                          {liftingSuggestion.text}
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Actions */}
            <AnimatePresence>
              {quickActions.length > 0 && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="shrink-0 px-4 pb-2"
                >
                  <QuickActionsCarousel
                    actions={quickActions}
                    onAction={handleQuickAction}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="flex items-end gap-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${agentConfig.name}...`}
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder:text-zinc-500 resize-none outline-none min-h-[44px] max-h-[120px] py-2.5 px-3 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-amber-400/90 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
                >
                  <Icon icon="lucide:arrow-up" className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
