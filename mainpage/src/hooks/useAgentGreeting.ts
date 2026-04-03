'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentId } from '@/types/chat';
import { AGENT_GREETINGS } from '@/types/chat';

interface UseAgentGreetingResult {
  currentGreeting: string;
  refreshGreeting: () => void;
}

/**
 * Hook to get a random greeting for the current agent
 * Greetings rotate based on the agent and can be refreshed manually
 */
export function useAgentGreeting(agentId: AgentId): UseAgentGreetingResult {
  const [greetingIndex, setGreetingIndex] = useState(0);

  // Get random greeting for the agent
  const getRandomGreeting = useCallback((agent: AgentId) => {
    const greetings = AGENT_GREETINGS[agent];
    return Math.floor(Math.random() * greetings.length);
  }, []);

  // Set random greeting on mount or agent change
  useEffect(() => {
    const index = getRandomGreeting(agentId);
    setGreetingIndex(index);
  }, [agentId, getRandomGreeting]);

  // Function to refresh to a different greeting
  const refreshGreeting = useCallback(() => {
    const greetings = AGENT_GREETINGS[agentId];
    setGreetingIndex((prev: number) => {
      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * greetings.length);
      } while (newIndex === prev && greetings.length > 1);
      return newIndex;
    });
  }, [agentId]);

  return {
    currentGreeting: AGENT_GREETINGS[agentId][greetingIndex],
    refreshGreeting,
  };
}
