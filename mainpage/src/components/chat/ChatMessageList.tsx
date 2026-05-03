'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { TextMessage } from './messages/TextMessage';
import { AudioMessage } from './messages/AudioMessage';
import { TypingIndicator } from './messages/TypingIndicator';
import { ProductCard } from './cards/ProductCard';
import { MockupCard } from './cards/MockupCard';
import { FormCard } from './cards/FormCard';

interface ChatMessageListProps {
  isTyping?: boolean;
}

export function ChatMessageList({ isTyping = false }: ChatMessageListProps) {
  const { messages, currentAgent } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-zinc-500 py-8">
          <p>Start a conversation!</p>
        </div>
      )}
      
      {messages.map((message) => (
        <div key={message.id}>
          {message.type === 'text' && (
            <TextMessage message={message} showAvatar={message.role === 'assistant'} />
          )}
          {message.type === 'audio' && (
            <AudioMessage message={message} showAvatar={message.role === 'assistant'} />
          )}
          {message.type === 'card' && message.attachment && (
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex flex-col gap-2">
                  <TextMessage message={message} showAvatar={true} />
                  <div className="ml-10 mt-2">
                    {message.attachment.cardType === 'product' && (
                      <ProductCard
                        name={message.attachment.name || 'Product'}
                        price={message.attachment.price}
                        imageUrl={message.attachment.imageUrl || ''}
                        category={message.attachment.category}
                      />
                    )}
                    {message.attachment.cardType === 'mockup' && (
                      <MockupCard
                        imageUrl={message.attachment.imageUrl || ''}
                        productName={message.attachment.name}
                        variations={message.attachment.variations}
                      />
                    )}
                    {message.attachment.cardType === 'form' && (
                      <FormCard
                        question={message.attachment.question || ''}
                        type={message.attachment.formType || 'text'}
                        options={message.attachment.options}
                        currentStep={message.attachment.currentStep}
                        totalSteps={message.attachment.totalSteps}
                        onSubmit={() => {}}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {isTyping && <TypingIndicator agent={currentAgent} />}
      
      <div ref={scrollRef} />
    </div>
  );
}