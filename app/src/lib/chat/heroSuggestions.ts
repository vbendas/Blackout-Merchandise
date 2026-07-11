/**
 * Hero Suggestions — Natural-language prompt pills for the workspace hero
 *
 * These differ from QuickActions in that they're written as natural language
 * questions/requests, not button labels. They appear below the PromptInput
 * and swap when the active agent changes.
 */

import type { AgentId } from '@/types/chat';

export interface HeroSuggestion {
  id: string;
  text: string;
  agent: AgentId;
}

const HERO_SUGGESTIONS: Record<AgentId, HeroSuggestion[]> = {
  leopoldo: [
    { id: 'hoodies-under-30', text: 'Show me hoodies under €30', agent: 'leopoldo' },
    { id: 'setup-store', text: 'Set up my store', agent: 'leopoldo' },
    { id: 'bulk-pricing', text: 'Bulk pricing for 200 units', agent: 'leopoldo' },
    { id: 'revenue-check', text: "What's my revenue this month?", agent: 'leopoldo' },
    { id: 'custom-quote', text: 'Request a custom quote', agent: 'leopoldo' },
    { id: 'view-sales', text: 'Show me my sales dashboard', agent: 'leopoldo' },
  ],
  francisca: [
    { id: 'tour-merch', text: 'Design tour merch for my next show', agent: 'francisca' },
    { id: 'browse-catalog', text: 'Browse the product catalog', agent: 'francisca' },
    { id: 'logo-mockup', text: 'Create a mockup for my logo', agent: 'francisca' },
    { id: 'print-quality', text: 'What print quality do you offer?', agent: 'francisca' },
    { id: 'design-templates', text: 'Show me design templates', agent: 'francisca' },
    { id: 'start-design', text: 'Help me start a new design', agent: 'francisca' },
  ],
  antonia: [
    { id: 'track-order', text: "Where's my last order?", agent: 'antonia' },
    { id: 'shipping-time', text: 'How long does shipping take?', agent: 'antonia' },
    { id: 'return-item', text: 'I need to return an item', agent: 'antonia' },
    { id: 'track-package', text: 'Track my package', agent: 'antonia' },
    { id: 'human-help', text: 'Contact a human for help', agent: 'antonia' },
    { id: 'production-time', text: 'How long does production take?', agent: 'antonia' },
  ],
};

/**
 * Get hero suggestions for a specific agent
 */
export function getHeroSuggestions(agent: AgentId): HeroSuggestion[] {
  return HERO_SUGGESTIONS[agent] || [];
}

/**
 * Get the first N suggestions for an agent (default 5)
 */
export function getHeroSuggestionsSlice(agent: AgentId, count: number = 5): HeroSuggestion[] {
  return getHeroSuggestions(agent).slice(0, count);
}
