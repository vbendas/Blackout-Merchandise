import type Anthropic from '@anthropic-ai/sdk';

export interface RunModelTurnParams {
  model: string;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  maxTokens: number;
  onTextDelta?: (text: string) => void;
  /** Stop: ends the model request itself, so no more tokens are spent */
  signal?: AbortSignal;
}

export interface RunModelTurnUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface RunModelTurnResult {
  content: Anthropic.ContentBlock[];
  stopReason: Anthropic.StopReason | null;
  usage: RunModelTurnUsage;
}
