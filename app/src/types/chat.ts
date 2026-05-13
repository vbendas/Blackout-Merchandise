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
export type MessageType = 'text' | 'card' | 'voice' | 'image' | 'status_card' | 'image_result' | 'image_upload_prompt' | 'option_chips';
export type CardType = 'product' | 'mockup' | 'design';

export interface ChatMessage {
  id: string;
  role: MessageRole | 'human';
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
  handoffData?: HumanHandoffData;
  senderName?: string;
  senderRole?: string;
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

// Agent-specific greetings for the floating chat button
export const AGENT_GREETINGS: Record<AgentId, string[]> = {
  leopoldo: [
    "Oi! Let's get you sorted! 🐱",
    "Ready to set up shop? 💼",
    "I'm here to help! What do you need? 🤝",
    "Let's make this official! ✍️"
  ],
  francisca: [
    "Ready to create something stunning? ✨",
    "What's your vision? Let's bring it to life! 🎨",
    "Looking for the perfect piece? 👗",
    "Let's design your masterpiece! 💫"
  ],
  antonia: [
    "Hey there! What can I do for you? 🍀",
    "Got a question? I'm all ears! 👂",
    "What's the craic? How can I help? 🎭",
    "Stuck? Let's figure it out together! 🚀"
  ]
};

// ============================================================================
// HUMAN HANDOFF TYPES
// ============================================================================

export type HandoffStatus =
  | 'none'
  | 'awaiting_email'
  | 'requested'
  | 'queued'
  | 'assigned'
  | 'human_joined'
  | 'resolved';

export interface HumanHandoffData {
  ticketId: string;
  status: HandoffStatus;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  estimatedWaitMinutes?: number;
  contactEmail?: string;
}

export interface Staff {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentStaffAssignment {
  id: string;
  agentId: AgentName;
  staffId: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  staff?: Staff;
}

export interface SupportTicket {
  id: string;
  sessionId?: string;
  userId?: string;
  visitorToken?: string;
  agentId: AgentName;
  assignedStaffId?: string;
  status: string;
  priority: string;
  subject: string;
  description?: string;
  source: string;
  contactEmail?: string;
  visitorName?: string;
  estimatedWaitMinutes?: number;
  metadata?: Record<string, unknown>;
  assignedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedStaff?: Staff;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'ai' | 'human' | 'system';
  senderId?: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  senderName?: string;
  senderRole?: string;
}

export interface HandoffRequestBody {
  sessionId?: string;
  agentId: AgentId;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
  contactEmail: string;
  visitorName?: string;
  subject?: string;
  userId?: string;
  visitorToken?: string;
}

export interface HandoffResponse {
  ticketId: string;
  status: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  estimatedWaitMinutes?: number;
  message: string;
}

export const AGENT_TO_STAFF_ROLE: Record<AgentId, string> = {
  leopoldo: 'head_of_operations',
  francisca: 'head_of_design',
  antonia: 'head_of_customer_success',
};

// ============================================================================
// STUDIO FLOW TYPES
// ============================================================================

export type StudioPhase =
  | 'greeting'
  | 'garment_selection'
  | 'design_intent'
  | 'reference_gathering'
  | 'design_generation'
  | 'design_iteration'
  | 'garment_application'
  | 'mockup_generation'
  | 'approval'
  | 'next_item'
  | 'complete';

export interface GarmentStatus {
  id: string;
  name: string;
  sku: string;
  status: 'pending' | 'in_progress' | 'complete' | 'skipped' | 'approved';
  designUrl?: string;
}

export interface StudioOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
}

export interface StudioMessageMetadata {
  phase?: StudioPhase;
  garmentId?: string;
  designUrl?: string;
  imageUrl?: string;
  editRound?: number;
  loraStyle?: string;
  statusCard?: GarmentStatus[];
  options?: StudioOption[];
}
