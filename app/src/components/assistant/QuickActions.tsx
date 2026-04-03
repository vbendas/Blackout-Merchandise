'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/lib/ChatContext';

const QUICK_ACTIONS = {
  Leopoldo: [
    { label: 'View sales', action: 'Show me my sales' },
    { label: 'Check revenue', action: 'What is my revenue?' },
    { label: 'Store analytics', action: 'Show store analytics' },
  ],
  Francisca: [
    { label: 'Create mockup', action: 'I want to create a mockup' },
    { label: 'Browse catalog', action: 'Show me the catalog' },
    { label: 'Start design', action: 'Help me start a design' },
  ],
  Antônia: [
    { label: 'Track order', action: 'Track my order' },
    { label: 'Get help', action: 'I need help' },
    { label: 'Contact support', action: 'Contact support' },
  ],
};

export function QuickActions() {
  const { currentAgent, sendMessage } = useChat();

  const actions = QUICK_ACTIONS[currentAgent];

  const handleActionClick = (action: string) => {
    sendMessage(action);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-wrap justify-center gap-2 px-4"
    >
      {actions.map((item, index) => (
        <motion.button
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleActionClick(item.action)}
          className="rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 shadow-lg backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
        >
          {item.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
