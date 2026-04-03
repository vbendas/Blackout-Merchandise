import type { ChatAgent } from '@/lib/ChatContext';

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
  'create',
  'drawing',
  'artwork',
  'mock',
  'canvas',
  'designer',
  'aesthetic',
  'look',
  'feel',
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
  'status',
  'tracking',
  'tracking number',
  'shipping cost',
  'delivery time',
  'arrived',
  'lost',
  'damaged',
  'customer service',
  'assistance',
  'question',
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
  'finance',
  'financial',
  'income',
  'commission',
  'fee',
  'balance',
  'withdraw',
  'transfer',
  'bank',
  'payment method',
  'tax',
  'invoice',
  'billing',
  'subscription',
  'plan',
];

/**
 * Detect the appropriate agent based on message content
 * @param message - User message
 * @param currentAgent - Current agent to fall back to
 * @returns The detected or current agent
 */
export function detectAgentFromMessage(message: string, currentAgent: ChatAgent): ChatAgent {
  const lowerMessage = message.toLowerCase();

  let franciscaScore = 0;
  let antoniaScore = 0;
  let leopoldoScore = 0;

  // Count keyword matches
  FRANCISCA_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword.toLowerCase())) franciscaScore++;
  });

  ANTONIA_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword.toLowerCase())) antoniaScore++;
  });

  LEOPOLDO_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword.toLowerCase())) leopoldoScore++;
  });

  const maxScore = Math.max(franciscaScore, antoniaScore, leopoldoScore);

  // If no keywords matched, return current agent
  if (maxScore === 0) return currentAgent;

  // Return agent with highest score
  if (franciscaScore === maxScore) return 'Francisca';
  if (antoniaScore === maxScore) return 'Antônia';
  if (leopoldoScore === maxScore) return 'Leopoldo';

  return currentAgent;
}

/**
 * Get agent-specific welcome message
 * @param agent - Agent name
 * @returns Welcome message string
 */
export function getAgentWelcomeMessage(agent: ChatAgent): string {
  const messages: Record<ChatAgent, string> = {
    Leopoldo: "Hi! I'm Leopoldo, your store assistant. How can I help with your sales today?",
    Francisca: "Hi! I'm Francisca, design specialist. Let's create something amazing together!",
    Antônia: "Hi! I'm Antônia from support. I'm here to help with any questions you have.",
  };

  return messages[agent];
}

/**
 * Get agent role description
 * @param agent - Agent name
 * @returns Role description
 */
export function getAgentRole(agent: ChatAgent): string {
  const roles: Record<ChatAgent, string> = {
    Leopoldo: 'Store Assistant',
    Francisca: 'Design Specialist',
    Antônia: 'Customer Support',
  };

  return roles[agent];
}

/**
 * Get agent color code
 * @param agent - Agent name
 * @returns Hex color code
 */
export function getAgentColor(agent: ChatAgent): string {
  const colors: Record<ChatAgent, string> = {
    Leopoldo: '#4B5563',
    Francisca: '#A855F7',
    Antônia: '#3B82F6',
  };

  return colors[agent];
}
