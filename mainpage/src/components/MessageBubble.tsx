'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
}

export default function MessageBubble({ message, isTyping = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const agent = message.agent;

  const avatarUrl = agent
    ? `https://res.cloudinary.com/demo/image/fetch/f_auto,q_auto/https://github.com/Merch-From/Merch-From/raw/main/Assets/avatars/${agent}/neutral.png`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
          {avatarUrl && <img src={avatarUrl} alt={`${agent} avatar`} className="w-full h-full object-cover" />}
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white'
            : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
        }`}
      >
        {!isUser && agent && <p className="text-xs font-semibold mb-1 text-amber-400 capitalize">{agent}</p>}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {isTyping ? (
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></span>
              <span
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></span>
            </span>
          ) : (
            message.content
          )}
        </p>
        <p className={`text-xs mt-1 ${isUser ? 'text-amber-100' : 'text-zinc-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <span className="text-zinc-400 text-sm font-medium">You</span>
        </div>
      )}
    </motion.div>
  );
}
