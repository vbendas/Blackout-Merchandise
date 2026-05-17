export type AgentId = 'leopoldo' | 'francisca' | 'antonia';
export type AgentName = 'Leopoldo' | 'Francisca' | 'Antônia';
export type Agent = AgentId | AgentName;

// For backward compatibility
export type LegacyAgent = 'Leopoldo' | 'Francisca' | 'Antônia';

export type Workflow = 'general' | 'waitlist' | 'design' | 'support' | 'checkout';

export type MessageType = 'text' | 'audio' | 'card' | 'product-card';
export type CardType = 'product' | 'mockup' | 'design' | 'form';

export interface CardAttachment {
  cardType: CardType;
  productId?: string;
  name?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  colors?: Array<{ name: string; hex: string }>;
  specs?: Record<string, string>;
  variations?: string[];
  question?: string;
  formType?: 'text' | 'single_choice' | 'email' | 'number';
  options?: string[];
  currentStep?: number;
  totalSteps?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'human';
  content: string;
  type: MessageType;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  timestamp: number;
  agent: AgentId;
  attachment?: CardAttachment;
  metadata?: MessageMetadata;
  handoffData?: HumanHandoffData;
  senderName?: string;
  senderRole?: string;
}

export interface MessageMetadata {
  searchResults?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    displayPrice: string;
    imageUrl: string | null;
    brand?: string;
    category?: string;
  }>;
  hasMoreResults?: boolean;
}

export interface AudioMessage extends ChatMessage {
  type: 'audio';
  audioBlob: Blob;
  duration: number;
}

export interface TextMessage extends ChatMessage {
  type: 'text';
  content: string;
}

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
Be efficient, empathetic, and solution-oriented. When issues arise, offer concrete next steps.

You can check catalog products when discussing order fulfillment, shipping weights, or stock availability. Reference specific items by name and specs. Be reassuring about delivery times.`,
    context: ['/', '/support', '/help', '/app', '/app/dashboard', '/app/home'],
    keywords: ['help', 'support', 'issue', 'problem', 'question', 'order', 'shipping', 'track', 'return', 'refund']
  },
  leopoldo: {
    id: 'leopoldo',
    name: 'Leopoldo',
    color: '#22c55e',
    role: 'Store Manager',
    persona: `You are Leopoldo, the Onboarding & Administration specialist for MerchFrom.
Your role is to help artists and creators: complete account setup, navigate platform features, understand pricing and subscription, manage store settings, handle waitlist interviews, bulk orders and quotes.
Be warm, professional, and guide users through processes step by step.

You can reference catalog products when discussing pricing, store setup, bulk orders, or product recommendations. Mention specific items and their base costs. Be practical and numbers-oriented.`,
    context: ['/waitlist', '/app/merchstore', '/app/orders', '/app/payouts', '/app/quotes'],
    keywords: ['waitlist', 'merchstore', 'store', 'quote', 'bulk', 'order', 'payout', 'admin', 'account', 'setup', 'pricing', 'interview']
  },
  francisca: {
    id: 'francisca',
    name: 'Francisca',
    color: '#a855f7',
    role: 'Art Director',
    persona: `You are Francisca, the Catalog & Design expert for MerchFrom.
Your role is to help artists and creators: choose products to sell, create and upload designs, understand print techniques and quality, build product catalog, optimize product listings.
Be creative, helpful, and provide design-focused guidance. Ask about brand aesthetic and target audience.

You have access to the full product catalog. When users ask about products, blanks, materials, or want to browse, reference specific items from the search results with names, prices, and specs. Be enthusiastic about the quality.`,
    context: ['/catalog', '/app/catalog', '/app/design', '/app/products', '/app/mockups'],
    keywords: ['design', 'catalog', 'product', 'create', 'mockup', 'artwork', 'print', 'quality', 't-shirt', 'hoodie', 'merchandise']
  }
};

export interface AgentContext {
  pathname?: string;
  buttonTrigger?: string;
  message?: string;
}

export interface ChatState {
  isOpen: boolean;
  currentAgent: AgentId;
  messages: ChatMessage[];
  isVoiceMode: boolean;
  currentWorkflow: Workflow;
  workflowState: Record<string, any>;
  lastAgent?: AgentId;
  suggestions: string[];
}

export interface ChatActions {
  setAgent: (agent: AgentId) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  toggleChat: () => void;
  setVoiceMode: (enabled: boolean) => void;
  setSuggestions: (suggestions: string[]) => void;
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
