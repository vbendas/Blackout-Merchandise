'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AgentId, ChatMessage, HandoffStatus } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import { determineAgent, generateHandoffMessage } from '@/lib/chat/agentRouter';
import type { QuickAction } from '@/lib/chat/quickActions';
import { getAgentQuickActions, withHumanHandoff } from '@/lib/chat/quickActions';

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
  handoffStatus: HandoffStatus;
  handoffTicketId?: string;
  assignedStaffName?: string;
  contactEmail?: string;
  toggleChat: () => void;
  setAgent: (agent: AgentId) => void;
  setIsVoiceMode: (enabled: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  sendAudio: (audioBlob: Blob) => Promise<void>;
  clearMessages: () => void;
  requestHumanHandoff: (email?: string) => Promise<void>;
  cancelHandoff: () => void;
  setContactEmail: (email: string) => void;
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

export function CatChatProvider({ children, initialAgent = 'leopoldo' }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentId>(initialAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Human handoff state
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('none');
  const [handoffTicketId, setHandoffTicketId] = useState<string | undefined>();
  const [assignedStaffName, setAssignedStaffName] = useState<string | undefined>();
  const [contactEmail, setContactEmailState] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update quick actions when agent changes
  useEffect(() => {
    setQuickActions(handoffStatus === 'none' ? withHumanHandoff(getAgentQuickActions(currentAgent)) : getAgentQuickActions(currentAgent));
  }, [currentAgent, handoffStatus]);

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

  // ── Human Handoff ───────────────────────────────────────────────────

  const setContactEmail = useCallback((email: string) => {
    setContactEmailState(email);
  }, []);

  const requestHumanHandoff = useCallback(
    async (email?: string) => {
      const emailToUse = email || contactEmail;
      if (!emailToUse) {
        setHandoffStatus('awaiting_email');
        return;
      }

      setHandoffStatus('requested');

      try {
        const response = await fetch('/api/support/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: currentAgent,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
              agent: m.agent,
            })),
            contactEmail: emailToUse,
          }),
        });

        if (!response.ok) {
          throw new Error(`Handoff API error: ${response.status}`);
        }

        const data = await response.json();

        setHandoffTicketId(data.ticketId);
        setHandoffStatus('queued');
        setAssignedStaffName(data.assignedStaffName);

        // Add system message about handoff
        const handoffMessage: ChatMessage = {
          id: `handoff-system-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          type: 'text',
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, handoffMessage]);
      } catch (error) {
        console.error('Handoff error:', error);
        setHandoffStatus('none');
        const errorMessage: ChatMessage = {
          id: `handoff-error-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I couldn't connect you with a human right now. Please try again in a moment.",
          type: 'text',
          timestamp: Date.now(),
          agent: currentAgent,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [currentAgent, messages, contactEmail]
  );

  const cancelHandoff = useCallback(() => {
    setHandoffStatus('none');
    setHandoffTicketId(undefined);
    setAssignedStaffName(undefined);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Polling for ticket status updates
  useEffect(() => {
    if (
      handoffStatus === 'queued' ||
      handoffStatus === 'assigned'
    ) {
      pollingIntervalRef.current = setInterval(async () => {
        if (!handoffTicketId) return;

        try {
          const response = await fetch(
            `/api/support/handoff?ticketId=${handoffTicketId}`
          );
          if (!response.ok) return;

          const data = await response.json();

          if (data.status === 'in_progress') {
            setHandoffStatus('human_joined');
            // Add system message that human has joined
            const joinMessage: ChatMessage = {
              id: `human-joined-${Date.now()}`,
              role: 'assistant',
              content: `${data.assignedStaffName || 'A team member'} has joined the conversation.`,
              type: 'text',
              timestamp: Date.now(),
              agent: currentAgent,
            };
            setMessages((prev) => [...prev, joinMessage]);
          } else if (data.status === 'resolved') {
            setHandoffStatus('resolved');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000); // Poll every 10 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [handoffStatus, handoffTicketId, currentAgent]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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
    quickActions,
    handoffStatus,
    handoffTicketId,
    assignedStaffName,
    contactEmail,
    toggleChat,
    setAgent,
    setIsVoiceMode,
    sendMessage,
    sendAudio,
    clearMessages,
    requestHumanHandoff,
    cancelHandoff,
    setContactEmail,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
