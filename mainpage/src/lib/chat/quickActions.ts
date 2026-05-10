/**
 * Quick Actions for CatChat - Agent-specific quick actions
 * Shared with /app for unified chat behavior
 */

import type { AgentId } from '@/types/chat';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string; // Message text to send
}

/**
 * Landing page quick actions — marketing/discovery focused.
 * These appear on /mainpage for first-time visitors.
 * App-specific actions (sales, revenue, payouts, quotes) live in /app only.
 */
const AGENT_QUICK_ACTIONS: Record<AgentId, QuickAction[]> = {
  leopoldo: [
    { id: 'what-is-merchfrom', label: 'What is Merch From?', icon: 'lucide:sparkles', action: 'Tell me about Merch From' },
    { id: 'join-waitlist', label: 'Join the waitlist', icon: 'lucide:list-checks', action: 'How do I join the waitlist?' },
    { id: 'zero-investment', label: 'Zero investment', icon: 'lucide:hand-coins', action: 'How does zero investment upfront work?' },
    { id: 'open-shop', label: 'Open a merch shop', icon: 'lucide:store', action: 'How do I open a merch shop?' },
    { id: 'pricing-fees', label: 'Pricing & fees', icon: 'lucide:tag', action: 'What are your pricing and fees?' },
    { id: 'who-for', label: 'Who is this for?', icon: 'lucide:users', action: 'Who can use Merch From?' },
    { id: 'how-it-works', label: 'How it works', icon: 'lucide:cogs', action: 'How does Merch From work?' },
    { id: 'get-started', label: 'Get started', icon: 'lucide:rocket', action: 'How do I get started?' },
  ],
  francisca: [
    { id: 'what-products', label: 'What products?', icon: 'lucide:package', action: 'What products do you offer?' },
    { id: 'print-quality', label: 'Print quality', icon: 'lucide:printer', action: "How's your print quality?" },
    { id: 'ethical-blanks', label: 'Ethical blanks', icon: 'lucide:heart', action: 'Tell me about ethical blanks' },
    { id: 'design-help', label: 'Design help', icon: 'lucide:palette', action: 'Can you help with design?' },
    { id: 'mockups', label: 'Mockups', icon: 'lucide:image', action: 'Do you offer mockups?' },
    { id: 'examples', label: 'Examples', icon: 'lucide:layout-grid', action: 'Show me some examples' },
    { id: 'sustainability', label: 'Sustainability', icon: 'lucide:leaf', action: 'How are you sustainable?' },
    { id: 'color-options', label: 'Color options', icon: 'lucide:droplet', action: 'What colors are available?' },
  ],
  antonia: [
    { id: 'shipping', label: 'Shipping', icon: 'lucide:truck', action: 'How does shipping work?' },
    { id: 'production-time', label: 'Production time', icon: 'lucide:clock', action: 'How long does production take?' },
    { id: 'return-policy', label: 'Return policy', icon: 'lucide:refresh-cw', action: "What's your return policy?" },
    { id: 'get-support', label: 'Get support', icon: 'lucide:life-buoy', action: 'How can I get support?' },
    { id: 'where-based', label: 'Where based?', icon: 'lucide:map-pin', action: 'Where are you based?' },
    { id: 'faqs', label: 'FAQs', icon: 'lucide:help-circle', action: 'Show me frequently asked questions' },
    { id: 'track-order', label: 'Track order', icon: 'lucide:search', action: 'How do I track an order?' },
    { id: 'contact-us', label: 'Contact us', icon: 'lucide:mail', action: 'How do I contact you?' },
  ],
};

export const HUMAN_HANDOFF_ACTION: QuickAction = {
  id: 'talk-to-human',
  label: 'Talk to a human',
  icon: 'lucide:user',
  action: '__HANDOFF__',
};

export function withHumanHandoff(actions: QuickAction[]): QuickAction[] {
  return [...actions, HUMAN_HANDOFF_ACTION];
}

export function getAgentQuickActions(agent: AgentId): QuickAction[] {
  return AGENT_QUICK_ACTIONS[agent] || [];
}
