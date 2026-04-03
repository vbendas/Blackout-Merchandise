'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioWaveform, Mic, MicOff } from 'lucide-react';
import { type KeyboardEvent, useCallback, useRef, useState } from 'react';
import { AudioConversationLightbox } from '@/components/AudioConversationLightbox';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useChat } from '@/lib/ChatContext';

// Quick action suggestions based on context
const QUICK_ACTIONS = [
  { label: 'Criar mockup', icon: 'lucide:image', action: 'Quero criar um mockup' },
  { label: 'Ver catálogo', icon: 'lucide:grid', action: 'Mostre-me o catálogo' },
  { label: 'Suporte', icon: 'lucide:headphones', action: 'Preciso de ajuda' },
  { label: 'Minha loja', icon: 'lucide:store', action: 'Como está minha loja?' },
];

export function ChatInput() {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isTyping, currentAgent } = useChat();

  const handleTranscript = useCallback((text: string) => {
    setInputValue((prev) => prev + (prev ? ' ' : '') + text);
    // Focus the input after receiving transcript
    inputRef.current?.focus();
  }, []);

  const { isRecording, startRecording, stopRecording, isSupported } = useSpeechToText({
    onTranscript: handleTranscript,
  });

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;

    sendMessage(inputValue.trim());
    setInputValue('');

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
    setInputValue(e.target.value);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const isEmpty = !inputValue.trim();

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-3">
      {/* Quick actions */}

      <AnimatePresence>
        {isFocused && isEmpty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex gap-2 overflow-x-auto pb-1"
          >
            {QUICK_ACTIONS.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleQuickAction(action.action)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
              >
                <Icon icon={action.icon} className="h-3.5 w-3.5" />
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Voice input button */}
        {isSupported && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTyping}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            } ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </motion.button>
        )}

        {/* Voice conversation button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsVoiceOpen(true)}
          disabled={isTyping}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all ${
            isTyping ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Voice conversation"
        >
          <AudioWaveform className="h-5 w-5" />
        </motion.button>

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Digite sua mensagem..."
            disabled={isTyping}
            rows={1}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 transition-all focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          {/* Character count indicator */}
          <AnimatePresence>
            {inputValue.length > 0 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-2 right-3 text-[10px] text-zinc-500"
              >
                {inputValue.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={isEmpty || isTyping}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
            isEmpty || isTyping
              ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
          aria-label="Send message"
        >
          <Icon icon="lucide:send" className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Help text */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Pressione Enter para enviar, Shift+Enter para nova linha</span>

        <span className="flex items-center gap-1">
          <Icon icon="lucide:shield-check" className="h-3 w-3" />
          Criptografado
        </span>
      </div>

      <AudioConversationLightbox
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        currentAgent={currentAgent}
        onTranscription={(text) => {
          setInputValue(text);
          setIsVoiceOpen(false);
        }}
      />
    </div>
  );
}
