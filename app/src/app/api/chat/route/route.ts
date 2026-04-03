import { type NextRequest, NextResponse } from 'next/server';
import { contextRouter } from '@/lib/ai/contextRouter';
import type { AgentId, RoutingContext } from '@/types/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.message || !body.currentAgent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: message, currentAgent',
          routing: null,
        },
        { status: 400 }
      );
    }

    const validAgents: AgentId[] = ['leopoldo', 'francisca', 'antonia'];
    if (!validAgents.includes(body.currentAgent)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currentAgent. Must be: leopoldo, francisca, or antonia',
          routing: null,
        },
        { status: 400 }
      );
    }

    const context: RoutingContext = {
      message: body.message,
      history: body.history || [],
      currentAgent: body.currentAgent,
      metadata: {
        pathname: body.pathname,
        buttonTrigger: body.buttonTrigger,
        userIntent: body.userIntent,
      },
    };

    const routing = await contextRouter.analyzeContext(context);

    return NextResponse.json({
      success: true,
      routing,
    });
  } catch (error) {
    console.error('[Route API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Routing analysis failed',
        routing: {
          agent: 'unknown',
          confidence: 0,
          reason: 'Error in routing analysis',
          shouldHandoff: false,
          needsClarification: true,
          clarificationOptions: [
            {
              agent: 'leopoldo',
              label: 'Pricing & Business',
              description: 'Profit margins, pricing strategy',
            },
            {
              agent: 'francisca',
              label: 'Design & Products',
              description: 'Artwork, catalog, mockups',
            },
            {
              agent: 'antonia',
              label: 'Orders & Support',
              description: 'Tracking, shipping, issues',
            },
          ],
        },
      },
      { status: 500 }
    );
  }
}
