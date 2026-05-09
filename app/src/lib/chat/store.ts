'use client';

import { create } from 'zustand';
import type { AgentId } from '@/types/chat';

interface ChatStore {
  activeAgent: AgentId;
  isSwitching: boolean;
  setActiveAgent: (agent: AgentId) => void;
  setIsSwitching: (switching: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeAgent: 'leopoldo',
  isSwitching: false,
  setActiveAgent: (agent) =>
    set((state) => {
      if (state.activeAgent === agent) return state;
      return { activeAgent: agent, isSwitching: true };
    }),
  setIsSwitching: (switching) => set({ isSwitching: switching }),
}));
