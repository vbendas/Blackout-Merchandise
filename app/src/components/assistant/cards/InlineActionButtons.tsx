'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type { InlineChatAction } from '@/lib/ChatContext';

interface InlineActionButtonsProps {
  actions: InlineChatAction[];
  onAction: (actionText: string) => void;
}

export function InlineActionButtons({ actions, onAction }: InlineActionButtonsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action) => {
        const isPrimary = action.variant === 'primary';
        const isOutline = action.variant === 'outline';

        return (
          <motion.button
            key={action.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction(action.action)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isPrimary
                ? 'bg-white/90 text-zinc-900 hover:bg-white'
                : isOutline
                  ? 'border border-white/20 text-zinc-400 hover:text-white hover:border-white/40'
                  : 'bg-zinc-800/60 border border-white/10 text-zinc-300 hover:bg-zinc-700/60 hover:text-white'
            }`}
          >
            {action.icon && <Icon icon={action.icon} className="w-3.5 h-3.5" />}
            <span>{action.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
