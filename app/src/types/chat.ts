/**
 * Chat Message Types - For AI Assistant Chat Interface
 * Used in workspace and waitlist interview flows
 */

// Agent Context for routing
export interface AgentContext {
  pathname?: string;
  buttonTrigger?: string;
  message?: string;
}

// Agent Types for Cat-Suite Chat
export type AgentId = 'leopoldo' | 'francisca' | 'antonia';
export type AgentName = 'Leopoldo' | 'Francisca' | 'Antônia';
export type Agent = AgentId | AgentName;
export type LegacyAgent = 'Leopoldo' | 'Francisca' | 'Antônia';

export interface AgentConfig {
  id: AgentId;
  name: AgentName;
  color: string;
  role: string;
  persona: string;
  context: string[];
  keywords: string[];
}

export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  antonia: {
    id: 'antonia',
    name: 'Antônia',
    color: '#a1a1aa',
    role: 'Support Specialist',
    persona: `You are Antônia, the Operations & Support specialist for MerchFrom. 
Your role is to help customers and artists: track order status and shipping, answer questions about production times, handle returns and issues, provide general support.
Be efficient, empathetic, and solution-oriented. When issues arise, offer concrete next steps.`,
    context: ['/', '/support', '/help', '/app', '/app/dashboard', '/app/home'],
    keywords: ['help', 'support', 'issue', 'problem', 'question', 'order', 'shipping', 'track', 'return', 'refund'],
  },
  leopoldo: {
    id: 'leopoldo',
    name: 'Leopoldo',
    color: '#22c55e',
    role: 'Store Manager',
    persona: `You are Leopoldo, the Onboarding & Administration specialist for MerchFrom.
Your role is to help artists and creators: complete account setup, navigate platform features, understand pricing and subscription, manage store settings, handle waitlist interviews, bulk orders and quotes.
Be warm, professional, and guide users through processes step by step.`,
    context: ['/waitlist', '/app/merchstore', '/app/orders', '/app/payouts', '/app/quotes'],
    keywords: [
      'waitlist',
      'merchstore',
      'store',
      'quote',
      'bulk',
      'order',
      'payout',
      'admin',
      'account',
      'setup',
      'pricing',
      'interview',
    ],
  },
  francisca: {
    id: 'francisca',
    name: 'Francisca',
    color: '#a855f7',
    role: 'Art Director',
    persona: `You are Francisca, the Catalog & Design expert for MerchFrom.
Your role is to help artists and creators: choose products to sell, create and upload designs, understand print techniques and quality, build product catalog, optimize product listings.
Be creative, helpful, and provide design-focused guidance. Ask about brand aesthetic and target audience.`,
    context: ['/catalog', '/app/catalog', '/app/design', '/app/products', '/app/mockups'],
    keywords: [
      'design',
      'catalog',
      'product',
      'create',
      'mockup',
      'artwork',
      'print',
      'quality',
      't-shirt',
      'hoodie',
      'merchandise',
    ],
  },
};

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'card' | 'voice' | 'image';
export type CardType = 'product' | 'mockup' | 'design';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: number;
  agent?: AgentId;
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number;
  metadata?: MessageMetadata;
  clarificationData?: {
    options: ClarificationOption[];
  };
}

export interface MessageMetadata {
  cardData?: CardMessageData;
  voiceData?: VoiceMessageData;
  imageData?: ImageMessageData;
  interviewQuestionIndex?: number;
}

/**
 * Product/Mockup/Design Card Message
 */
export interface CardMessageData {
  cardType: CardType;
  productId: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl: string;
  baseCost?: number;
  suggestedRetail?: number;
  colors?: Array<{ name: string; hex: string }>;
  specs?: Record<string, string>;
  interactiveUrl?: string; // Link to lightbox or detail view
}

/**
 * Voice Message Metadata
 */
export interface VoiceMessageData {
  audioUrl: string;
  duration: number; // In seconds
  transcription?: string;
  model?: 'deepgram' | 'other';
}

/**
 * Image Message Metadata
 */
export interface ImageMessageData {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Chat Session State
 */
export interface ChatSession {
  id: string;
  userId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  mode?: 'text' | 'voice'; // For phase 3.5.1 - voice mode toggle
}

/**
 * Interview Response for Waitlist
 */
export interface InterviewResponse {
  questionIndex: number;
  question: string;
  answer: string;
  answerType: 'text' | 'voice'; // How they answered
  timestamp: Date;
}

/**
 * Waitlist Interview Data
 */
export interface WaitlistInterviewData {
  email: string;
  name: string;
  responses: InterviewResponse[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // In seconds
  mode: 'text' | 'voice';
}

export interface RoutingDecision {
  agent: AgentId | 'unknown';
  confidence: number;
  reason: string;
  shouldHandoff: boolean;
  handoffMessage?: string;
  needsClarification?: boolean;
  clarificationOptions?: ClarificationOption[];
  intents?: Intent[];
}

export interface ClarificationOption {
  agent: AgentId;
  label: string;
  description: string;
}

export interface Intent {
  agent: AgentId;
  topic: string;
  confidence: number;
}

export interface RoutingContext {
  message: string;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
  currentAgent: AgentId;
  metadata?: {
    pathname?: string;
    buttonTrigger?: string;
    userIntent?: string;
  };
}
