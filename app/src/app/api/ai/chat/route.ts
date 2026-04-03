import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { miniMaxProvider } from '@/lib/ai/provider';
import { withRateLimit } from '@/lib/rate-limit';

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  agent: z.enum(['leopoldo', 'francisca', 'antonia']),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
});

async function chatHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  console.log(`[${requestId}] AI Chat request at ${timestamp}`);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      console.log(`[${requestId}] Validation error:`, validation.error.issues);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { messages, agent, temperature, maxTokens } = validation.data;

    const response = await miniMaxProvider.chat({
      messages,
      agent,
      temperature,
      maxTokens,
    });

    console.log(`[${requestId}] Chat response generated for agent: ${agent}`);

    return NextResponse.json({
      success: true,
      content: response.content,
      finishReason: response.finishReason,
      usage: response.usage,
      metadata: {
        requestId,
        timestamp,
        agent,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Chat request failed:`, error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRateLimit(chatHandler, 'strict');
