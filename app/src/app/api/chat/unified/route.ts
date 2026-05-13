import { type NextRequest, NextResponse } from 'next/server';
import { mistralChatProvider } from '@/lib/ai/mistral-chat';
import { withCors } from '@/lib/cors';
import type { AgentId } from '@/types/chat';

/**
 * Demo mode: Auth is bypassed for chat API routes during crowdfunding sprint.
 *
 * Supports two modes:
 * - Non-streaming (default): Returns complete JSON response
 * - Streaming (?stream=true): Returns SSE (Server-Sent Events) with incremental content chunks
 */

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agent: AgentId;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  const isStreaming = url.searchParams.get('stream') === 'true';

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

    // --- Streaming mode ---
    if (isStreaming) {
      console.log('[Chat API] Streaming mode for agent:', agent);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of mistralChatProvider.streamChat({
              messages,
              agent,
              temperature: 0.7,
              maxTokens: 1024,
            })) {
              const sseMessage = `data: ${JSON.stringify({ content: chunk, agent })}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[Chat API] Stream error:', error);
            const errorMessage = `data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`;
            controller.enqueue(encoder.encode(errorMessage));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // --- Non-streaming mode (default) ---
    console.log('[Chat API] Calling AI provider with', messages.length, 'messages');
    const response = await mistralChatProvider.chat({
      messages,
      agent,
      temperature: 0.7,
      maxTokens: 1024,
    });

    return withCors(
      NextResponse.json({
        response: response.content,
        agent,
        finishReason: response.finishReason,
      }),
      origin
    );
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return withCors(NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 }), origin);
  }
}
