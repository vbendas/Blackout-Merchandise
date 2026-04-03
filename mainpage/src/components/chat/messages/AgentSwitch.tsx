'use client';

import { motion } from 'framer-motion';
import { Agent } from '@/types/chat';

interface AgentSwitchProps {
  from: Agent;
  to: Agent;
  reason?: string;
}

export function AgentSwitch({ from, to, reason }: AgentSwitchProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center my-4"
    >
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-full px-4 py-2 text-center">
        <p className="text-xs text-zinc-400">
          {from} handed you to {to}
          {reason && ` for ${reason}`}
        </p>
      </div>
    </motion.div>
  );
}
