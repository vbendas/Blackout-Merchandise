import type { AgentEvent } from '@/lib/agent/protocol';

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sseResponse(events: AsyncIterable<AgentEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

export async function* streamText(text: string): AsyncGenerator<AgentEvent> {
  const words = text.split(' ');
  for (let index = 0; index < words.length; index += 1) {
    await wait(24);
    yield { type: 'text_delta', text: index === 0 ? words[index] : ` ${words[index]}` };
  }
}
