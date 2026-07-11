'use client';

import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';
import { AgentAvatar } from '@/components/chat/AgentAvatar';
import {
  PromptInput,
  PromptInputActions,
  PromptInputAction,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { useHeroGreeting } from '@/hooks/useHeroGreeting';
import { getHeroSuggestionsSlice } from '@/lib/chat/heroSuggestions';
import { useNavigation } from '@/lib/NavigationContext';
import type { AgentId } from '@/types/chat';

interface HeroEmptyStateProps {
  onSendMessage: (message: string) => void;
  onOpenTakeover: () => void;
  onSetLiftingSuggestion: (suggestion: { text: string; id: string } | null) => void;
  liftingSuggestion?: { text: string; id: string } | null;
}

const agentNameToId = (name: string): AgentId => {
  const map: Record<string, AgentId> = {
    Leopoldo: 'leopoldo',
    Francisca: 'francisca',
    'Antônia': 'antonia',
  };
  return map[name] || 'leopoldo';
};

export function HeroEmptyState({ onSendMessage, onOpenTakeover, onSetLiftingSuggestion, liftingSuggestion }: HeroEmptyStateProps) {
  const { activeAgent } = useNavigation();
  const agentId = agentNameToId(activeAgent);
  const { currentGreeting } = useHeroGreeting(agentId);
  const [inputValue, setInputValue] = useState('');
  const suggestions = getHeroSuggestionsSlice(agentId);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  }, [inputValue, onSendMessage]);

  const handleSuggestionClick = useCallback(
    (text: string, suggestionId: string) => {
      // Start layoutId lift animation
      onSetLiftingSuggestion({ text, id: suggestionId });
      
      // Open takeover first
      onOpenTakeover();
      
      // Send message after animation starts
      setTimeout(() => {
        onSendMessage(text);
        onSetLiftingSuggestion(null);
      }, 400);
    },
    [onSendMessage, onOpenTakeover, onSetLiftingSuggestion]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto"
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
        {/* Avatar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAgent}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative"
          >
            <AgentAvatar
              agentName={activeAgent}
              expression="neutral"
              size="hero"
              showGlowRing
              enableIdleAnimation
            />
          </motion.div>
        </AnimatePresence>

        {/* Greeting */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`greeting-${activeAgent}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-center"
          >
            <p className="text-lg md:text-xl text-white/90 font-medium">
              {currentGreeting}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-[640px]"
        >
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSubmit}
            className="bg-white/5 backdrop-blur-xl border-white/10 shadow-lg rounded-2xl"
          >
            <PromptInputTextarea
              placeholder={`Ask ${activeAgent} anything...`}
              className="text-white placeholder:text-zinc-500"
            />
            <PromptInputActions className="flex items-center justify-between pt-2 px-1">
              <div className="flex items-center gap-1">
                <PromptInputAction tooltip="Voice input" side="top">
                  <button
                    onClick={() => onOpenTakeover()}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-zinc-300">
                      <path
                        d="M12 3v18M8 8v8M4 10v4M16 6v12M20 9v6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="opacity-70"
                      />
                    </svg>
                  </button>
                </PromptInputAction>
              </div>

              <PromptInputAction tooltip="Send message" side="top">
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-amber-400/90 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon icon="lucide:arrow-up" className="w-4 h-4 text-black" />
                </button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </motion.div>

        {/* Suggestion Pills */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`suggestions-${activeAgent}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2 max-w-[640px]"
          >
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <PromptSuggestion
                    variant="outline"
                    size="lg"
                    className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-sm px-4 py-2 h-auto"
                    onClick={() => handleSuggestionClick(suggestion.text, suggestion.id)}
                    data-lifting={liftingSuggestion?.text === suggestion.text}
                  >
                    {liftingSuggestion?.id === suggestion.id ? (
                      <motion.span
                        layoutId={`suggestion-lift-${suggestion.id}`}
                        className="inline-block"
                      >
                        {suggestion.text}
                      </motion.span>
                    ) : (
                      suggestion.text
                    )}
                  </PromptSuggestion>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
