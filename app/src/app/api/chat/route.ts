import { type NextRequest, NextResponse } from 'next/server';
import { classifyIntent, type IntentClassification } from '@/lib/intent-classifier';
import type { AgentId } from '@/types/chat';

interface ChatRequestBody {
  message: string;
  currentAgent?: AgentId;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
  pathname?: string;
  buttonTrigger?: string;
}

interface ChatResponse {
  agent: AgentId;
  message: string;
  intent: string;
  confidence: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  suggestedOptions?: string[];
  reason?: string;
}

/**
 * POST /api/chat
 *
 * Accepts a user message, classifies intent, and returns the
 * appropriate agent assignment with confidence score.
 *
 * Request body:
 *   { message: string, currentAgent?: AgentId, history?: [...] }
 *
 * Response:
 *   { agent, message, intent, confidence, needsClarification?, ... }
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(`[${requestId}] Chat routing request at ${timestamp}`);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const {
      message,
      currentAgent,
      history,
      pathname,
      buttonTrigger,
    } = body as ChatRequestBody;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid field: message' },
        { status: 400 }
      );
    }

    if (currentAgent !== undefined && !['leopoldo', 'francisca', 'antonia'].includes(currentAgent)) {
      return NextResponse.json(
        { error: 'Invalid field: currentAgent must be leopoldo, francisca, or antonia' },
        { status: 400 }
      );
    }

    if (history !== undefined && (!Array.isArray(history) || history.some(
      (h) => typeof h !== 'object' || h === null ||
             !['user', 'assistant'].includes(h.role) ||
             typeof h.content !== 'string'
    ))) {
      return NextResponse.json(
        { error: 'Invalid field: history must be an array of {role, content} objects' },
        { status: 400 }
      );
    }

    if (pathname !== undefined && typeof pathname !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: pathname must be a string' },
        { status: 400 }
      );
    }

    if (buttonTrigger !== undefined && typeof buttonTrigger !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: buttonTrigger must be a string' },
        { status: 400 }
      );
    }

    // Run intent classification
    let classification: IntentClassification;
    try {
      classification = await classifyIntent({
        message,
        currentAgent: currentAgent ?? 'leopoldo',
        history,
      });
    } catch (error) {
      console.error(`[${requestId}] Intent classification failed:`, error);

      // Fallback to Leopoldo on classification failure
      classification = {
        intent: 'general',
        confidence: 0.0,
        agent: 'leopoldo',
        reason: 'Classification failed — defaulted to Leopoldo',
        needsClarification: true,
        clarificationQuestion:
          "I'm having trouble understanding. Could you rephrase?",
        suggestedOptions: [
          'Set up my store',
          'Design a product',
          'Track my order',
        ],
      };
    }

    // Override with path/button context when available (higher priority)
    let finalAgent = classification.agent;
    if (pathname) {
      if (pathname.includes('/waitlist') || pathname.includes('/merchstore') || pathname.includes('/quotes')) {
        finalAgent = 'leopoldo';
      } else if (pathname.includes('/catalog') || pathname.includes('/design') || pathname.includes('/products')) {
        finalAgent = 'francisca';
      } else if (pathname.includes('/support') || pathname.includes('/orders') || pathname.includes('/tracking')) {
        finalAgent = 'antonia';
      }
    }
    if (buttonTrigger) {
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
      if (triggerMappings[buttonTrigger]) {
        finalAgent = triggerMappings[buttonTrigger];
      }
    }

    const response: ChatResponse = {
      agent: finalAgent,
      message,
      intent: classification.intent,
      confidence: classification.confidence,
      needsClarification: classification.needsClarification,
      clarificationQuestion: classification.clarificationQuestion,
      suggestedOptions: classification.suggestedOptions,
      reason: classification.reason,
    };

    console.log(`[${requestId}] Routed to ${finalAgent} (intent: ${classification.intent}, confidence: ${classification.confidence})`);

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[${requestId}] Unhandled error in chat route:`, error);

    // Final safety net — always return something usable
    return NextResponse.json(
      {
        agent: 'leopoldo',
        message: '',
        intent: 'general',
        confidence: 0,
        needsClarification: true,
        clarificationQuestion: 'Something went wrong. How can I help you today?',
        reason: 'Server error — defaulted to Leopoldo',
      } satisfies ChatResponse,
      { status: 500 }
    );
  }
}
