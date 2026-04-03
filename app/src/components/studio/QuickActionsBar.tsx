'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { QuickActionDef } from '@/types/quickActions';

interface QuickActionsBarProps {
  actions: QuickActionDef[];
  context: string;
  className?: string;
}

/**
 * Polished quick actions bar matching QuickPromptChips style
 * Features: Framer Motion animations, gradient backgrounds, pill shape, shimmer effects
 * Uses unified QuickActionDef type from @/types/quickActions
 */
export function QuickActionsBar({ actions, context, className }: QuickActionsBarProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col', className)} data-context={context}>
      <div className="flex flex-wrap justify-center gap-2.5 px-3">
        {actions.map((action, index) => {
          // Theme based on whether action is primary
          const theme = action.isPrimary
            ? {
                gradient: 'from-zinc-600/30 via-zinc-500/20 to-transparent',
                border: 'border-zinc-500/40 hover:border-zinc-400/60',
                glow: 'hover:shadow-zinc-400/20',
                text: 'text-zinc-300 hover:text-white',
              }
            : {
                gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
                border: 'border-zinc-700/30 hover:border-zinc-600',
                glow: 'hover:shadow-zinc-400/10',
                text: 'text-zinc-300 hover:text-white',
              };

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.handler}
              disabled={action.disabled}
              className={cn(
                'relative text-xs',
                theme.text,
                'transition-all duration-300 py-2 px-4 rounded-full',
                'bg-gradient-to-r',
                theme.gradient,
                'border',
                theme.border,
                'hover:shadow-lg',
                theme.glow,
                'overflow-hidden group',
                'flex items-center gap-1.5',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
              )}
            >
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />

              <span className="relative z-10">{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
