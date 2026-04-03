'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ChatMessage, AgentId, LegacyAgent } from '../types/chat';

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  sessionId: string | null;
  currentAgent: AgentId;
}

type ChatAction =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_AGENT'; payload: AgentId }
  | { type: 'CLEAR_MESSAGES' };

const initialState: ChatState = {
  messages: [],
  isOpen: false,
  isLoading: false,
  sessionId: null,
  currentAgent: 'antonia',
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_AGENT':
      return { ...state, currentAgent: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (message: string) => Promise<void>;
  toggleChat: () => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('chat_session_id');
    if (savedSessionId) {
      dispatch({ type: 'SET_SESSION_ID', payload: savedSessionId });
      loadChatHistory(savedSessionId);
    }
  }, []);

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat?sessionId=${sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.session?.messages) {
          data.session.messages.forEach((msg: ChatMessage) => {
            dispatch({ type: 'ADD_MESSAGE', payload: msg });
          });
          const lastAgentMsg = data.session.messages
            .reverse()
            .find((msg: ChatMessage) => msg.role === 'assistant' && msg.agent);
          if (lastAgentMsg?.agent) {
            dispatch({ type: 'SET_AGENT', payload: lastAgentMsg.agent });
          }
        }
      }
    } catch {
      // Failed to load chat history
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      type: 'text',
      timestamp: Date.now(),
      agent: 'antonia',
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: state.sessionId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.sessionId && !state.sessionId) {
        localStorage.setItem('chat_session_id', data.sessionId);
        dispatch({ type: 'SET_SESSION_ID', payload: data.sessionId });
      }

      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
      dispatch({ type: 'SET_AGENT', payload: data.agent });
    } catch {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        type: 'text',
        agent: state.currentAgent,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const toggleChat = () => {
    dispatch({ type: 'TOGGLE_CHAT' });
  };

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    localStorage.removeItem('chat_session_id');
    dispatch({ type: 'SET_SESSION_ID', payload: null });
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        sendMessage,
        toggleChat,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
