import { NextRequest, NextResponse } from 'next/server';
import { miniMaxM2HerProvider } from '@/lib/ai/minimax-m2her';
import type { AgentId } from '@/types/chat';

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agent: AgentId;
}

export async function POST(request: NextRequest) {
  console.log('[Chat API] Received chat request');
  
  try {
    const body: ChatRequestBody = await request.json();
    const { message, history, agent } = body;

    console.log('[Chat API] Request body:', {
      messageLength: message?.length,
      agent,
      historyLength: history?.length,
    });

    if (!message || !agent) {
      console.error('[Chat API] Missing message or agent');
      return NextResponse.json(
        { error: 'Missing message or agent' },
        { status: 400 }
      );
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

    console.log('[Chat API] MiniMax response:', {
      contentLength: response.content?.length,
      finishReason: response.finishReason,
      isFallback: response.content?.includes("I'd be happy to help") || 
                  response.content?.includes("I'd love to help") || 
                  response.content?.includes("I'm here to help"),
    });

    return NextResponse.json({
      response: response.content,
      agent,
      finishReason: response.finishReason,
    });
  } catch (error) {
    console.error('[Chat API] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
