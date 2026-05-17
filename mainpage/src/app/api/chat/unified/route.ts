import { NextRequest, NextResponse } from 'next/server';
import { mistralChatProvider } from '@/lib/ai/mistral-chat';
import { withCors } from '@/lib/cors';
import {
  detectSearchIntent,
  searchCatalogForAgent,
  formatSearchResultsForPrompt,
  type ProductSearchResult,
} from '@/lib/ai/searchTool';
import type { AgentId } from '@/types/chat';

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agent: AgentId;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  console.log('[Chat API] Received chat request');
  
  try {
    const body: ChatRequestBody = await request.json();
    const { message, history, agent } = body;

    console.log('[Chat API] Request body:', {
      messageLength: message?.length,
      agent,
      historyLength: history?.length,
    });

    if (!message || !agent) {
      console.error('[Chat API] Missing message or agent');
      return withCors(
        NextResponse.json(
          { error: 'Missing message or agent' },
          { status: 400 }
        ),
        origin
      );
    }

    const messages = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // --- Search intent detection ---
    let searchContext: string | undefined;
    let hasMoreResults = false;
    let searchResults: ProductSearchResult[] = [];

    const searchIntent = detectSearchIntent(message);
    console.log('[Chat API] Search intent:', JSON.stringify(searchIntent));
    
    if (
      searchIntent.hasSearchIntent &&
      ['francisca', 'leopoldo', 'antonia'].includes(agent)
    ) {
      console.log('[Chat API] ✅ Search intent detected, querying Typesense...');
      searchResults = await searchCatalogForAgent(
        searchIntent.query,
        searchIntent.filters,
        6
      );
      console.log('[Chat API] Typesense returned', searchResults.length, 'results');
      if (searchResults.length > 0) {
        searchContext = formatSearchResultsForPrompt(searchResults);
        hasMoreResults = searchResults.length >= 6;
        console.log('[Chat API] Search context (first 200 chars):', searchContext.slice(0, 200));
      } else {
        console.log('[Chat API] ⚠️ No results found for query:', searchIntent.query);
      }
    } else {
      console.log('[Chat API] No search intent or unsupported agent');
    }

    console.log('[Chat API] Calling Mistral with', messages.length, 'messages');
    const response = await mistralChatProvider.chat({
      messages,
      agent,
      temperature: 0.7,
      maxTokens: 1024,
      searchContext,
      hasMoreResults,
    });

    console.log('[Chat API] Mistral response:', {
      contentLength: response.content?.length,
      finishReason: response.finishReason,
    });

    return withCors(NextResponse.json({
      response: response.content,
      agent,
      finishReason: response.finishReason,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
      hasMoreResults: searchResults.length > 0 ? hasMoreResults : undefined,
    }), origin);
  } catch (error) {
    console.error('[Chat API] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return withCors(
      NextResponse.json(
        { error: 'Failed to process chat request' },
        { status: 500 }
      ),
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withCors(new NextResponse(null, { status: 204 }), origin);
}
