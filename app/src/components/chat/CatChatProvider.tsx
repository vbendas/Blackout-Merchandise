'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AgentId, ChatMessage, RoutingDecision, HandoffStatus } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import type { DesignFlowStep } from '@/lib/ChatContext';
import { getQuickActionsForStep } from '@/lib/designFlow';
import type { QuickAction } from '@/lib/chat/quickActions';
import { getAgentQuickActions, withHumanHandoff } from '@/lib/chat/quickActions';
import { isDemoMode, getDemoResponse, getDemoGreeting } from '@/lib/ai/demoResponses';

const HANDOFF_DELAY_MS = 400;

const HANDOFF_MESSAGES: Record<AgentId, Record<AgentId, string>> = {
  leopoldo: {
    leopoldo: '',
    francisca: 'This is a design matter. Francisca, can you take over?',
    antonia: 'For this, Antônia is your best bet. She handles operations.',
  },
  francisca: {
    leopoldo: 'Business question? Leopoldo will know best.',
    francisca: '',
    antonia: "Let me get Antônia for you - she's our operations expert.",
  },
  antonia: {
    leopoldo: 'Leopoldo would be better for this. Let me bring him in.',
    francisca: 'Francisca handles design questions. One moment...',
    antonia: '',
  },
};

function getHandoffMessage(fromAgent: AgentId, toAgent: AgentId): string {
  return HANDOFF_MESSAGES[fromAgent]?.[toAgent] || `Let me connect you with ${toAgent.charAt(0).toUpperCase() + toAgent.slice(1)}.`;
}

async function routeMessageServer(options: {
  message: string;
  currentAgent: AgentId;
  history: Array<{ role: 'user' | 'assistant'; content: string; agent?: AgentId }>;
}): Promise<RoutingDecision> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error(`Routing API error: ${response.status}`);
  }
  return response.json();
}

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
  handoffStatus: HandoffStatus;
  handoffTicketId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  contactEmail?: string;
  toggleChat: () => void;
  setAgent: (agent: AgentId) => void;
  setIsVoiceMode: (enabled: boolean) => void;
  sendMessage: (content: string, metadata?: import('@/types/chat').MessageMetadata) => Promise<void>;
  sendAudio: (audioBlob: Blob) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearMessages: () => void;
  setDesignFlowStep: (step: DesignFlowStep) => void;
  requestHumanHandoff: (email?: string) => Promise<void>;
  cancelHandoff: () => void;
  setContactEmail: (email: string) => void;
  enterStudioMode: () => void;
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
  const [designFlowStep, setDesignFlowStepState] = useState<DesignFlowStep>('idle');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('none');
  const [handoffTicketId, setHandoffTicketId] = useState<string | undefined>();
  const [assignedStaffName, setAssignedStaffName] = useState<string | undefined>();
  const [assignedStaffRole, setAssignedStaffRole] = useState<string | undefined>();
  const [contactEmail, setContactEmailState] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update quick actions when agent or design flow step changes
  useEffect(() => {
    let actions: QuickAction[];
    const agentActions = getAgentQuickActions(currentAgent);
    if (designFlowStep !== 'idle' && currentAgent === 'francisca') {
      const flowActions = getQuickActionsForStep(designFlowStep);
      // Convert InlineChatAction to QuickAction format
      actions = flowActions.map((a) => ({
        id: a.id,
        label: a.label,
        icon: a.icon || 'lucide:message-square',
        action: a.action,
      }));
    } else {
      actions = agentActions;
    }
    setQuickActions(handoffStatus === 'none' ? withHumanHandoff(actions) : actions);
  }, [currentAgent, designFlowStep, handoffStatus]);

  const _mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setAgent = useCallback(
    (agent: AgentId) => {
      if (agent !== currentAgent) {
        const handoffMsg = getHandoffMessage(currentAgent, agent);
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

      if (!response.ok) {
        console.warn('[Suggestions] API returned', response.status);
        return;
      }

      // Guard against non-JSON responses (e.g., HTML from redirects)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('[Suggestions] Non-JSON response:', contentType);
        return;
      }

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
        // DEMO MODE — use scripted responses, skip API calls
        if (isDemoMode()) {
          // Count messages for this agent in the current conversation
          const agentMessageCount = messages.filter(
            (m) => m.role === 'assistant' && m.agent === currentAgent
          ).length;

          const demoResponse = getDemoResponse(currentAgent, content, agentMessageCount);
          const delay = demoResponse.delay || 800;

          // Simulate thinking delay
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Handle handoff
          if (demoResponse.handoffTo) {
            const handoffMsg = getHandoffMessage(currentAgent, demoResponse.handoffTo);
            const handoffMessage: ChatMessage = {
              id: `handoff-${Date.now()}`,
              role: 'assistant',
              content: handoffMsg,
              type: 'text',
              timestamp: Date.now(),
              agent: currentAgent,
            };
            setMessages((prev) => [...prev, handoffMessage]);

            await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));
            setCurrentAgent(demoResponse.handoffTo);

            const welcomeMessage: ChatMessage = {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: getDemoGreeting(demoResponse.handoffTo),
              type: 'text',
              timestamp: Date.now(),
              agent: demoResponse.handoffTo,
            };
            setMessages((prev) => [...prev, welcomeMessage]);
            setIsTyping(false);
            return;
          }

          // Regular demo response — stream it
          setIsTyping(false);
          const assistantMessageId = (Date.now() + 1).toString();
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            type: demoResponse.cardData ? 'card' : 'text',
            timestamp: Date.now(),
            agent: currentAgent,
            metadata: demoResponse.cardData ? { cardData: demoResponse.cardData as import('@/types/chat').CardMessageData } : undefined,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Simulate typewriter streaming for demo
          let accumulated = '';
          const chars = demoResponse.content.split('');
          for (let i = 0; i < chars.length; i += 3) {
            accumulated += chars.slice(i, i + 3).join('');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, content: accumulated } : m
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 16));
          }

          // Ensure full content is set
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: demoResponse.content } : m
            )
          );
          return;
        }

        // LIVE MODE — use real AI API
        const conversationHistory = messages
          .filter((m) => m.role !== 'human')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            agent: m.agent,
          }));

        // Phase 1: Route the message (fast, non-streaming)
        const routingResult = await routeMessageServer({
          message: content,
          currentAgent,
          history: conversationHistory,
        });

        // Never show clarification UI — route to best-guess agent or stay with current
        if (routingResult.needsClarification && routingResult.clarificationOptions) {
          const bestAgent = routingResult.clarificationOptions[0]?.agent ?? currentAgent;
          if (bestAgent !== currentAgent) {
            const handoffMessage: ChatMessage = {
              id: `handoff-${Date.now()}`,
              role: 'assistant',
              content: getHandoffMessage(currentAgent, bestAgent),
              type: 'text',
              timestamp: Date.now(),
              agent: currentAgent,
            };
            setMessages((prev) => [...prev, handoffMessage]);
            setCurrentAgent(bestAgent);
            await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));
          }
        }

        const needsHandoff = routingResult.shouldHandoff;
        let agentForApi = currentAgent;

        if (needsHandoff && routingResult.agent !== 'unknown') {
          const handoffMessage: ChatMessage = {
            id: `handoff-${Date.now()}`,
            role: 'assistant',
            content:
              routingResult.handoffMessage || getHandoffMessage(currentAgent, routingResult.agent as AgentId),
            type: 'text',
            timestamp: Date.now(),
            agent: currentAgent,
          };
          setMessages((prev) => [...prev, handoffMessage]);

          agentForApi = routingResult.agent as AgentId;

          await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));

          setCurrentAgent(routingResult.agent as AgentId);
        }

        // Phase 2: Stream the response with SSE
        const assistantMessageId = (Date.now() + 1).toString();

        // Add placeholder message for streaming
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          type: 'text',
          timestamp: Date.now(),
          agent: agentForApi,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Now hide the typing indicator — the streaming message itself shows progress
        setIsTyping(false);

        const response = await fetch('/api/chat/unified?stream=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            agent: agentForApi,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.status}`);
        }

        // Read the SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                accumulated += parsed.content;
                // Update the streaming message in place
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch (parseError) {
              // If it's our thrown error, re-throw
              if (parseError instanceof Error && parseError.message !== 'Unexpected token') {
                throw parseError;
              }
              // Skip malformed JSON
            }
          }
        }

        // Fetch suggestions with the complete history
        const finalAssistantMessage: ChatMessage = {
          ...assistantMessage,
          content: accumulated,
        };
        const updatedHistory = [...messages, userMessage, finalAssistantMessage];
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

        if (!response.ok) {
          throw new Error(`Voice API error: ${response.status}`);
        }

        const data = await response.json();
        const transcription = data.transcription || '';

        const conversationHistory = messages
          .filter((m) => m.role !== 'human')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            agent: m.agent,
          }));

    const routingResult = await routeMessageServer({
      message: transcription,
      currentAgent,
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

        // Never show clarification UI — route to best-guess agent or stay with current
        if (routingResult.needsClarification && routingResult.clarificationOptions) {
          const bestAgent = routingResult.clarificationOptions[0]?.agent ?? currentAgent;
          if (bestAgent !== currentAgent) {
            const handoffMessage: ChatMessage = {
              id: `handoff-${Date.now()}`,
              role: 'assistant',
              content: getHandoffMessage(currentAgent, bestAgent),
              type: 'text',
              timestamp: Date.now(),
              agent: currentAgent,
            };
            setMessages((prev) => [...prev, handoffMessage]);
            setCurrentAgent(bestAgent);
            await new Promise((resolve) => setTimeout(resolve, HANDOFF_DELAY_MS));
          }
        }

        const needsHandoff = routingResult.shouldHandoff;

        if (needsHandoff && routingResult.agent !== 'unknown') {
          const handoffMessage: ChatMessage = {
            id: `handoff-${Date.now()}`,
            role: 'assistant',
            content:
              routingResult.handoffMessage || getHandoffMessage(currentAgent, routingResult.agent as AgentId),
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

          if (!newAgentResponse.ok) {
            throw new Error(`Voice API (handoff) error: ${newAgentResponse.status}`);
          }

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
        setAssignedStaffRole(data.assignedStaffRole);

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
    setAssignedStaffRole(undefined);
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
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = isDemoMode()
        ? getDemoGreeting(currentAgent)
        : `Hi! I'm ${AGENT_CONFIGS[currentAgent].name}, ${AGENT_CONFIGS[currentAgent].role}. How can I help you today?`;
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
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
    handoffStatus,
    handoffTicketId,
    assignedStaffName,
    assignedStaffRole,
    contactEmail,
    toggleChat,
    setAgent,
    setIsVoiceMode,
    sendMessage,
    sendAudio,
    setMessages,
    clearMessages,
    setDesignFlowStep,
    requestHumanHandoff,
    cancelHandoff,
    setContactEmail,
    enterStudioMode: () => {
      setAgent('francisca');
      setDesignFlowStep('awaiting-prompt');
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
