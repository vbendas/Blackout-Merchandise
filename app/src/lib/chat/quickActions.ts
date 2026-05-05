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
  ],
  francisca: [
    { id: 'create-mockup', label: 'Create mockup', icon: 'lucide:shirt', action: 'I want to create a mockup' },
    { id: 'browse-catalog', label: 'Browse catalog', icon: 'lucide:layout-grid', action: 'Show me the catalog' },
    { id: 'start-design', label: 'Start design', icon: 'lucide:palette', action: 'Help me start a design' },
    { id: 'templates', label: 'Templates', icon: 'lucide:copy', action: 'Show me templates' },
  ],
  antonia: [
    { id: 'track-order', label: 'Track order', icon: 'lucide:truck', action: 'Track my order' },
    { id: 'get-help', label: 'Get help', icon: 'lucide:help-circle', action: 'I need help' },
    { id: 'contact-support', label: 'Contact support', icon: 'lucide:message-circle', action: 'Contact support' },
    { id: 'faqs', label: 'FAQs', icon: 'lucide:book-open', action: 'Show FAQs' },
  ],
};

export function getAgentQuickActions(agent: AgentId): QuickAction[] {
  return AGENT_QUICK_ACTIONS[agent] || [];
}
