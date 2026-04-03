'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { AgentName } from '@/types/expressions';

interface TypingIndicatorProps {
  agentName: AgentName;
  isTyping: boolean;
}

export function TypingIndicator({ agentName, isTyping }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 italic"
        >
          <span>{agentName} is typing</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⋯
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          >
            ⋯
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          >
            ⋯
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
