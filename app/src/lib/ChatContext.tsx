'use client';

import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AgentName } from '@/types/expressions';
import { miniMaxProvider } from './ai/provider';
import { generateFranciscaResponse } from './designFlowHandlers';

// Types
export type ChatAgent = AgentName;

// Rich message content types
export type MessageContentType =
  | 'text' // Plain text (default)
  | 'image' // Design image (uploaded or AI-generated)
  | 'mockup' // Product mockup with design applied
  | 'upload-prompt' // Upload CTA with drag-drop zone
  | 'action-buttons' // Inline action buttons
  | 'transformation' // Before/after transformation result
  | 'price-summary' // Price breakdown card
  | 'color-separation' // Color separation preview
  | 'product-select'; // Product selection carousel

// Inline action button definition
export interface InlineChatAction {
  id: string;
  label: string;
  icon?: string; // Iconify icon name (e.g. 'lucide:upload')
  variant: 'primary' | 'secondary' | 'outline';
  action: string; // Message text to send when clicked
}

// Attachment data for rich messages
export interface MessageAttachment {
  type: MessageContentType;
  imageUrl?: string; // For 'image', 'mockup'
  beforeUrl?: string; // For 'transformation'
  afterUrl?: string; // For 'transformation'
  transformationName?: string; // For 'transformation' (e.g. "Remove Background")
  actions?: InlineChatAction[]; // For 'action-buttons', also used on other types
  pricingData?: {
    basePrice: number;
    placementPrice: number;
    colorPrice: number;
    total: number;
    breakdown: string[];
  };
  colorData?: Array<{
    name: string;
    hex: string;
    pantone: string;
    visible: boolean;
  }>;
  productData?: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    colors: Array<{ name: string; hex: string }>;
  };
}

// Design workflow step tracking
export type DesignFlowStep =
  | 'idle' // No design in progress
  | 'product-selected' // Product chosen, awaiting design intent
  | 'awaiting-upload' // Waiting for user to upload artwork
  | 'awaiting-prompt' // Waiting for AI generation prompt
  | 'design-received' // Design uploaded/generated, show transformation options
  | 'transforming' // Transformation in progress
  | 'placement-review' // Reviewing design on product mockup
  | 'approval' // Final approval step
  | 'processing'; // Print file generation

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent: ChatAgent;
  timestamp: Date;
  attachment?: MessageAttachment; // Optional rich content attachment
}

// Design draft for auto-save
interface DesignDraft {
  designFlowStep: DesignFlowStep;
  currentDesignUrl: string | null;
  currentProductId: string | null;
  messages: Message[];
  timestamp: Date;
}

const DESIGN_DRAFT_KEY = 'merchfrom_design_draft';

export interface ChatState {
  messages: Message[];
  currentAgent: ChatAgent;
  isOpen: boolean;
  unreadCount: number;
  isTyping: boolean;
  sessionHistory: ChatSession[];
  designFlowStep: DesignFlowStep; // Design workflow state
  currentDesignUrl: string | null; // Currently active design image
  currentProductId: string | null; // Currently selected product
}

export interface ChatActions {
  sendMessage: (content: string, attachment?: MessageAttachment) => void;
  sendSystemMessage: (content: string, attachment?: MessageAttachment) => void;
  openChat: (customMessage?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  switchAgent: (agent: ChatAgent) => void;
  clearHistory: () => void;
  saveSession: () => void;
  setTyping: (typing: boolean) => void;
  markAsRead: () => void;
  setDesignFlowStep: (step: DesignFlowStep) => void;
  setCurrentDesign: (url: string | null) => void;
  setCurrentProduct: (id: string | null) => void;
  loadDesignDraft: () => boolean;
}

export interface ChatContextType extends ChatState, ChatActions {}

// Agent detection keywords
const FRANCISCA_KEYWORDS = [
  'design',
  'mockup',
  'create',
  'art',
  'draw',
  'image',
  'logo',
  'shirt',
  'hoodie',
  'product',
  'catalog',
  'blank',
  'color',
  'style',
  'template',
  'visual',
];
const ANTONIA_KEYWORDS = [
  'order',
  'ship',
  'track',
  'delivery',
  'help',
  'support',
  'problem',
  'issue',
  'return',
  'refund',
  'where',
  'when',
  'shipping',
  'package',
];
const LEOPOLDO_KEYWORDS = [
  'revenue',
  'payout',
  'money',
  'sales',
  'price',
  'cost',
  'profit',
  'analytics',
  'dashboard',
  'store',
  'account',
  'earnings',
  'payment',
];

// Create context
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Agent detection logic
function detectAgentFromMessage(message: string, currentAgent: ChatAgent): ChatAgent {
  const lowerMessage = message.toLowerCase();

  let franciscaScore = 0;
  let antoniaScore = 0;
  let leopoldoScore = 0;

  FRANCISCA_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) franciscaScore++;
  });

  ANTONIA_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) antoniaScore++;
  });

  LEOPOLDO_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) leopoldoScore++;
  });

  const maxScore = Math.max(franciscaScore, antoniaScore, leopoldoScore);

  if (maxScore === 0) return currentAgent;

  if (franciscaScore === maxScore && franciscaScore > 0) return 'Francisca';
  if (antoniaScore === maxScore && antoniaScore > 0) return 'Antônia';
  if (leopoldoScore === maxScore && leopoldoScore > 0) return 'Leopoldo';

  return currentAgent;
}

// Welcome message helper
function getWelcomeMessage(agent: ChatAgent): string {
  switch (agent) {
    case 'Leopoldo':
      return "Hey! I'm Leopoldo. I can help you manage your store and track sales.";
    case 'Francisca':
      return "Hi! I'm Francisca. Ready to create something amazing?";
    case 'Antônia':
      return "Hello! I'm Antônia. How can I help you today?";
    default:
      return 'Hello! How can I help you today?';
  }
}

// Provider props
interface ChatProviderProps {
  children: ReactNode;
  initialAgent?: ChatAgent;
}

// Provider component
export function ChatProvider({ children, initialAgent = 'Leopoldo' }: ChatProviderProps): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAgent, setCurrentAgent] = useState<ChatAgent>(initialAgent);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<ChatSession[]>([]);
  const [designFlowStep, setDesignFlowStepState] = useState<DesignFlowStep>('idle');
  const [currentDesignUrl, setCurrentDesignUrl] = useState<string | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // Load session history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('merchfrom_chat_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessionHistory(
            parsed.map((session: ChatSession) => ({
              ...session,
              createdAt: new Date(session.createdAt),
            }))
          );
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, []);

  // Save session history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionHistory.length > 0) {
      localStorage.setItem('merchfrom_chat_sessions', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  const sendMessage = useCallback(
    (content: string, attachment?: MessageAttachment): void => {
      // Detect agent from message
      const targetAgent = detectAgentFromMessage(content, currentAgent);

      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        agent: targetAgent,
        timestamp: new Date(),
        attachment,
      };

      // Switch agent if needed
      if (targetAgent !== currentAgent) {
        setCurrentAgent(targetAgent);
      }

      // Add message
      setMessages((prev) => [...prev, userMessage]);

      // Handle Francisca design flow
      if (targetAgent === 'Francisca') {
        const flowResponse = generateFranciscaResponse(designFlowStep, content, currentDesignUrl, currentProductId);

        if (flowResponse) {
          setIsTyping(true);
          setTimeout(() => {
            setMessages((prev) => [...prev, flowResponse.response]);
            setDesignFlowStepState(flowResponse.newStep);
            if (flowResponse.newDesignUrl) {
              setCurrentDesignUrl(flowResponse.newDesignUrl);
            }
            setIsTyping(false);
            setUnreadCount((prev) => prev + 1);
          }, 1500);
          return;
        }
      }

      // Default AI response - use MiniMax streaming
      setIsTyping(true);

      // Create placeholder message that will be updated with streaming content
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        agent: targetAgent,
        timestamp: new Date(),
      };

      // Add empty message first
      setMessages((prev) => [...prev, assistantMessage]);

      // Map agent name to MiniMax format
      const agentKey = targetAgent.toLowerCase() as 'leopoldo' | 'francisca' | 'antonia';

      // Build conversation history for context
      const conversationHistory = [
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content },
      ];

      // Use streaming
      const messageContentRef = { current: '' };

      miniMaxProvider.streamChat(
        { messages: conversationHistory, agent: agentKey },
        {
          onChunk: (chunk) => {
            messageContentRef.current += chunk;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: messageContentRef.current } : msg))
            );
          },
          onComplete: () => {
            setIsTyping(false);
            setUnreadCount((prev) => prev + 1);
          },
          onError: (error) => {
            console.error('[ChatContext] Streaming error:', error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `I apologize, but I encountered an error. Please try again.` }
                  : msg
              )
            );
            setIsTyping(false);
          },
        }
      );
    },
    [currentAgent, designFlowStep, currentDesignUrl, currentProductId, messages]
  );

  const sendSystemMessage = useCallback(
    (content: string, attachment?: MessageAttachment): void => {
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        agent: currentAgent,
        timestamp: new Date(),
        attachment,
      };
      setMessages((prev) => [...prev, systemMessage]);
    },
    [currentAgent]
  );

  const setDesignFlowStep = useCallback((step: DesignFlowStep): void => {
    setDesignFlowStepState(step);

    // Send proactive greeting for product-selected
    if (step === 'product-selected') {
      setCurrentAgent('Francisca');
      setIsOpen(true);

      setTimeout(() => {
        const now = new Date();
        const greeting: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "Hi! I'm Francisca, your design assistant. Let's create something amazing for your product!",
          agent: 'Francisca',
          timestamp: now,
        };
        const prompt: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Do you already have a design, or would you like to create one with AI?',
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'action-buttons',
            actions: [
              {
                id: 'upload',
                label: 'Upload Artwork',
                icon: 'lucide:upload',
                variant: 'primary',
                action: 'I want to upload my artwork',
              },
              {
                id: 'create',
                label: 'Create with AI',
                icon: 'lucide:sparkles',
                variant: 'primary',
                action: 'Create a design with AI',
              },
            ],
          },
        };
        setMessages((prev) => [...prev, greeting, prompt]);
      }, 500);
    }
  }, []);

  // Auto-save design draft when leaving design flow
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (designFlowStep !== 'idle') {
      const draft: DesignDraft = {
        designFlowStep,
        currentDesignUrl,
        currentProductId,
        messages,
        timestamp: new Date(),
      };

      localStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DESIGN_DRAFT_KEY);
    }
  }, [designFlowStep, currentDesignUrl, currentProductId, messages]);

  const setCurrentDesign = useCallback((url: string | null): void => {
    setCurrentDesignUrl(url);
  }, []);

  const setCurrentProduct = useCallback((id: string | null): void => {
    setCurrentProductId(id);
  }, []);

  const openChat = useCallback(
    (customMessage?: string): void => {
      setIsOpen(true);
      setUnreadCount(0);

      // If custom message provided, use it
      if (customMessage) {
        const message: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: customMessage,
          agent: currentAgent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, message]);
        return;
      }

      // If no messages, add welcome message
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getWelcomeMessage(currentAgent),
          agent: currentAgent,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    },
    [messages.length, currentAgent]
  );

  const closeChat = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback((): void => {
    setIsOpen((prev) => {
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  const switchAgent = useCallback((agent: ChatAgent): void => {
    setCurrentAgent(agent);
  }, []);

  const clearHistory = useCallback((): void => {
    setMessages([]);
  }, []);

  const saveSession = useCallback((): void => {
    if (messages.length === 0) return;

    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: messages[0]?.content.slice(0, 50) + '...' || 'New Conversation',
      messages: [...messages],
      createdAt: new Date(),
    };

    setSessionHistory((prev) => [newSession, ...prev].slice(0, 50)); // Keep last 50 sessions
  }, [messages]);

  const setTypingState = useCallback((typing: boolean): void => {
    setIsTyping(typing);
  }, []);

  const markAsRead = useCallback((): void => {
    setUnreadCount(0);
  }, []);

  const loadDesignDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const saved = localStorage.getItem(DESIGN_DRAFT_KEY);
    if (saved) {
      try {
        const draft: DesignDraft = JSON.parse(saved);
        setDesignFlowStepState(draft.designFlowStep);
        setCurrentDesignUrl(draft.currentDesignUrl);
        setCurrentProductId(draft.currentProductId);
        setMessages(
          draft.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
        return true;
      } catch (e) {
        console.error('Failed to load design draft:', e);
        return false;
      }
    }
    return false;
  }, []);

  const value = useMemo<ChatContextType>(
    () => ({
      messages,
      currentAgent,
      isOpen,
      unreadCount,
      isTyping,
      sessionHistory,
      designFlowStep,
      currentDesignUrl,
      currentProductId,
      sendMessage,
      sendSystemMessage,
      openChat,
      closeChat,
      toggleChat,
      switchAgent,
      clearHistory,
      saveSession,
      setTyping: setTypingState,
      markAsRead,
      setDesignFlowStep,
      setCurrentDesign,
      setCurrentProduct,
      loadDesignDraft,
    }),
    [
      messages,
      currentAgent,
      isOpen,
      unreadCount,
      isTyping,
      sessionHistory,
      designFlowStep,
      currentDesignUrl,
      currentProductId,
      sendMessage,
      sendSystemMessage,
      openChat,
      closeChat,
      toggleChat,
      switchAgent,
      clearHistory,
      saveSession,
      setTypingState,
      markAsRead,
      setDesignFlowStep,
      setCurrentDesign,
      setCurrentProduct,
      loadDesignDraft,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Custom hook
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
}
