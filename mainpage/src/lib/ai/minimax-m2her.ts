import { AGENT_CONFIGS } from '@/types/chat';
import type { AgentId } from '@/types/chat';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agent: AgentId;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

function getSystemPrompt(agent: AgentId): string {
  return AGENT_CONFIGS[agent].persona;
}

// OpenRouter model mapping for MiniMax models
const OPENROUTER_MODELS: Record<string, string> = {
  'M2-her': 'minimax/minimax-m2-her',
  'MiniMax-M2': 'minimax/minimax-m2',
};

export class MiniMaxM2HerProvider {
  private miniMaxApiKey: string;
  private openRouterApiKey: string;
  private miniMaxBaseUrl = 'https://api.minimax.io';
  private openRouterBaseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    this.miniMaxApiKey = process.env.MINIMAX_TEXT_API_KEY ?? '';
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY ?? '';
    
    if (!this.miniMaxApiKey) {
      console.warn('[MiniMaxM2Her] Missing MiniMax API key - will use OpenRouter fallback');
    }
    if (!this.openRouterApiKey) {
      console.warn('[MiniMaxM2Her] Missing OpenRouter API key - no fallback available');
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const miniMaxKeyStatus = this.miniMaxApiKey 
      ? `Loaded (${this.miniMaxApiKey.length} chars)` 
      : 'MISSING';
    const openRouterKeyStatus = this.openRouterApiKey 
      ? `Loaded (${this.openRouterApiKey.length} chars)` 
      : 'MISSING';
    
    console.log('[TextProvider] MiniMax key:', miniMaxKeyStatus, '| OpenRouter key:', openRouterKeyStatus);

    // Try MiniMax first
    if (this.miniMaxApiKey) {
      const result = await this.tryMiniMax(request);
      if (result) {
        return result;
      }
      console.log('[TextProvider] MiniMax failed, falling back to OpenRouter');
    }

    // Fallback to OpenRouter
    if (this.openRouterApiKey) {
      const result = await this.tryOpenRouter(request);
      if (result) {
        return result;
      }
    }

    // Final fallback to canned responses
    console.log('[TextProvider] All providers failed, using canned response');
    return this.getFallbackResponse(request.agent);
  }

  private async tryMiniMax(request: ChatRequest): Promise<ChatResponse | null> {
    const systemMessage = getSystemPrompt(request.agent);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...request.messages
    ];

    console.log('[MiniMax] Sending request:', {
      agent: request.agent,
      messageCount: messages.length,
    });

    try {
      const response = await fetch(`${this.miniMaxBaseUrl}/v1/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.miniMaxApiKey}`,
        },
        body: JSON.stringify({
          model: 'M2-her',
          messages,
          temperature: request.temperature ?? 0.7,
          max_completion_tokens: request.maxTokens ?? 1024,
        }),
      });

      const data = await response.json() as {
        choices?: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        base_resp?: {
          status_code: number;
          status_msg: string;
        };
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      // Check for insufficient balance or other errors
      if (data.base_resp?.status_code === 1008) {
        console.log('[MiniMax] Insufficient balance - falling back to OpenRouter');
        return null;
      }

      if (data.base_resp?.status_code !== 0) {
        console.error('[MiniMax] API error:', data.base_resp);
        return null;
      }

      const choice = data.choices?.[0];
      if (!choice) {
        console.error('[MiniMax] No choices in response');
        return null;
      }

      console.log('[MiniMax] Success!');
      return {
        content: choice.message.content,
        finishReason: choice.finish_reason as 'stop' | 'length',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[MiniMax] Request failed:', error);
      return null;
    }
  }

  private async tryOpenRouter(request: ChatRequest): Promise<ChatResponse | null> {
    const systemMessage = getSystemPrompt(request.agent);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...request.messages
    ];

    // Use minimax model via OpenRouter, or fallback to a good free model
    const model = OPENROUTER_MODELS['M2-her'] || 'google/gemini-2.0-flash-exp:free';

    console.log('[OpenRouter] Sending request:', {
      agent: request.agent,
      model,
      messageCount: messages.length,
    });

    try {
      const response = await fetch(`${this.openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://merchfrom.com',
          'X-Title': 'Merch From',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenRouter] API error:', response.status, errorText);
        return null;
      }

      const data = await response.json() as {
        choices?: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      const choice = data.choices?.[0];
      if (!choice) {
        console.error('[OpenRouter] No choices in response');
        return null;
      }

      console.log('[OpenRouter] Success!');
      return {
        content: choice.message.content,
        finishReason: choice.finish_reason as 'stop' | 'length',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[OpenRouter] Request failed:', error);
      return null;
    }
  }

  async *streamChat(request: ChatRequest, options: StreamingOptions): AsyncGenerator<string> {
    // For streaming, use OpenRouter directly since it's more reliable
    if (this.openRouterApiKey) {
      yield* this.streamOpenRouter(request, options);
      return;
    }

    // Fallback to non-streaming
    const response = await this.chat(request);
    options.onChunk?.(response.content);
    yield response.content;
  }

  private async *streamOpenRouter(request: ChatRequest, options: StreamingOptions): AsyncGenerator<string> {
    const systemMessage = getSystemPrompt(request.agent);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...request.messages
    ];

    const model = OPENROUTER_MODELS['M2-her'] || 'google/gemini-2.0-flash-exp:free';

    try {
      const response = await fetch(`${this.openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://merchfrom.com',
          'X-Title': 'Merch From',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[OpenRouter] Stream error:', error);
        options.onError?.(error);
        const fallback = this.getFallbackResponse(request.agent);
        yield fallback.content;
        return;
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            options.onComplete?.(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              options.onChunk?.(content);
              yield content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      options.onComplete?.(fullContent);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Stream failed';
      console.error('[OpenRouter] Stream failed:', errorMsg);
      options.onError?.(errorMsg);
      const fallback = this.getFallbackResponse(request.agent);
      yield fallback.content;
    }
  }

  private getFallbackResponse(agent: AgentId): ChatResponse {
    const fallbackResponses: Record<AgentId, string> = {
      leopoldo: "I'd be happy to help you with your store! Could you tell me more about what you'd like to accomplish today?",
      francisca: "I'd love to help you create amazing products! What kind of designs are you thinking about, and what products interest you?",
      antonia: "I'm here to help! Could you provide more details so I can assist you better?",
    };

    return {
      content: fallbackResponses[agent],
      finishReason: 'stop',
    };
  }
}

export const miniMaxM2HerProvider = new MiniMaxM2HerProvider();
