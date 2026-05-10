import { type NextRequest, NextResponse } from 'next/server';
import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { withCors } from '@/lib/cors';
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
  const origin = request.headers.get('origin');

  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const rateLimitResult = await requireChatAccess(authResult, 'chat');
  if (rateLimitResult instanceof NextResponse) return withCors(rateLimitResult, origin);

  const requestId = crypto.randomUUID();

  try {
    const body = (await request.json()) as RouteRequestBody;
    const { message, currentAgent, history = [], pathname, buttonTrigger } = body;

    if (!message || typeof message !== 'string') {
      return withCors(NextResponse.json({ error: 'Missing message' }, { status: 400 }), origin);
    }

    if (!currentAgent || !['leopoldo', 'francisca', 'antonia'].includes(currentAgent)) {
      return withCors(NextResponse.json({ error: 'Invalid currentAgent' }, { status: 400 }), origin);
    }

    const routingContext: RoutingContext = {
      message,
      history,
      currentAgent,
      metadata: { pathname, buttonTrigger },
    };

    const decision = await contextRouter.analyzeContext(routingContext);

    console.log(`[${requestId}] Routed to ${decision.agent} (confidence: ${decision.confidence}, handoff: ${decision.shouldHandoff})`);

    return withCors(NextResponse.json(decision), origin);
  } catch (error) {
    console.error(`[${requestId}] Routing error:`, error);

    // Safe fallback — ask for clarification
    return withCors(NextResponse.json({
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
    }), origin);
  }
}
