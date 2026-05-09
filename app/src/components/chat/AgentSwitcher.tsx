'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect } from 'react';
import { AGENT_CONFIGS } from '@/types/chat';
import type { AgentId } from '@/types/chat';
import { useChatStore } from '@/lib/chat/store';
import { getAvatarUrl } from '@/lib/expressions/cloudinary';

const AGENTS: AgentId[] = ['leopoldo', 'francisca', 'antonia'];

interface AgentSwitcherProps {
  onSwitch?: (agent: AgentId) => void;
}

export function AgentSwitcher({ onSwitch }: AgentSwitcherProps) {
  const { activeAgent, isSwitching, setActiveAgent, setIsSwitching } = useChatStore();

  const handleSwitch = useCallback(
    (agent: AgentId) => {
      if (agent === activeAgent || isSwitching) return;
      setActiveAgent(agent);
      onSwitch?.(agent);
    },
    [activeAgent, isSwitching, setActiveAgent, onSwitch]
  );

  // Reset switching flag after animation completes
  useEffect(() => {
    if (isSwitching) {
      const timer = setTimeout(() => {
        setIsSwitching(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSwitching, setIsSwitching, activeAgent]);

  return (
    <div className="flex items-center justify-center gap-2" data-testid="agent-selector">
      {AGENTS.map((agentId) => {
        const config = AGENT_CONFIGS[agentId];
        const isActive = agentId === activeAgent;

        return (
          <motion.button
            key={agentId}
            onClick={() => handleSwitch(agentId)}
            className="relative flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Switch to ${config.name}`}
            aria-pressed={isActive}
          >
            {/* Active indicator background */}
            {isActive && (
              <motion.div
                layoutId="active-agent-bg"
                className="absolute inset-0 rounded-xl border-2 border-amber-400 bg-amber-400/10"
                style={{
                  boxShadow: '0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.1)',
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}

            {/* Inactive hover background */}
            {!isActive && (
              <div className="absolute inset-0 rounded-xl border border-white/10 transition-colors hover:border-white/20 hover:bg-white/5" />
            )}

            {/* Avatar */}
            <div className="relative h-8 w-8 overflow-hidden rounded-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${agentId}-${isActive ? 'active' : 'inactive'}`}
                  src={getAvatarUrl(config.name, 'neutral', 200)}
                  alt={config.name}
                  className="h-full w-full object-cover object-top"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              {/* Active glow ring */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full ring-2 ring-amber-400/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>

            {/* Agent name */}
            <span
              className={`relative z-10 text-[10px] font-medium ${
                isActive ? 'text-amber-300' : 'text-zinc-400'
              }`}
            >
              {config.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
