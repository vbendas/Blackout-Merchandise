import { STUDIO_PROBLEM, type AgentEvent } from '@/lib/agent/protocol';

/** Formats one AgentEvent as an SSE frame: `event: <type>\ndata: <json>\n\n`. */
function formatFrame(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Wraps a turn-running function into a `text/event-stream` ReadableStream.
 * `run` receives an `emit` callback and an AbortSignal that fires when the
 * client goes away (Stop, a closed tab, a dropped connection), so the turn
 * can end at its next safe point instead of running on unseen. Emitting
 * after that is a no-op, never a throw. Any error `run` throws is logged here
 * and reaches the client only as a plain `error` event, never its raw text.
 */
export function createAgentSseStream(
  run: (emit: (event: AgentEvent) => void, signal: AbortSignal) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const disconnected = new AbortController();
  let closed = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(formatFrame(event)));
        } catch {
          // The stream was torn down under us: the client is gone.
          closed = true;
        }
      };
      try {
        await run(emit, disconnected.signal);
      } catch (err) {
        console.error('[agent] turn failed', err);
        emit({ type: 'error', message: STUDIO_PROBLEM });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed by a cancel
          }
        }
      }
    },
    cancel() {
      closed = true;
      disconnected.abort();
    },
  });
}

export const SSE_HEADERS: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};
