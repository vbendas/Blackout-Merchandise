'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { TextMessage } from './messages/TextMessage';
import { AudioMessage } from './messages/AudioMessage';
import { TypingIndicator } from './messages/TypingIndicator';

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
          {message.type === 'text' ? (
            <TextMessage message={message} showAvatar={message.role === 'assistant'} />
          ) : (
            <AudioMessage message={message} showAvatar={message.role === 'assistant'} />
          )}
        </div>
      ))}
      
      {isTyping && <TypingIndicator agent={currentAgent} />}
      
      <div ref={scrollRef} />
    </div>
  );
}