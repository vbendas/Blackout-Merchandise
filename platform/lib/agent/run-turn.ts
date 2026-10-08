import type { Card } from '@/lib/ui-cards/schemas';
import type { AgentEvent } from '@/lib/agent/protocol';
import { startAgentTurn, type BaseAgentContext } from '@/lib/agent/loop';

export interface RunTurnConfirm {
  toolName: string;
  card: Extract<Card, { kind: 'confirm' }>;
}

export interface RunTurnResult {
  /** concatenated text from every text_delta the turn emitted */
  text: string;
  /** set when the turn stopped at a confirm-gated tool instead of finishing */
  confirmRequired: RunTurnConfirm | null;
  stopReason: string;
  error: string | null;
}

export interface RunTurnCallbacks {
  /** called synchronously as each text_delta arrives, for callers that need
   * to stream (e.g. the voice bridge forwarding tokens as SSE chunks) rather
   * than wait for the whole turn to finish. */
  onTextDelta?: (text: string) => void;
}

/**
 * `startAgentTurn` only streams `AgentEvent`s to an `emit` callback (see
 * lib/agent/loop.ts) — it has no "give me the final text" return value.
 * Callers that just want the assistant's spoken/written reply as a string
 * (the voice bridge; anywhere else that isn't the SSE chat client) use this
 * adapter instead of re-deriving AgentEvent handling themselves.
 */
export async function runTurnForText(
  base: BaseAgentContext,
  userText: string,
  callbacks: RunTurnCallbacks = {},
): Promise<RunTurnResult> {
  let text = '';
  let confirmRequired: RunTurnConfirm | null = null;
  let stopReason = 'end_turn';
  let error: string | null = null;

  const emit = (event: AgentEvent) => {
    switch (event.type) {
      case 'text_delta':
        text += event.text;
        callbacks.onTextDelta?.(event.text);
        break;
      case 'confirm_required':
        confirmRequired = { toolName: event.name, card: event.card };
        break;
      case 'message_end':
        stopReason = event.stopReason;
        break;
      case 'error':
        error = event.message;
        break;
      default:
        break;
    }
  };

  await startAgentTurn({ base, userText, emit });

  return { text, confirmRequired, stopReason, error };
}
