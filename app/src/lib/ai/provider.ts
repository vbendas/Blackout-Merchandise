export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agent: 'leopoldo' | 'francisca' | 'antonia';
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

const _AGENT_PERSONAS = {
  leopoldo: {
    name: 'Leopoldo',
    role: 'Onboarding & Administration specialist',
    description:
      'Warm, professional onboarding specialist helping artists with account setup, platform guidance, and administrative tasks.',
  },
  francisca: {
    name: 'Francisca',
    role: 'Catalog & Design expert',
    description: 'Creative design expert helping artists with product curation, design creation, and visual identity.',
  },
  antonia: {
    name: 'Antonia',
    role: 'Operations & Support specialist',
    description:
      'Efficient operations specialist helping with order tracking, shipping inquiries, and first-tier customer support.',
  },
};

const AGENT_SYSTEM_PROMPTS = {
  leopoldo: `You are Leopoldo, the Onboarding & Administration specialist for Blackout Merchandise.

Your role is to help artists and creators:
- Complete their account setup and profile
- Navigate the platform features
- Understand pricing and subscription options
- Manage their store settings
- Answer questions about getting started

Be warm, professional, and guide users through processes step by step. Use clear language and offer to elaborate when needed.`,

  francisca: `You are Francisca, the Catalog & Design expert for Blackout Merchandise.

Your role is to help artists and creators:
- Choose products to sell (t-shirts, hoodies, accessories, etc.)
- Create and upload designs
- Understand print techniques and quality
- Build their product catalog
- Optimize product listings for sales

Be creative, helpful, and provide design-focused guidance. Ask about their brand aesthetic and target audience.`,

  antonia: `You are Antonia, the Operations & Support specialist for Blackout Merchandise.

Your role is to help customers and artists:
- Track order status and shipping
- Answer questions about production times
- Handle returns and issues
- Provide general support

Be efficient, empathetic, and solution-oriented. When issues arise, offer concrete next steps.`,
};

function getSystemPrompt(agent: keyof typeof AGENT_SYSTEM_PROMPTS): string {
  return AGENT_SYSTEM_PROMPTS[agent];
}

export class MiniMaxProvider {
  private apiKey: string;
  private groupId: string;
  private baseUrl = 'https://api.minimax.chat/v1';

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY ?? '';
    this.groupId = process.env.MINIMAX_GROUP_ID ?? '';

    if (!this.apiKey || !this.groupId) {
      console.warn('[MiniMaxProvider] Missing API key or Group ID - AI chat will use fallback mode');
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey || !this.groupId) {
      return this.getFallbackResponse(request.agent);
    }

    const systemMessage = getSystemPrompt(request.agent);

    const messages = [{ role: 'system' as const, content: systemMessage }, ...request.messages];

    try {
      const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.1',
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          group_id: this.groupId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[MiniMaxProvider] API error:', error);
        return this.getFallbackResponse(request.agent);
      }

      const data = (await response.json()) as {
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
        return this.getFallbackResponse(request.agent);
      }

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
      console.error('[MiniMaxProvider] Request failed:', error);
      return this.getFallbackResponse(request.agent);
    }
  }

  async *streamChat(request: ChatRequest, options: StreamingOptions): AsyncGenerator<string> {
    if (!this.apiKey || !this.groupId) {
      const fallback = this.getFallbackResponse(request.agent);
      options.onChunk?.(fallback.content);
      yield fallback.content;
      return;
    }

    const systemMessage = getSystemPrompt(request.agent);
    const messages = [{ role: 'system' as const, content: systemMessage }, ...request.messages];

    try {
      const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.1',
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          group_id: this.groupId,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[MiniMaxProvider] Stream error:', error);
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
      console.error('[MiniMaxProvider] Stream failed:', errorMsg);
      options.onError?.(errorMsg);
      const fallback = this.getFallbackResponse(request.agent);
      yield fallback.content;
    }
  }

  private getFallbackResponse(agent: keyof typeof AGENT_SYSTEM_PROMPTS): ChatResponse {
    const fallbackResponses: Record<keyof typeof AGENT_SYSTEM_PROMPTS, string> = {
      leopoldo:
        "I'd be happy to help you with your account setup! Could you tell me more about what you'd like to accomplish today?",
      francisca:
        "I'd love to help you create amazing products! What kind of designs are you thinking about, and what products interest you?",
      antonia:
        "I'm here to help with your order! Could you provide your order number or email address so I can look into this for you?",
    };

    return {
      content: fallbackResponses[agent],
      finishReason: 'stop',
    };
  }
}

export const miniMaxProvider = new MiniMaxProvider();
