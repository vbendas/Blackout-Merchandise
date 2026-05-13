import { mistralClient } from './mistral-client';
import type { AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';

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

function getSystemPrompt(agent: AgentId): string {
  return `${AGENT_CONFIGS[agent].persona}\n\nStay in character. CRITICAL: ALWAYS respond in the SAME LANGUAGE the user is speaking.`;
}

export class MistralChatProvider {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemMessage = getSystemPrompt(request.agent);

    console.log('[Mistral Chat] Agent:', request.agent, 'Messages:', request.messages.length);

    try {
      const response = await mistralClient.chat({
        messages: [
          { role: 'system', content: systemMessage },
          ...request.messages,
        ],
        model: 'mistral-large-latest',
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 1024,
      });

      console.log('[Mistral Chat] Success');
      return response;
    } catch (error) {
      console.error('[Mistral Chat] Failed:', error);
      return this.getFallbackResponse(request.agent);
    }
  }

  private getFallbackResponse(agent: AgentId): ChatResponse {
    const fallbackResponses: Record<AgentId, string> = {
      leopoldo:
        "Oi! I'm Leopoldo, your Store Manager at MerchFrom. I'm here to help you set up your store, manage pricing, or handle bulk orders. What would you like to work on?",
      francisca:
        "Olá! I'm Francisca, your Art Director at MerchFrom. Let's create something stunning together — designs, mockups, or catalog curation. What's your vision?",
      antonia:
        "Hey there! I'm Antônia, your Support Specialist at MerchFrom. I can help track orders, handle shipping questions, or resolve any issues. What's the craic?",
    };

    return {
      content: fallbackResponses[agent],
      finishReason: 'stop',
    };
  }
}

export const mistralChatProvider = new MistralChatProvider();
