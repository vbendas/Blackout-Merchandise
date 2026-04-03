'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type React from 'react';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { type ActiveAgent, useNavigation } from '@/lib/NavigationContext';

// Agent configuration
const AGENTS: Array<{
  name: ActiveAgent;
  icon: string;
  color: string;
}> = [
  { name: 'Leopoldo', icon: 'user', color: 'blue' },
  { name: 'Francisca', icon: 'user', color: 'pink' },
  { name: 'Antônia', icon: 'user', color: 'green' },
];

export function AgentSelector(): React.ReactElement {
  const { activeAgent, setAgent } = useNavigation();
  const { setExpression } = useAvatarExpression();

  const handleSetAgent = (agent: ActiveAgent): void => {
    setAgent(agent);
    // Reset expression when switching agents
    setExpression('neutral');

    // Add brief feedback animation
    setTimeout(() => {
      setExpression('proud');
      setTimeout(() => setExpression('neutral'), 500);
    }, 100);
  };

  return (
    <div className="flex gap-2 justify-center">
      {AGENTS.map((agent) => {
        const isActive = activeAgent === agent.name;
        return (
          <motion.button
            key={agent.name}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1, rotate: 2 }}
            onClick={() => handleSetAgent(agent.name)}
            title={agent.name}
            aria-pressed={isActive}
            aria-label={`Select ${agent.name} agent`}
            tabIndex={0}
            className={`
              w-12 h-12 rounded-full
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950
              ${
                isActive
                  ? 'bg-zinc-700 ring-2 ring-zinc-500 shadow-lg shadow-zinc-950/30 scale-110'
                  : 'bg-zinc-900 hover:bg-zinc-800 hover:ring-1 hover:ring-zinc-600 hover:scale-105'
              }
            `}
          >
            <Icon
              icon={`solar:${agent.icon}-circle-linear`}
              width={24}
              className={isActive ? 'text-white' : 'text-zinc-400'}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
