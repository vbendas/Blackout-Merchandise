'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { determineAgentWithContext, generateHandoffMessage } from '@/lib/chat/agentRouter';
import type { AgentId, ChatMessage } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import type { DesignFlowStep } from '@/lib/ChatContext';
import { getQuickActionsForStep } from '@/lib/designFlow';
import type { QuickAction } from '@/lib/chat/quickActions';
import { getAgentQuickActions } from '@/lib/chat/quickActions';

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
  quickActions: QuickAction[];
  designFlowStep: DesignFlowStep;
  toggleChat: () => void;
  setAgent: (agent: AgentId) => void;
  setIsVoiceMode: (enabled: boolean) => void;
  sendMessage: (content: string, metadata?: import('@/types/chat').MessageMetadata) => Promise<void>;
  sendAudio: (audioBlob: Blob) => Promise<void>;
  clearMessages: () => void;
  handleClarificationSelect: (agent: AgentId) => void;
  setDesignFlowStep: (step: DesignFlowStep) => void;
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
  const [designFlowStep, setDesignFlowStepState] = useState<DesignFlowStep>('idle');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Update quick actions when agent or design flow step changes
  useEffect(() => {
    const agentActions = getAgentQuickActions(currentAgent);
    if (designFlowStep !== 'idle' && currentAgent === 'francisca') {
      const flowActions = getQuickActionsForStep(designFlowStep);
      // Convert InlineChatAction to QuickAction format
      const converted: QuickAction[] = flowActions.map((a) => ({
        id: a.id,
        label: a.label,
        icon: a.icon || 'lucide:message-square',
        action: a.action,
      }));
      setQuickActions(converted);
    } else {
      setQuickActions(agentActions);
    }
  }, [currentAgent, designFlowStep]);

  const _mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setAgent = useCallback(
    (agent: AgentId) => {
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

        // Add welcome message from new agent after handoff delay
        setTimeout(() => {
          const welcomeMessage: ChatMessage = {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: `Hi! I'm ${AGENT_CONFIGS[agent].name}, ${AGENT_CONFIGS[agent].role}. How can I help you today?`,
            type: 'text',
            timestamp: Date.now(),
            agent: agent,
          };
          setMessages((prev) => [...prev, welcomeMessage]);
        }, HANDOFF_DELAY_MS);
      }
    },
    [currentAgent]
  );

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

  const sendMessage = useCallback(
    async (content: string, metadata?: import('@/types/chat').MessageMetadata) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        type: 'text',
        timestamp: Date.now(),
        agent: currentAgent,
        metadata,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const conversationHistory = messages.map((m) => ({
          role: m.role,
          content: m.content,
          agent: m.agent,
        }));

        const routingResult = await determineAgentWithContext({
          _message: content,
          currentAgent,
          context: { message: content },
          history: conversationHistory,
        });

        if (routingResult.needsClarification && routingResult.clarificationOptions) {
          const clarificationMessage: ChatMessage = {
            id: `clarification-${Date.now()}`,
            role: 'assistant',
            content: '',
            type: 'text',
            timestamp: Date.now(),
            agent: currentAgent,
            clarificationData: {
              options: routingResult.clarificationOptions,
            },
          };
          setMessages((prev) => [...prev, clarificationMessage]);
          setIsTyping(false);
          return;
        }

        const needsHandoff = routingResult.shouldHandoff;
        let agentForApi = currentAgent;

        if (needsHandoff && routingResult.agent !== 'unknown') {
          const handoffMessage: ChatMessage = {
            id: `handoff-${Date.now()}`,
            role: 'assistant',
            content:
              routingResult.handoffMessage || generateHandoffMessage(currentAgent, routingResult.agent as AgentId),
            type: 'text',
            timestamp: Date.now(),
            agent: currentAgent,
          };
          setMessages((prev) => [...prev, handoffMessage]);

          agentForApi = routingResult.agent as AgentId;

          await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));

          setCurrentAgent(routingResult.agent as AgentId);
        }

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

        // Check if API response includes card data
        const assistantMetadata: import('@/types/chat').MessageMetadata | undefined = data.cardData
          ? { cardData: data.cardData }
          : undefined;

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          type: data.cardData ? 'card' : 'text',
          timestamp: Date.now(),
          agent: agentForApi,
          metadata: assistantMetadata,
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
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [currentAgent, messages, fetchSuggestions]
  );

  const sendAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsRecording(true);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('agent', currentAgent);
        formData.append(
          'history',
          JSON.stringify(messages.slice(-10).map((m) => ({ role: m.role, content: m.content })))
        );

        const response = await fetch('/api/chat/voice/process', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        const transcription = data.transcription || '';

        const conversationHistory = messages.map((m) => ({
          role: m.role,
          content: m.content,
          agent: m.agent,
        }));

        const routingResult = await determineAgentWithContext({
          _message: transcription,
          currentAgent,
          context: { message: transcription },
          history: conversationHistory,
        });

        if (transcription) {
          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: transcription,
            type: 'voice',
            audioBlob,
            timestamp: Date.now(),
            agent: currentAgent,
          };
          setMessages((prev) => [...prev, userMessage]);
        }

        if (routingResult.needsClarification && routingResult.clarificationOptions) {
          const clarificationMessage: ChatMessage = {
            id: `clarification-${Date.now()}`,
            role: 'assistant',
            content: '',
            type: 'text',
            timestamp: Date.now(),
            agent: currentAgent,
            clarificationData: {
              options: routingResult.clarificationOptions,
            },
          };
          setMessages((prev) => [...prev, clarificationMessage]);
          return;
        }

        const needsHandoff = routingResult.shouldHandoff;

        if (needsHandoff && routingResult.agent !== 'unknown') {
          const handoffMessage: ChatMessage = {
            id: `handoff-${Date.now()}`,
            role: 'assistant',
            content:
              routingResult.handoffMessage || generateHandoffMessage(currentAgent, routingResult.agent as AgentId),
            type: 'text',
            timestamp: Date.now(),
            agent: currentAgent,
          };
          setMessages((prev) => [...prev, handoffMessage]);

          await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));

          setCurrentAgent(routingResult.agent as AgentId);

          const newAgentFormData = new FormData();
          newAgentFormData.append('audio', audioBlob, 'audio.webm');
          newAgentFormData.append('agent', routingResult.agent as AgentId);
          newAgentFormData.append(
            'history',
            JSON.stringify(messages.slice(-10).map((m) => ({ role: m.role, content: m.content })))
          );

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
              type: 'voice',
              audioUrl: newAgentData.audioData || undefined,
              timestamp: Date.now(),
              agent: routingResult.agent as AgentId,
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
        } else {
          if (data.response) {
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response,
              type: 'voice',
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
    },
    [currentAgent, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
  }, []);

  const handleClarificationSelect = useCallback(
    (agent: AgentId) => {
      setMessages((prev) => prev.filter((m) => !m.clarificationData));

      const handoffMessage: ChatMessage = {
        id: `handoff-${Date.now()}`,
        role: 'assistant',
        content: generateHandoffMessage(currentAgent, agent),
        type: 'text',
        timestamp: Date.now(),
        agent: currentAgent,
      };
      setMessages((prev) => [...prev, handoffMessage]);
      setCurrentAgent(agent);
    },
    [currentAgent]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

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

  const setDesignFlowStep = useCallback((step: DesignFlowStep) => {
    setDesignFlowStepState(step);
  }, []);

  const value: ChatContextValue = {
    isOpen,
    currentAgent,
    messages,
    isVoiceMode,
    isRecording,
    isPlaying,
    isTyping,
    suggestions,
    quickActions,
    designFlowStep,
    toggleChat,
    setAgent,
    setIsVoiceMode,
    sendMessage,
    sendAudio,
    clearMessages,
    handleClarificationSelect,
    setDesignFlowStep,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
