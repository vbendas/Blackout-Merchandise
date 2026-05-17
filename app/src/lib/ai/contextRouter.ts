import type { AgentId, ClarificationOption, RoutingContext, RoutingDecision } from '@/types/chat';
import { sanitizePromptInput } from '@/lib/sanitize/prompt-sanitize';
import { ROUTING_KNOWLEDGE_BASE } from './agentKnowledgeBase';
import { routerProvider } from './routerProvider';

import { CHAT_CONFIG } from '@/lib/chat/config';

export class ContextRouter {
  private readonly CONFIDENCE_THRESHOLD = CHAT_CONFIG.thresholds.confidence * 100; // config is 0-1, router uses 0-100
  private readonly HISTORY_CONTEXT_WINDOW = CHAT_CONFIG.limits.historyContextWindow;
  private readonly ENABLE_LLM_ROUTING = process.env.ENABLE_LLM_ROUTING === 'true';

  async analyzeContext(context: RoutingContext): Promise<RoutingDecision> {
    const startTime = Date.now();

    try {
      if (!this.ENABLE_LLM_ROUTING) {
        console.log('[ContextRouter] LLM routing disabled, using fallback');
        const fallback = this.getFallbackDecision(context);
        this.logRouting(fallback, context, startTime, 'fallback');
        return fallback;
      }

      const pathDecision = this.checkPathContext(context);
      if (pathDecision) {
        this.logRouting(pathDecision, context, startTime, 'path-based');
        return pathDecision;
      }

      const buttonDecision = this.checkButtonTrigger(context);
      if (buttonDecision) {
        this.logRouting(buttonDecision, context, startTime, 'button-trigger');
        return buttonDecision;
      }

      const decision = await this.analyzeWithLLM(context);
      this.logRouting(decision, context, startTime, 'llm');
      return decision;
    } catch (error) {
      console.error('[ContextRouter] Analysis failed:', error);
      const fallback = this.getFallbackDecision(context);
      this.logRouting(fallback, context, startTime, 'error');
      return fallback;
    }
  }

  private checkPathContext(context: RoutingContext): RoutingDecision | null {
    const pathname = context.metadata?.pathname;
    if (!pathname) return null;

    const pathMappings: Record<string, AgentId> = {
      '/waitlist': 'leopoldo',
      '/merchstore': 'leopoldo',
      '/quotes': 'leopoldo',
      '/catalog': 'francisca',
      '/design': 'francisca',
      '/products': 'francisca',
      '/support': 'antonia',
      '/orders': 'antonia',
      '/tracking': 'antonia',
    };

    for (const [path, agent] of Object.entries(pathMappings)) {
      if (pathname.includes(path)) {
        return {
          agent,
          confidence: 90,
          reason: `User is on ${path} page`,
          shouldHandoff: agent !== context.currentAgent,
          handoffMessage: this.generateHandoffMessage(context.currentAgent, agent),
        };
      }
    }

    return null;
  }

  private checkButtonTrigger(context: RoutingContext): RoutingDecision | null {
    const trigger = context.metadata?.buttonTrigger;
    if (!trigger) return null;

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

    const agent = triggerMappings[trigger];
    if (agent) {
      return {
        agent,
        confidence: 95,
        reason: `Button trigger: ${trigger}`,
        shouldHandoff: agent !== context.currentAgent,
        handoffMessage: this.generateHandoffMessage(context.currentAgent, agent),
      };
    }

    return null;
  }

  private async analyzeWithLLM(context: RoutingContext): Promise<RoutingDecision> {
    const prompt = this.buildRoutingPrompt(context);
    const response = await routerProvider.route(prompt);
    return this.parseRoutingResponse(response, context);
  }

  private buildRoutingPrompt(context: RoutingContext): string {
    const recentHistory = context.history
      .slice(-this.HISTORY_CONTEXT_WINDOW)
      .map((m) => {
        const agentName = m.agent ? this.capitalize(m.agent) : 'Assistant';
        const safeContent = sanitizePromptInput(m.content);
        return `${m.role === 'user' ? 'User' : agentName}: ${safeContent}`;
      })
      .join('\n');

    const knowledgeBase = JSON.stringify(ROUTING_KNOWLEDGE_BASE, null, 2);

    const safeMessage = sanitizePromptInput(context.message);

    return `AGENT KNOWLEDGE BASE (condensed):
${knowledgeBase}

CONVERSATION HISTORY (last ${this.HISTORY_CONTEXT_WINDOW} messages):
${recentHistory || '(No history)'}

CURRENT AGENT: ${context.currentAgent}
USER MESSAGE: "${safeMessage}"

ROUTING RULES:
1. EXPLICIT INTENT TAKES PRIORITY: If user says "I want to track", "help me design", "question about pricing" - route to appropriate agent REGARDLESS of conversation history.
2. Strong action verbs indicate explicit intent: "track", "design", "price", "create", "help with", "question about", "need".
3. If user has MULTIPLE INTENTS (e.g., "design a shirt and track my order"), detect all intents and mark needsClarification=true.
4. Use conversation context ONLY when intent is ambiguous.
5. Stay with current agent if confidence < 70 OR if current agent is competent for the request.

Respond with JSON only:
{
  "agent": "leopoldo" | "francisca" | "antonia",
  "confidence": number (0-100),
  "reason": "Brief explanation",
  "shouldHandoff": boolean,
  "handoffMessage": "Natural handoff message if switching (optional)",
  "needsClarification": boolean (if multiple intents or unclear),
  "clarificationOptions": [
    {"agent": "leopoldo", "label": "Pricing & Business", "description": "Profit margins, pricing strategy"},
    {"agent": "francisca", "label": "Design & Products", "description": "Artwork, catalog, mockups"},
    {"agent": "antonia", "label": "Orders & Support", "description": "Tracking, shipping, issues"}
  ] (optional, only if needsClarification=true),
  "intents": [
    {"agent": "leopoldo", "topic": "pricing question", "confidence": 85},
    {"agent": "antonia", "topic": "tracking request", "confidence": 90}
  ] (optional, only if multiple intents detected)
}`;
  }

  private parseRoutingResponse(content: string, context: RoutingContext): RoutingDecision {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const parsed = JSON.parse(jsonMatch[0]);

      const decision: RoutingDecision = {
        agent: parsed.agent,
        confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
        reason: parsed.reason || 'No reason provided',
        shouldHandoff: false,
        handoffMessage: parsed.handoffMessage,
        needsClarification: parsed.needsClarification || false,
        clarificationOptions: parsed.clarificationOptions,
        intents: parsed.intents,
      };

      if (!['leopoldo', 'francisca', 'antonia'].includes(decision.agent as string)) {
        throw new Error(`Invalid agent: ${decision.agent}`);
      }

      decision.shouldHandoff =
        decision.agent !== context.currentAgent &&
        decision.confidence >= this.CONFIDENCE_THRESHOLD &&
        !decision.needsClarification;

      if (decision.shouldHandoff && !decision.handoffMessage) {
        decision.handoffMessage = this.generateHandoffMessage(context.currentAgent, decision.agent as AgentId);
      }

      return decision;
    } catch (error) {
      console.error('[ContextRouter] Parse failed:', error, 'Response:', content);
      return this.getFallbackDecision(context);
    }
  }

  generateHandoffMessage(fromAgent: AgentId, toAgent: AgentId): string {
    const messages: Record<AgentId, Record<AgentId, string>> = {
      leopoldo: {
        leopoldo: '',
        francisca: 'This is a design matter. Francisca, can you take over?',
        antonia: 'For this, Antônia is your best bet. She handles operations.',
      },
      francisca: {
        leopoldo: 'Business question? Leopoldo will know best.',
        francisca: '',
        antonia: "Let me get Antônia for you - she's our operations expert.",
      },
      antonia: {
        leopoldo: 'Leopoldo would be better for this. Let me bring him in.',
        francisca: 'Francisca handles design questions. One moment...',
        antonia: '',
      },
    };

    return messages[fromAgent]?.[toAgent] || `Let me connect you with ${this.capitalize(toAgent)}.`;
  }

  private getFallbackDecision(_context: RoutingContext): RoutingDecision {
    const options: ClarificationOption[] = [
      {
        agent: 'leopoldo',
        label: 'Pricing & Business',
        description: 'Profit margins, pricing strategy, waitlist',
      },
      {
        agent: 'francisca',
        label: 'Design & Products',
        description: 'Artwork, catalog, mockups, print quality',
      },
      {
        agent: 'antonia',
        label: 'Orders & Support',
        description: 'Tracking, shipping, returns, issues',
      },
    ];

    return {
      agent: 'unknown',
      confidence: 0,
      reason: 'Unclear intent - need user clarification',
      shouldHandoff: false,
      needsClarification: true,
      clarificationOptions: options,
    };
  }

  private logRouting(decision: RoutingDecision, context: RoutingContext, startTime: number, method: string): void {
    console.log('[Routing]', {
      timestamp: new Date().toISOString(),
      method,
      message: context.message.slice(0, 50),
      currentAgent: context.currentAgent,
      routedTo: decision.agent,
      confidence: decision.confidence,
      reason: decision.reason,
      switched: decision.shouldHandoff,
      needsClarification: decision.needsClarification || false,
      latencyMs: Date.now() - startTime,
    });
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const contextRouter = new ContextRouter();
