import { type NextRequest, NextResponse } from 'next/server';
import { contextRouter } from '@/lib/ai/contextRouter';
import type { AgentId, RoutingContext } from '@/types/chat';

interface RouteRequestBody {
  message: string;
  currentAgent: AgentId;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
  pathname?: string;
  buttonTrigger?: string;
}

/**
 * POST /api/chat
 *
 * Server-side agent routing using Mistral Direct API.
 * Returns a full RoutingDecision with handoff logic.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = (await request.json()) as RouteRequestBody;
    const { message, currentAgent, history = [], pathname, buttonTrigger } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    if (!currentAgent || !['leopoldo', 'francisca', 'antonia'].includes(currentAgent)) {
      return NextResponse.json({ error: 'Invalid currentAgent' }, { status: 400 });
    }

    const routingContext: RoutingContext = {
      message,
      history,
      currentAgent,
      metadata: { pathname, buttonTrigger },
    };

    const decision = await contextRouter.analyzeContext(routingContext);

    console.log(`[${requestId}] Routed to ${decision.agent} (confidence: ${decision.confidence}, handoff: ${decision.shouldHandoff})`);

    return NextResponse.json(decision);
  } catch (error) {
    console.error(`[${requestId}] Routing error:`, error);

    // Safe fallback — ask for clarification
    return NextResponse.json({
      agent: 'unknown',
      confidence: 0,
      reason: 'Server error — defaulted to clarification',
      shouldHandoff: false,
      needsClarification: true,
      clarificationOptions: [
        { agent: 'leopoldo', label: 'Pricing & Business', description: 'Profit margins, pricing strategy, waitlist' },
        { agent: 'francisca', label: 'Design & Products', description: 'Artwork, catalog, mockups, print quality' },
        { agent: 'antonia', label: 'Orders & Support', description: 'Tracking, shipping, returns, issues' },
      ],
    });
  }
}
