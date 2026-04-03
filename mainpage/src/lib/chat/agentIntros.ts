import type { LegacyAgent } from '@/types/chat';

interface AgentIntro {
  firstTime: string;
  handoff: (fromAgent: LegacyAgent) => string;
  returning: string;
}

const agentIntros: Record<LegacyAgent, AgentIntro> = {
  Leopoldo: {
    firstTime: "Hi! I'm Leopoldo, your Store Manager. I help artists set up their merch stores, handle onboarding, and manage business operations. How can I help you today?",
    handoff: (from) => `Hi! I'm Leopoldo. ${from} asked me to take over - I'll help you with the business side of things. What do you need?`,
    returning: "Welcome back! I'm Leopoldo, ready to help with your store. Where were we?",
  },
  Francisca: {
    firstTime: "Hello! I'm Francisca, your Art Director. I help bring your creative vision to life - from designing products to creating mockups. Let's make something amazing together!",
    handoff: (from) => `Hi there! I'm Francisca. ${from} passed you to me - I'm here to help with all things design and creative. What would you like to create?`,
    returning: "Back again? Lovely! I'm Francisca, ready to design. What are we working on today?",
  },
  Antônia: {
    firstTime: "Hey! I'm Antônia, your Operations Lead. I'm here to help with orders, shipping, tracking, and any questions you have. Think of me as your support guru!",
    handoff: (from) => `Hello! I'm Antônia. ${from} handed you off to me - I'm here for all your support needs. What's going on?`,
    returning: "Good to see you again! I'm Antônia, here to help. What can I do for you?",
  },
};

export function getAgentIntro(
  agent: LegacyAgent, 
  context: 'firstTime' | 'handoff' | 'returning',
  fromAgent?: LegacyAgent
): string {
  const intro = agentIntros[agent];
  
  if (context === 'handoff' && fromAgent) {
    return intro.handoff(fromAgent);
  }
  
  if (context === 'handoff') {
    return intro.firstTime;
  }
  
  return intro[context] as string;
}

export function getWelcomeMessage(
  agent: LegacyAgent,
  isNewUser: boolean,
  previousAgent?: LegacyAgent
): string {
  if (isNewUser) {
    return agentIntros[agent].firstTime;
  }
  
  if (previousAgent && previousAgent !== agent) {
    return getAgentIntro(agent, 'handoff', previousAgent);
  }
  
  return agentIntros[agent].returning;
}
