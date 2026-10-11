import Anthropic from '@anthropic-ai/sdk';
import type { RunModelTurnParams, RunModelTurnResult } from '@/lib/agent/model-types';
import { mockRunModelTurn } from '@/lib/agent/mock';

export { AGENT_MODEL, AGENT_LIGHT_MODEL } from '@/lib/agent/model-router';
export const AGENT_MAX_TOKENS = 8000;
export const MAX_LOOP_ITERATIONS = 8;

export function isMockMode(): boolean {
  return process.env.AGENT_MOCK === '1' || !process.env.ANTHROPIC_API_KEY;
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

async function realRunModelTurn(params: RunModelTurnParams): Promise<RunModelTurnResult> {
  try {
    const stream = getClient().messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
    });

    if (params.onTextDelta) {
      stream.on('text', (delta) => params.onTextDelta?.(delta));
    }

    const message = await stream.finalMessage();
    return {
      content: message.content,
      stopReason: message.stop_reason,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
  } catch (err) {
    // Most-specific-first: typed SDK errors carry a clearer signal than a
    // generic message-string check (see claude-api skill, error handling).
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error('The model is rate-limited right now — please try again in a moment.');
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error('The agent is not configured correctly (authentication failed with the model provider).');
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new Error(`The model rejected this request: ${err.message}`);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error('Could not reach the model provider — please try again.');
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Model provider error (${err.status ?? 'unknown status'}): ${err.message}`);
    }
    throw err;
  }
}

/** Real SDK call, or the scripted mock — same interface either way (see mock.ts). */
export async function runModelTurn(params: RunModelTurnParams): Promise<RunModelTurnResult> {
  if (isMockMode()) return mockRunModelTurn(params);
  return realRunModelTurn(params);
}
