import { mistralClient } from './mistral-client';
import type { AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';
import { getKnowledgeForPrompt } from '@db-root/knowledge';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agent: AgentId;
  temperature?: number;
  maxTokens?: number;
  searchContext?: string;
  hasMoreResults?: boolean;
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

async function getSystemPrompt(
  agent: AgentId,
  searchContext?: string,
  hasMoreResults?: boolean
): Promise<string> {
  let prompt = `${AGENT_CONFIGS[agent].persona}\n\nStay in character. CRITICAL: ALWAYS respond in the SAME LANGUAGE the user is speaking.`;

  // Inject verified knowledge base facts (5-min TTL cached)
  try {
    const knowledge = await getKnowledgeForPrompt();
    if (knowledge) {
      prompt += `\n\n${knowledge}`;
      prompt += `\n\nANTI-HALLUCINATION RULE: For any question about MerchFrom policies, pricing, shipping, or operations, use ONLY the verified facts above. If the answer is not in the verified facts, say you don't know and offer to connect with a human.`;
    }
  } catch (error) {
    // Graceful fallback — knowledge DB might be empty or unreachable
    console.warn('[Mistral Chat] Knowledge base unavailable:', error);
  }

  if (searchContext) {
    prompt += `\n\n⚠️ CRITICAL INSTRUCTION — CATALOG DATA BELOW ⚠️\n\nThe user is asking about products. You MUST answer using ONLY the products listed in the CATALOG SEARCH RESULTS section below.\n\nRULES:\n1. DO NOT invent product names, prices, materials, or specifications.\n2. DO NOT make up brands or features not listed below.\n3. Reference specific products by name and price when answering.\n4. If a product the user wants is NOT in the catalog, say you don't have it.\n5. Keep your response concise — mention 3-4 relevant products max.\n\nCATALOG SEARCH RESULTS:\n${searchContext}\n\nIf there are more results available, mention that you can show more products if the user asks.`;
  }

  if (hasMoreResults) {
    prompt += `\n\nNOTE: There are additional products beyond what's shown above. Tell the user you can show more if they want.`;
  }

  return prompt;
}

export class MistralChatProvider {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemMessage = await getSystemPrompt(
      request.agent,
      request.searchContext,
      request.hasMoreResults
    );

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

  /**
   * Stream a chat completion, yielding content chunks as they arrive.
   * Falls back to the full fallback response on error.
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<string, void, undefined> {
    const systemMessage = await getSystemPrompt(
      request.agent,
      request.searchContext,
      request.hasMoreResults
    );
    console.log('[Mistral Chat Stream] Agent:', request.agent, 'Messages:', request.messages.length);

    try {
      yield* mistralClient.streamChat({
        messages: [
          { role: 'system', content: systemMessage },
          ...request.messages,
        ],
        model: 'mistral-large-latest',
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 1024,
      });
    } catch (error) {
      console.error('[Mistral Chat Stream] Failed:', error);
      // Yield the fallback response as a single chunk
      const fallback = this.getFallbackResponse(request.agent);
      yield fallback.content;
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
