import { type NextRequest, NextResponse } from 'next/server';
import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { miniMaxM2HerProvider } from '@/lib/ai/minimax-m2her';
import { withCors } from '@/lib/cors';
import type { AgentId } from '@/types/chat';

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agent: AgentId;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const rateLimitResult = await requireChatAccess(authResult, 'chat');
  if (rateLimitResult instanceof NextResponse) return withCors(rateLimitResult, origin);

  try {
    const body: ChatRequestBody = await request.json();
    const { message, history, agent } = body;

    if (!message || !agent) {
      return withCors(NextResponse.json({ error: 'Missing message or agent' }, { status: 400 }), origin);
    }

    const messages = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    console.log('[Chat API] Calling AI provider with', messages.length, 'messages');
    const response = await miniMaxM2HerProvider.chat({
      messages,
      agent,
      temperature: 0.7,
      maxTokens: 1024,
    });

    return withCors(NextResponse.json({
      response: response.content,
      agent,
      finishReason: response.finishReason,
    }), origin);
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return withCors(NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 }), origin);
  }
}
