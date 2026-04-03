import { contextRouter } from '@/lib/ai/contextRouter';
import type { AgentContext, AgentId, RoutingContext, RoutingDecision } from '@/types/chat';

interface DetermineAgentParams {
  _message: string;
  currentAgent: AgentId;
  context: AgentContext;
}

export function determineAgent({ _message, currentAgent, context }: DetermineAgentParams): {
  agent: AgentId;
  reason?: string;
} {
  if (context.pathname) {
    if (
      context.pathname.includes('/waitlist') ||
      context.pathname.includes('/merchstore') ||
      context.pathname.includes('/quotes')
    ) {
      return { agent: 'leopoldo', reason: 'path context' };
    }
    if (
      context.pathname.includes('/catalog') ||
      context.pathname.includes('/design') ||
      context.pathname.includes('/products')
    ) {
      return { agent: 'francisca', reason: 'path context' };
    }
    if (
      context.pathname.includes('/support') ||
      context.pathname.includes('/orders') ||
      context.pathname.includes('/tracking')
    ) {
      return { agent: 'antonia', reason: 'path context' };
    }
  }

  if (context.buttonTrigger) {
    const triggerMappings: Record<string, AgentId> = {
      'join-waitlist': 'leopoldo',
      merchstore: 'leopoldo',
      'bulk-order': 'leopoldo',
      quote: 'leopoldo',
      catalog: 'francisca',
      design: 'francisca',
      'create-product': 'francisca',
      support: 'antonia',
      help: 'antonia',
      'track-order': 'antonia',
    };

    const agent = triggerMappings[context.buttonTrigger];
    if (agent) return { agent, reason: 'button trigger' };
  }

  return { agent: currentAgent, reason: 'default' };
}

interface DetermineAgentWithContextParams {
  _message: string;
  currentAgent: AgentId;
  context: AgentContext;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
}

export async function determineAgentWithContext({
  _message,
  currentAgent,
  context,
  history = [],
}: DetermineAgentWithContextParams): Promise<RoutingDecision> {
  const routingContext: RoutingContext = {
    message: context.message || _message,
    history,
    currentAgent,
    metadata: {
      pathname: context.pathname,
      buttonTrigger: context.buttonTrigger,
    },
  };

  return await contextRouter.analyzeContext(routingContext);
}

export function generateHandoffMessage(fromAgent: AgentId, toAgent: AgentId): string {
  return contextRouter.generateHandoffMessage(fromAgent, toAgent);
}

export function shouldSwitchAgent(currentAgent: AgentId, context: AgentContext): boolean {
  const { agent } = determineAgent({
    _message: context.message || '',
    currentAgent,
    context,
  });
  return agent !== currentAgent;
}

export function getDefaultAgentForPathname(pathname: string): AgentId {
  if (pathname.includes('/waitlist') || pathname.includes('/merchstore') || pathname.includes('/quotes')) {
    return 'leopoldo';
  }
  if (pathname.includes('/catalog') || pathname.includes('/design') || pathname.includes('/products')) {
    return 'francisca';
  }
  return 'antonia';
}

export function getAgentRole(agent: AgentId): string {
  const roles: Record<AgentId, string> = {
    leopoldo: 'Store Manager',
    francisca: 'Art Director',
    antonia: 'Support Specialist',
  };
  return roles[agent];
}

export function getAgentColor(agent: AgentId): string {
  const colors: Record<AgentId, string> = {
    leopoldo: '#22c55e',
    francisca: '#a855f7',
    antonia: '#a1a1aa',
  };
  return colors[agent];
}
