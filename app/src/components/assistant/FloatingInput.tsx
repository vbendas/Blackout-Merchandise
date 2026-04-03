'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { type KeyboardEvent, useRef, useState } from 'react';
import { useChat } from '@/lib/ChatContext';

interface FloatingInputProps {
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
}

export function FloatingInput({ onTypingStart, onTypingEnd }: FloatingInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isTyping } = useChat();

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;

    sendMessage(inputValue.trim());
    setInputValue('');
    onTypingEnd?.();

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Notify parent about typing state
    if (newValue.length > 0) {
      onTypingStart?.();
    } else {
      onTypingEnd?.();
    }

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onTypingStart?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.length === 0) {
      onTypingEnd?.();
    }
  };

  const isEmpty = !inputValue.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 rounded-2xl border bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md transition-all ${
        isFocused ? 'border-zinc-600' : 'border-zinc-800'
      }`}
    >
      {/* Text input */}
      <div className="relative flex-1">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type your message..."
          disabled={isTyping}
          rows={1}
          className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-50"
          style={{ minHeight: '24px', maxHeight: '120px' }}
        />
      </div>

      {/* Send button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSend}
        disabled={isEmpty || isTyping}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
          isEmpty || isTyping ? 'cursor-not-allowed text-zinc-600' : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
        aria-label="Send message"
      >
        <Icon icon="lucide:send" className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
