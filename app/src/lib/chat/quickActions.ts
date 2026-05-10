/**
 * Quick Actions for CatChat - Agent-specific and Design Flow quick actions
 * Previously shown in the UnifiedBottomBar, now surfaced in CatChat suggestions
 */

import type { AgentId } from '@/types/chat';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string; // Message text to send
}

const AGENT_QUICK_ACTIONS: Record<AgentId, QuickAction[]> = {
  leopoldo: [
    { id: 'view-sales', label: 'View sales', icon: 'lucide:trending-up', action: 'Show me my sales' },
    { id: 'check-revenue', label: 'Check revenue', icon: 'lucide:dollar-sign', action: 'What is my revenue?' },
    { id: 'store-analytics', label: 'Store analytics', icon: 'lucide:bar-chart-3', action: 'Show store analytics' },
    { id: 'my-account', label: 'My account', icon: 'lucide:user', action: 'Show my account' },
    { id: 'request-quote', label: 'Request a quote', icon: 'lucide:file-text', action: 'I want a quote for a bulk order' },
    { id: 'bulk-pricing', label: 'Bulk pricing', icon: 'lucide:tags', action: 'Show me bulk pricing' },
    { id: 'setup-store', label: 'Set up store', icon: 'lucide:store', action: 'Help me set up my store' },
    { id: 'payouts', label: 'Payouts', icon: 'lucide:wallet', action: 'When is my next payout?' },
    { id: 'pricing-info', label: 'Pricing info', icon: 'lucide:info', action: 'Show me pricing information' },
  ],
  francisca: [
    { id: 'browse-catalog', label: 'Browse catalog', icon: 'lucide:layout-grid', action: 'Show me the catalog' },
    { id: 'create-mockup', label: 'Create mockup', icon: 'lucide:shirt', action: 'I want to create a mockup' },
    { id: 'start-design', label: 'Start design', icon: 'lucide:palette', action: 'Help me start a design' },
    { id: 'templates', label: 'Templates', icon: 'lucide:copy', action: 'Show me design templates' },
    { id: 'upload-artwork', label: 'Upload artwork', icon: 'lucide:upload', action: 'I want to upload my artwork' },
    { id: 'print-quality', label: 'Print quality', icon: 'lucide:printer', action: 'What are your print specs?' },
    { id: 'color-options', label: 'Color options', icon: 'lucide:palette', action: 'Show me available colors' },
    { id: 'product-specs', label: 'Product specs', icon: 'lucide:ruler', action: 'Tell me about product quality' },
    { id: 'design-guidelines', label: 'Design guidelines', icon: 'lucide:book-open', action: 'Show me design guidelines' },
  ],
  antonia: [
    { id: 'track-order', label: 'Track order', icon: 'lucide:truck', action: 'Track my order' },
    { id: 'shipping-info', label: 'Shipping info', icon: 'lucide:package', action: 'How much is shipping?' },
    { id: 'get-help', label: 'Get help', icon: 'lucide:help-circle', action: 'I need help' },
    { id: 'contact-support', label: 'Contact support', icon: 'lucide:message-circle', action: 'Contact support' },
    { id: 'faqs', label: 'FAQs', icon: 'lucide:book-open', action: 'Show me FAQs' },
    { id: 'returns', label: 'Returns', icon: 'lucide:refresh-cw', action: 'How do returns work?' },
    { id: 'report-issue', label: 'Report issue', icon: 'lucide:alert-circle', action: 'I have an issue with my order' },
    { id: 'production-time', label: 'Production time', icon: 'lucide:clock', action: 'How long does production take?' },
    { id: 'order-status', label: 'Order status', icon: 'lucide:clipboard-check', action: 'Check my order status' },
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
