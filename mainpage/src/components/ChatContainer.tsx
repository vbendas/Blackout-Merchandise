'use client';

import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Send, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { cn } from '../lib/utils';
import MessageBubble from './MessageBubble';

export default function ChatContainer() {
  const { state, sendMessage, toggleChat, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !state.isLoading) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!state.isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <span className="text-white font-bold text-xl">💬</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={cn(
        'fixed bottom-6 right-6 w-96 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 z-50 overflow-hidden',
        isMinimized ? 'h-14' : 'h-[600px]'
      )}
    >
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-semibold">Chat with Cat-Suite</span>
          {state.currentAgent && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full capitalize">{state.currentAgent}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={toggleChat} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 h-[calc(100%-8rem)]">
            {state.messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👋</div>
                <p className="text-zinc-400 mb-2">Welcome to MerchFrom! I'm here to help you get started.</p>
                <p className="text-zinc-500 text-sm">
                  Ask me about our platform, design services, or merchandise options.
                </p>
              </div>
            ) : (
              state.messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {state.isLoading && (
              <MessageBubble
                message={{
                  id: 'typing',
                  role: 'assistant',
                  content: '',
                  type: 'text',
                  timestamp: Date.now(),
                  agent: 'antonia',
                }}
                isTyping
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-500"
                disabled={state.isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || state.isLoading}
                className="bg-gradient-to-r from-amber-600 to-amber-500 text-white p-2 rounded-lg hover:from-amber-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send size={20} />
              </button>
            </div>
            {state.messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Clear conversation
              </button>
            )}
          </form>
        </>
      )}
    </motion.div>
  );
}
