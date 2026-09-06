import type { AgentEvent } from '@/lib/agent/protocol';

/** Formats one AgentEvent as an SSE frame: `event: <type>\ndata: <json>\n\n`. */
function formatFrame(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Wraps a turn-running function into a `text/event-stream` ReadableStream.
 * `run` receives an `emit` callback; any error it throws (or a caller-visible
 * failure it doesn't otherwise report) is surfaced as an `error` event before
 * the stream closes, so the client always sees a terminal frame.
 */
export function createAgentSseStream(run: (emit: (event: AgentEvent) => void) => Promise<void>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: AgentEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(formatFrame(event)));
      };
      try {
        await run(emit);
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Unexpected agent error.' });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });
}

export const SSE_HEADERS: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};
