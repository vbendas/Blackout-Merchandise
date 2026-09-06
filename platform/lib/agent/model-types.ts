import type Anthropic from '@anthropic-ai/sdk';

export interface RunModelTurnParams {
  model: string;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  maxTokens: number;
  onTextDelta?: (text: string) => void;
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
