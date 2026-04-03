'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AgentId, LegacyAgent, Workflow, ChatMessage, ChatState } from '@/types/chat';

interface ChatContextType extends ChatState {
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  switchAgent: (agent: LegacyAgent, reason?: string) => void;
  setVoiceMode: (isVoice: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateWorkflow: (workflow: Workflow, state?: Record<string, any>) => void;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type Action =
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SWITCH_AGENT'; payload: { agent: AgentId; reason?: string } }
  | { type: 'SET_VOICE_MODE'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_WORKFLOW'; payload: { workflow: Workflow; state?: Record<string, any> } }
  | { type: 'CLEAR_CHAT' }
  | { type: 'HYDRATE'; payload: ChatState };

const STORAGE_KEY = 'merchfrom_chat_session';

const initialState: ChatState = {
  isOpen: false,
  currentAgent: 'antonia',
  messages: [],
  isVoiceMode: false,
  currentWorkflow: 'general',
  workflowState: {},
  suggestions: [],
};

function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'OPEN_CHAT':
      return { ...state, isOpen: true };
    case 'CLOSE_CHAT':
      return { ...state, isOpen: false };
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };
    case 'SWITCH_AGENT': {
      const agentMap: Record<LegacyAgent, AgentId> = {
        Leopoldo: 'leopoldo',
        Francisca: 'francisca',
        Antônia: 'antonia',
      };
      return {
        ...state,
        lastAgent: state.currentAgent,
        currentAgent: agentMap[action.payload.agent as LegacyAgent] || 'antonia',
      };
    }
    case 'SET_VOICE_MODE':
      return { ...state, isVoiceMode: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_WORKFLOW':
      return {
        ...state,
        currentWorkflow: action.payload.workflow,
        workflowState: { ...state.workflowState, ...action.payload.state },
      };
    case 'CLEAR_CHAT':
      return { ...initialState };
    case 'HYDRATE':
      return action.payload;
    default:
      return state;
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'HYDRATE', payload: parsed });
      } catch (e) {
        console.error('Failed to hydrate chat state:', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const openChat = () => dispatch({ type: 'OPEN_CHAT' });
  const closeChat = () => dispatch({ type: 'CLOSE_CHAT' });
  const toggleChat = () => dispatch({ type: 'TOGGLE_CHAT' });
  
  const switchAgent = (agent: LegacyAgent, reason?: string) => {
    const agentMap: Record<LegacyAgent, AgentId> = {
      Leopoldo: 'leopoldo',
      Francisca: 'francisca',
      Antônia: 'antonia',
    };
    dispatch({ type: 'SWITCH_AGENT', payload: { agent: agentMap[agent], reason } });
  };
  
  const setVoiceMode = (isVoice: boolean) => {
    dispatch({ type: 'SET_VOICE_MODE', payload: isVoice });
  };
  
  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const fullMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: fullMessage });
  };
  
  const updateWorkflow = (workflow: Workflow, state?: Record<string, any>) => {
    dispatch({ type: 'UPDATE_WORKFLOW', payload: { workflow, state } });
  };
  
  const clearChat = () => dispatch({ type: 'CLEAR_CHAT' });

  return (
    <ChatContext.Provider
      value={{
        ...state,
        openChat,
        closeChat,
        toggleChat,
        switchAgent,
        setVoiceMode,
        addMessage,
        updateWorkflow,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
