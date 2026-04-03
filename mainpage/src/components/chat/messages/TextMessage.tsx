'use client';

import Image from 'next/image';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/lib/utils/formatTime';

interface TextMessageProps {
  message: ChatMessage;
  showAvatar?: boolean;
}

export function TextMessage({ message, showAvatar = false }: TextMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && !isUser && (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700">
          <Image
            src={`https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/${message.agent.toLowerCase()}/neutral_attr1_subject.png`}
            alt={message.agent}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={`px-4 py-2 rounded-2xl ${
        isUser 
          ? 'bg-rose-600 text-white rounded-br-md' 
          : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
      }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span className={`text-xs mt-1 block ${isUser ? 'text-rose-200' : 'text-zinc-500'}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
