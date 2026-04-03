'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { useEffect } from 'react';

export function ChatWindow() {
  const { closeChat } = useChat();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeChat]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col 
        md:bottom-24 md:right-6 
        max-sm:bottom-0 max-sm:right-0 max-sm:w-screen max-sm:h-screen max-sm:rounded-none"
    >
      <ChatHeader />
      <ChatMessageList />
      <ChatInput />
    </motion.div>
  );
}