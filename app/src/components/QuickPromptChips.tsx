'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AgentName } from '@/types/expressions';

interface QuickPromptChipsProps {
  agentName: AgentName;
  onSelectPrompt: (prompt: string) => void;
}

const PROMPTS_BY_AGENT: Record<AgentName, string[]> = {
  Leopoldo: ["I'd like to see the catalog", 'Can I open an eshop?', 'Help me set up my store', 'I need bulk pricing'],
  Francisca: [
    'Show me your products',
    "Let's review the design",
    'I want to see samples',
    'What are the color options?',
  ],
  Antônia: [
    'Give me a quote for bulk order',
    "Where's my order?",
    'How does shipping work?',
    "What's the price for 100 units?",
  ],
};

// Neutral grey/white theme matching Quick Actions
const NEUTRAL_THEME = {
  gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
  border: 'border-zinc-700/30 hover:border-zinc-600',
  glow: 'hover:shadow-zinc-400/10',
};

export function QuickPromptChips({ agentName, onSelectPrompt }: QuickPromptChipsProps) {
  const prompts = PROMPTS_BY_AGENT[agentName];
  const theme = NEUTRAL_THEME;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col pb-3">
      <div className="text-xs text-zinc-500 mb-3 px-3 font-medium tracking-wide flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        Try asking {agentName}
      </div>
      <div className="flex flex-wrap gap-2.5 px-3">
        {prompts.map((prompt, index) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectPrompt(prompt)}
            className={cn(
              'relative text-xs text-zinc-300 hover:text-white',
              'transition-all duration-300 py-2 px-4 rounded-full',
              'bg-gradient-to-r',
              theme.gradient,
              'border',
              theme.border,
              'hover:shadow-lg',
              theme.glow,
              'overflow-hidden group'
            )}
          >
            {/* Subtle shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            <span className="relative z-10">{prompt}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
