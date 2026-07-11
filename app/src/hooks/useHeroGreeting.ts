'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentId } from '@/types/chat';
import { HERO_GREETINGS } from '@/types/chat';

interface UseHeroGreetingResult {
  currentGreeting: string;
  refreshGreeting: () => void;
}

/**
 * Hook to get a random professional greeting for the hero section
 * Uses HERO_GREETINGS which are more professional than AGENT_GREETINGS
 */
export function useHeroGreeting(agentId: AgentId): UseHeroGreetingResult {
  const [greetingIndex, setGreetingIndex] = useState(0);

  const getRandomGreeting = useCallback((agent: AgentId) => {
    const greetings = HERO_GREETINGS[agent];
    return Math.floor(Math.random() * greetings.length);
  }, []);

  useEffect(() => {
    const index = getRandomGreeting(agentId);
    setGreetingIndex(index);
  }, [agentId, getRandomGreeting]);

  const refreshGreeting = useCallback(() => {
    const greetings = HERO_GREETINGS[agentId];
    setGreetingIndex((prev: number) => {
      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * greetings.length);
      } while (newIndex === prev && greetings.length > 1);
      return newIndex;
    });
  }, [agentId]);

  return {
    currentGreeting: HERO_GREETINGS[agentId][greetingIndex],
    refreshGreeting,
  };
}
