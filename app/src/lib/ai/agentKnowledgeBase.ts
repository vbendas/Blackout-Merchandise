import type { AgentId } from '@/types/chat';

export interface AgentExpertise {
  expertise: string[];
  keywords: string[];
  avoid: string[];
  handoffTriggers: string[];
}

export interface FullAgentExpertise extends AgentExpertise {
  primaryDomains: Domain[];
  secondaryDomains: Domain[];
  prohibitedDomains: Domain[];
  conversationPatterns: Pattern[];
  handoffDetails: Trigger[];
}

interface Domain {
  name: string;
  description: string;
  examples: string[];
  keywords: string[];
}

interface Pattern {
  type: 'question' | 'request' | 'complaint' | 'exploration';
  indicators: string[];
  context: string;
}

interface Trigger {
  condition: string;
  targetAgent: AgentId;
  message: string;
}

export const ROUTING_KNOWLEDGE_BASE: Record<AgentId, AgentExpertise> = {
  leopoldo: {
    expertise: [
      'onboarding',
      'account-setup',
      'pricing',
      'profit-margins',
      'business-strategy',
      'waitlist',
      'interviews',
      'bulk-orders',
      'quotes',
      'store-management',
      'payouts',
    ],
    keywords: [
      'price',
      'profit',
      'margin',
      'cost',
      'earnings',
      'join',
      'signup',
      'register',
      'waitlist',
      'interview',
      'bulk',
      'wholesale',
      'quote',
      'large order',
      'payout',
      'payment',
      'dashboard',
      'admin',
      'business',
      'strategy',
      'sell',
    ],
    avoid: [
      'design',
      'artwork',
      'visual',
      'create design',
      'tracking',
      'where is my order',
      'shipping status',
      'return',
      'refund',
    ],
    handoffTriggers: [
      'design help → francisca',
      'artwork question → francisca',
      'tracking request → antonia',
      'shipping question → antonia',
    ],
  },

  francisca: {
    expertise: [
      'design',
      'artwork',
      'product-catalog',
      'print-quality',
      'print-techniques',
      'mockups',
      'previews',
      'brand-aesthetics',
      'color-separation',
      'visual-identity',
    ],
    keywords: [
      'design',
      'create',
      'artwork',
      'visual',
      'aesthetic',
      'product',
      'catalog',
      't-shirt',
      'hoodie',
      'merchandise',
      'print',
      'quality',
      'technique',
      'screen print',
      'mockup',
      'preview',
      'see',
      'look',
      'show',
      'color',
      'separation',
      'brand',
      'style',
      'search',
      'find',
      'browse',
      'blank',
      'garment',
      'organic',
      'cotton',
      'similar',
      'recommend',
    ],
    avoid: [
      'price',
      'profit',
      'margin',
      'business strategy',
      'tracking',
      'where is my order',
      'shipping status',
      'return',
      'refund',
      'complaint',
    ],
    handoffTriggers: [
      'pricing question → leopoldo',
      'business strategy → leopoldo',
      'tracking request → antonia',
      'order issue → antonia',
    ],
  },

  antonia: {
    expertise: [
      'order-tracking',
      'shipping',
      'delivery',
      'returns',
      'refunds',
      'exchanges',
      'order-issues',
      'support',
      'production-status',
      'logistics',
    ],
    keywords: [
      'track',
      'where',
      'order',
      'shipping',
      'delivery',
      'return',
      'refund',
      'exchange',
      'money back',
      'wrong',
      'defect',
      'problem',
      'issue',
      'missing',
      'damaged',
      'late',
      'status',
      'when will',
      'help',
      'support',
      'production',
    ],
    avoid: ['design', 'artwork', 'create', 'visual', 'price', 'profit', 'margin', 'business'],
    handoffTriggers: ['design question → francisca', 'pricing question → leopoldo', 'business strategy → leopoldo'],
  },
};

export const FULL_AGENT_KNOWLEDGE_BASE: Record<AgentId, FullAgentExpertise> = {
  leopoldo: {
    ...ROUTING_KNOWLEDGE_BASE.leopoldo,
    primaryDomains: [
      {
        name: 'Onboarding & Account Setup',
        description: 'New artist registration, profile completion, verification',
        examples: ['I want to join the platform', 'How do I set up my store?', 'Complete my profile'],
        keywords: ['onboard', 'signup', 'register', 'profile', 'account', 'verify'],
      },
      {
        name: 'Business Strategy & Sales',
        description: 'Pricing, margins, sales optimization, business decisions',
        examples: ['What should I price my shirts?', 'How much profit will I make?', 'Pricing strategy'],
        keywords: ['price', 'profit', 'margin', 'strategy', 'sales', 'revenue'],
      },
      {
        name: 'Waitlist & Interviews',
        description: 'Waitlist applications, artist vetting, eligibility',
        examples: ['Am I on the waitlist?', 'When will I be approved?', 'Interview process'],
        keywords: ['waitlist', 'interview', 'approve', 'vetting', 'eligibility'],
      },
      {
        name: 'Bulk Orders & Quotes',
        description: 'Large quantity orders, custom pricing, business orders',
        examples: ['I need 100 shirts for my team', 'Quote for bulk order', 'Wholesale pricing'],
        keywords: ['bulk', 'wholesale', 'quote', 'large order', 'team order'],
      },
    ],
    secondaryDomains: [
      {
        name: 'Store Management',
        description: 'Dashboard navigation, settings, store configuration',
        examples: ['How do I access my dashboard?', 'Change my store settings'],
        keywords: ['dashboard', 'settings', 'configuration'],
      },
    ],
    prohibitedDomains: [
      {
        name: 'Design & Artwork',
        description: 'Visual design, artwork creation, design tools',
        examples: ['Help me design a logo', 'What colors look good?', 'Design feedback'],
        keywords: ['design', 'artwork', 'logo', 'visual'],
      },
      {
        name: 'Order Tracking',
        description: 'Individual order status, shipping updates',
        examples: ['Where is my order?', 'Track my package'],
        keywords: ['track', 'shipping status', 'where is'],
      },
    ],
    conversationPatterns: [
      {
        type: 'question',
        indicators: ['how much', 'what price', 'profit', 'margin', 'cost'],
        context: 'Financial/business inquiries',
      },
      {
        type: 'request',
        indicators: ['want to join', 'sign up', 'create account', 'get started'],
        context: 'Onboarding requests',
      },
    ],
    handoffDetails: [
      {
        condition: 'User asks about design, artwork, or visual elements',
        targetAgent: 'francisca',
        message: 'For design matters, let me bring in Francisca, our Art Director.',
      },
      {
        condition: 'User asks about order tracking or shipping status',
        targetAgent: 'antonia',
        message: 'Antônia is our tracking expert. Let me connect you with her.',
      },
    ],
  },

  francisca: {
    ...ROUTING_KNOWLEDGE_BASE.francisca,
    primaryDomains: [
      {
        name: 'Product Design & Artwork',
        description: 'Creating designs, artwork feedback, design tools',
        examples: ['Help me create a design', 'Does this artwork look good?', 'Design suggestions'],
        keywords: ['design', 'artwork', 'create', 'visual', 'aesthetic'],
      },
      {
        name: 'Product Catalog',
        description: 'Product selection, variants, catalog browsing',
        examples: ['What products do you offer?', 'Show me t-shirts', 'Product options'],
        keywords: ['product', 'catalog', 't-shirt', 'hoodie', 'merchandise'],
      },
      {
        name: 'Print Quality & Techniques',
        description: 'Printing methods, quality standards, color separation',
        examples: ['What printing method is best?', 'Color separation', 'Print quality'],
        keywords: ['print', 'quality', 'technique', 'color', 'separation', 'screen print'],
      },
      {
        name: 'Mockups & Previews',
        description: 'Product mockups, preview generation, visualization',
        examples: ['Can I see a mockup?', 'Preview my design', 'How will it look?'],
        keywords: ['mockup', 'preview', 'visualization', 'see', 'look'],
      },
    ],
    secondaryDomains: [
      {
        name: 'Brand Aesthetics',
        description: 'Brand identity, visual consistency, style guidance',
        examples: ['Does this match my brand?', 'Brand consistency'],
        keywords: ['brand', 'aesthetic', 'style', 'identity'],
      },
    ],
    prohibitedDomains: [
      {
        name: 'Pricing & Business',
        description: 'Financial decisions, pricing strategy, profit margins',
        examples: ['How should I price this?', 'What is my profit?'],
        keywords: ['price', 'profit', 'margin', 'business strategy'],
      },
      {
        name: 'Operations & Support',
        description: 'Order issues, shipping problems, returns',
        examples: ['My order is late', 'I want to return this'],
        keywords: ['order issue', 'late', 'return', 'problem'],
      },
    ],
    conversationPatterns: [
      {
        type: 'request',
        indicators: ['design', 'create', 'artwork', 'visual', 'mockup', 'preview'],
        context: 'Design and creative requests',
      },
      {
        type: 'question',
        indicators: ['what product', 'which blank', 'print method', 'quality'],
        context: 'Product and quality inquiries',
      },
    ],
    handoffDetails: [
      {
        condition: 'User asks about pricing, profit, or business strategy',
        targetAgent: 'leopoldo',
        message: "Pricing strategy is Leopoldo's expertise. Let me bring him in.",
      },
      {
        condition: 'User reports order issues or needs support',
        targetAgent: 'antonia',
        message: "For order support, I'll connect you with Antônia.",
      },
    ],
  },

  antonia: {
    ...ROUTING_KNOWLEDGE_BASE.antonia,
    primaryDomains: [
      {
        name: 'Order Tracking',
        description: 'Track shipments, delivery status, package location',
        examples: ['Where is my order?', 'Track my package', 'Delivery status'],
        keywords: ['track', 'where', 'status', 'delivery', 'package', 'shipment'],
      },
      {
        name: 'Shipping & Logistics',
        description: 'Shipping methods, delivery times, carrier info',
        examples: ['How long does shipping take?', 'Shipping options', 'Delivery time'],
        keywords: ['shipping', 'delivery', 'logistics', 'carrier', 'time'],
      },
      {
        name: 'Returns & Refunds',
        description: 'Return process, refund requests, exchanges',
        examples: ['How do I return this?', 'I want a refund', 'Exchange policy'],
        keywords: ['return', 'refund', 'exchange', 'money back'],
      },
      {
        name: 'Order Issues',
        description: 'Problems with orders, defects, wrong items',
        examples: ['My order is wrong', 'Defective product', 'Missing item'],
        keywords: ['wrong', 'defect', 'problem', 'issue', 'missing', 'damaged'],
      },
    ],
    secondaryDomains: [
      {
        name: 'Production Status',
        description: 'Production updates, manufacturing timeline',
        examples: ['Is my order in production?', 'Production status'],
        keywords: ['production', 'manufacturing', 'making'],
      },
    ],
    prohibitedDomains: [
      {
        name: 'Design & Creative',
        description: 'Design feedback, artwork creation',
        examples: ['Help me design', 'What do you think of this art?'],
        keywords: ['design', 'artwork', 'creative'],
      },
      {
        name: 'Business Strategy',
        description: 'Pricing, profit, sales strategy',
        examples: ['How much should I charge?', 'Business advice'],
        keywords: ['price', 'profit', 'business', 'strategy'],
      },
    ],
    conversationPatterns: [
      {
        type: 'question',
        indicators: ['where is', 'track', 'status', 'when will', 'delivery'],
        context: 'Order tracking inquiries',
      },
      {
        type: 'complaint',
        indicators: ['wrong', 'problem', 'issue', 'defect', 'missing', 'late'],
        context: 'Order problems and complaints',
      },
    ],
    handoffDetails: [
      {
        condition: 'User asks about pricing, profit, or business decisions',
        targetAgent: 'leopoldo',
        message: 'For business questions, Leopoldo is your best bet.',
      },
      {
        condition: 'User wants design help or creative feedback',
        targetAgent: 'francisca',
        message: 'Francisca can help with design matters. Let me get her.',
      },
    ],
  },
};

export function getExpertiseForAgent(agent: AgentId): AgentExpertise {
  return ROUTING_KNOWLEDGE_BASE[agent];
}

export function getFullExpertiseForAgent(agent: AgentId): FullAgentExpertise {
  return FULL_AGENT_KNOWLEDGE_BASE[agent];
}

export function getKeywordsForAgent(agent: AgentId): string[] {
  return ROUTING_KNOWLEDGE_BASE[agent].keywords;
}

export function getExpertiseListForAgent(agent: AgentId): string[] {
  return ROUTING_KNOWLEDGE_BASE[agent].expertise;
}
