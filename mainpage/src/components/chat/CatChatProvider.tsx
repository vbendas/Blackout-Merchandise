'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AgentId, ChatMessage } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import { determineAgent, generateHandoffMessage } from '@/lib/chat/agentRouter';

const HANDOFF_DELAY_MS = 400;

interface ChatContextValue {
  isOpen: boolean;
  currentAgent: AgentId;
  messages: ChatMessage[];
  isVoiceMode: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  isTyping: boolean;
  suggestions: string[];
  toggleChat: () => void;
  setAgent: (agent: AgentId) => void;
  setIsVoiceMode: (enabled: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  sendAudio: (audioBlob: Blob) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: React.ReactNode;
  initialAgent?: AgentId;
}

export function CatChatProvider({ children, initialAgent = 'antonia' }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentId>(initialAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const _mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setAgent = useCallback((agent: AgentId) => {
    if (agent !== currentAgent) {
      const handoffMsg = generateHandoffMessage(currentAgent, agent);
      const handoffMessage: ChatMessage = {
        id: `handoff-${Date.now()}`,
        role: 'assistant',
        content: handoffMsg,
        type: 'text',
        timestamp: Date.now(),
        agent: currentAgent,
      };
      setMessages((prev) => [...prev, handoffMessage]);
      setCurrentAgent(agent);
    }
  }, [currentAgent]);

  const fetchSuggestions = useCallback(async (history: ChatMessage[], agent: AgentId) => {
    try {
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: history.map((m) => ({ role: m.role, content: m.content })),
          agent,
        }),
      });
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      timestamp: Date.now(),
      agent: currentAgent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const context = { message: content };
    const { agent: targetAgent } = determineAgent({ 
      _message: content, 
      currentAgent, 
      context 
    });

    const needsHandoff = targetAgent !== currentAgent;
    let agentForApi = currentAgent;

    if (needsHandoff) {
      const handoffMsg = generateHandoffMessage(currentAgent, targetAgent);
      const handoffMessage: ChatMessage = {
        id: `handoff-${Date.now()}`,
        role: 'assistant',
        content: handoffMsg,
        type: 'text',
        timestamp: Date.now(),
        agent: currentAgent,
      };
      setMessages((prev) => [...prev, handoffMessage]);
      
      agentForApi = targetAgent;
      
      await new Promise(resolve => setTimeout(resolve, HANDOFF_DELAY_MS));
      
      setCurrentAgent(targetAgent);
    }

    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          agent: agentForApi,
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        type: 'text',
        timestamp: Date.now(),
        agent: agentForApi,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      const updatedHistory = [...messages, userMessage, assistantMessage];
      fetchSuggestions(updatedHistory, agentForApi);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I didn't catch that. Could you try again?",
        type: 'text',
        timestamp: Date.now(),
        agent: agentForApi,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [currentAgent, messages, fetchSuggestions]);

  const sendAudio = useCallback(async (audioBlob: Blob) => {
    setIsRecording(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('agent', currentAgent);
      formData.append('history', JSON.stringify(messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))));

      const response = await fetch('/api/chat/voice/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      const transcription = data.transcription || '';

      const context = { message: transcription };
      const { agent: targetAgent } = determineAgent({ 
        _message: transcription, 
        currentAgent, 
        context 
      });

      const needsHandoff = targetAgent !== currentAgent;

      if (transcription) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: transcription,
          type: 'audio',
          audioBlob,
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      if (needsHandoff) {
        const handoffMsg = generateHandoffMessage(currentAgent, targetAgent);
        const handoffMessage: ChatMessage = {
          id: `handoff-${Date.now()}`,
          role: 'assistant',
          content: handoffMsg,
          type: 'text',
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, handoffMessage]);
        
        await new Promise(resolve => setTimeout(resolve, HANDOFF_DELAY_MS));
        
        setCurrentAgent(targetAgent);
        
        const newAgentFormData = new FormData();
        newAgentFormData.append('audio', audioBlob, 'audio.webm');
        newAgentFormData.append('agent', targetAgent);
        newAgentFormData.append('history', JSON.stringify(messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))));

        const newAgentResponse = await fetch('/api/chat/voice/process', {
          method: 'POST',
          body: newAgentFormData,
        });
        const newAgentData = await newAgentResponse.json();

        if (newAgentData.response) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: newAgentData.response,
            type: 'audio',
            audioUrl: newAgentData.audioData || undefined,
            timestamp: Date.now(),
            agent: targetAgent,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } else {
        if (data.response) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            type: 'audio',
            audioUrl: data.audioData || undefined,
            timestamp: Date.now(),
            agent: currentAgent,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Voice error:', error);
    } finally {
      setIsRecording(false);
    }
  }, [currentAgent, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm ${AGENT_CONFIGS[currentAgent].name}, ${AGENT_CONFIGS[currentAgent].role}. How can I help you today?`,
        type: 'text',
        timestamp: Date.now(),
        agent: currentAgent,
      };
      setMessages([welcomeMessage]);
      fetchSuggestions([welcomeMessage], currentAgent);
    }
  }, [isOpen, currentAgent, messages.length, fetchSuggestions]);

  const value: ChatContextValue = {
    isOpen,
    currentAgent,
    messages,
    isVoiceMode,
    isRecording,
    isPlaying,
    isTyping,
    suggestions,
    toggleChat,
    setAgent,
    setIsVoiceMode,
    sendMessage,
    sendAudio,
    clearMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
