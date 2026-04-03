'use client';

import { ChatMessage } from '@/types/chat';
import { TextMessage } from './messages/TextMessage';

interface MessageRendererProps {
  message: ChatMessage;
  showAgent?: boolean;
}

export function MessageRenderer({ message, showAgent = true }: MessageRendererProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && showAgent && (
        <TextMessage message={message} showAvatar={showAgent} />
      )}
      {message.role === 'user' && (
        <TextMessage message={message} showAvatar={false} />
      )}
    </div>
  );
}
