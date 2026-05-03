export type AgentId = 'leopoldo' | 'francisca' | 'antonia';
export type AgentName = 'Leopoldo' | 'Francisca' | 'Antônia';
export type Agent = AgentId | AgentName;

// For backward compatibility
export type LegacyAgent = 'Leopoldo' | 'Francisca' | 'Antônia';

export type Workflow = 'general' | 'waitlist' | 'design' | 'support' | 'checkout';

export type MessageType = 'text' | 'audio' | 'card';
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
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  timestamp: number;
  agent: AgentId;
  attachment?: CardAttachment;
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
Be efficient, empathetic, and solution-oriented. When issues arise, offer concrete next steps.`,
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
Be warm, professional, and guide users through processes step by step.`,
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
Be creative, helpful, and provide design-focused guidance. Ask about brand aesthetic and target audience.`,
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
