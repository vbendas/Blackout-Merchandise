import type { AgentId, AgentContext } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';

const getKeywordsForAgent = (agentId: AgentId): string[] => AGENT_CONFIGS[agentId].keywords;

interface DetermineAgentParams {
  _message: string;
  currentAgent: AgentId;
  context: AgentContext;
}

export function determineAgent({
  _message,
  currentAgent,
  context,
}: DetermineAgentParams): { agent: AgentId; reason?: string } {
  const { pathname, buttonTrigger, message: msg } = context;
  
  if (buttonTrigger) {
    switch (buttonTrigger) {
      case 'join-waitlist':
      case 'merchstore':
      case 'bulk-order':
      case 'quote':
        return { agent: 'leopoldo', reason: 'button trigger' };
      case 'catalog':
      case 'design':
      case 'create-product':
        return { agent: 'francisca', reason: 'button trigger' };
      case 'support':
      case 'help':
        return { agent: 'antonia', reason: 'button trigger' };
    }
  }

  if (pathname) {
    if (pathname.includes('/waitlist') || pathname.includes('/merchstore') || pathname.includes('/orders') || pathname.includes('/payouts') || pathname.includes('/quotes')) {
      return { agent: 'leopoldo', reason: 'path context' };
    }
    if (pathname.includes('/catalog') || pathname.includes('/design') || pathname.includes('/products') || pathname.includes('/mockups')) {
      return { agent: 'francisca', reason: 'path context' };
    }
  }

  if (msg && msg.trim()) {
    const lowerMessage = msg.toLowerCase();
    
    const scores: Record<AgentId, number> = { antonia: 0, leopoldo: 0, francisca: 0 };

    (Object.keys(AGENT_CONFIGS) as AgentId[]).forEach((agentId) => {
      const keywords = getKeywordsForAgent(agentId);
      keywords.forEach((keyword) => {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          scores[agentId]++;
        }
      });
    });

    const maxScore = Math.max(scores.antonia, scores.leopoldo, scores.francisca);

    if (maxScore > 0) {
      if (scores.francisca === maxScore) return { agent: 'francisca', reason: 'keyword match' };
      if (scores.leopoldo === maxScore) return { agent: 'leopoldo', reason: 'keyword match' };
      if (scores.antonia === maxScore) return { agent: 'antonia', reason: 'keyword match' };
    }
  }

  return { agent: currentAgent, reason: 'default' };
}

export function generateHandoffMessage(fromAgent: AgentId, toAgent: AgentId): string {
  const toName = AGENT_CONFIGS[toAgent].name;
  const toRole = AGENT_CONFIGS[toAgent].role;
  return `Let me connect you with ${toName}, our ${toRole}. They'll be able to help you better with this!`;
}

export function shouldSwitchAgent(currentAgent: AgentId, context: AgentContext): boolean {
  const { agent } = determineAgent({ _message: context.message || '', currentAgent, context });
  return agent !== currentAgent;
}

export function getDefaultAgentForPathname(pathname: string): AgentId {
  if (pathname.includes('/waitlist') || pathname.includes('/merchstore') || pathname.includes('/orders') || pathname.includes('/payouts') || pathname.includes('/quotes')) {
    return 'leopoldo';
  }
  if (pathname.includes('/catalog') || pathname.includes('/design') || pathname.includes('/products') || pathname.includes('/mockups')) {
    return 'francisca';
  }
  return 'antonia';
}

export function getAgentRole(agent: AgentId): string {
  return AGENT_CONFIGS[agent].role;
}

export function getAgentColor(agent: AgentId): string {
  return AGENT_CONFIGS[agent].color;
}
