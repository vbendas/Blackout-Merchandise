import { type NextRequest, NextResponse } from 'next/server';
import { miniMaxM2HerProvider } from '@/lib/ai/minimax-m2her';
import { sanitizePromptInput } from '@/lib/sanitize/prompt-sanitize';
import { withCors } from '@/lib/cors';
import type { AgentId } from '@/types/chat';
import { AGENT_CONFIGS } from '@/types/chat';

/**
 * Demo mode: Auth is bypassed for chat API routes during crowdfunding sprint.
 */

interface SuggestionsRequestBody {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agent: AgentId;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const body: SuggestionsRequestBody = await request.json();
    const { history, agent } = body;

    if (!agent) {
      return withCors(NextResponse.json({ error: 'Missing agent' }, { status: 400 }), origin);
    }

    const agentConfig = AGENT_CONFIGS[agent];

    const prompt = `You are ${agentConfig.name}, ${agentConfig.role} for MerchFrom.
    
Based on the conversation history below, generate 3-4 quick reply suggestions that the user might want to click. These should be natural follow-up questions or actions they might take.

Keep suggestions short (2-6 words), conversational, and relevant to what they're discussing.

Return ONLY a JSON array of strings, nothing else. Example: ["Ask about pricing", "View catalog", "Talk to sales"]

Conversation history:
${history
  .slice(-6)
  .map((m) => {
    const prefix = m.role === 'user' ? 'User' : agentConfig.name;
    const safeContent = sanitizePromptInput(m.content);
    return `${prefix}: ${safeContent}`;
  })
  .join('\n')}`;

    const response = await miniMaxM2HerProvider.chat({
      messages: [{ role: 'user', content: prompt }],
      agent,
      temperature: 0.9,
      maxTokens: 256,
    });

    try {
      const suggestions = JSON.parse(response.content);
      if (Array.isArray(suggestions)) {
        return withCors(NextResponse.json({ suggestions: suggestions.slice(0, 4) }), origin);
      }
    } catch {
      // If parsing fails, return fallback suggestions
    }

    // Fallback suggestions based on agent
    const fallbackSuggestions: Record<AgentId, string[]> = {
      antonia: ['Track my order', 'Talk to support', 'General question'],
      leopoldo: ['Join waitlist', 'Start selling', 'Pricing info'],
      francisca: ['Browse catalog', 'Create design', 'Product info'],
    };

    return withCors(NextResponse.json({
      suggestions: fallbackSuggestions[agent] || fallbackSuggestions.antonia,
    }), origin);
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return withCors(NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 }), origin);
  }
}
