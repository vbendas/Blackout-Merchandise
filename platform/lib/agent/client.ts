import type { AgentEvent, AgentRequest, ConfirmRequest, HistoryResponse, Suggestion, SuggestResponse } from '@/lib/agent/protocol';

export const AGENT_ENDPOINT = process.env.NEXT_PUBLIC_AGENT_ENDPOINT ?? '/api/agent';

export const CONVERSATION_STORAGE_KEY = 'mf-conversation';

// Fallback defaults for the guided-chat fields on HistoryResponse: the
// history endpoint is being extended by another workstream to include
// greeting/quickActions/checklist/projectPill. Until it does, these keep the
// empty state sane instead of throwing on missing fields.
const DEFAULT_GREETING = { headline: 'What are we making?', line: '' };

function parseFrame(frame: string): AgentEvent | null {
  const dataLines: string[] = [];
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length === 0) return null;
  try {
    return JSON.parse(dataLines.join('\n')) as AgentEvent;
  } catch {
    return null;
  }
}

async function streamEvents(response: Response, onEvent: (event: AgentEvent) => void): Promise<void> {
  if (!response.body) {
    onEvent({ type: 'error', message: 'The agent returned an empty response.' });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const event = parseFrame(frame);
      if (event) onEvent(event);
      separatorIndex = buffer.indexOf('\n\n');
    }
  }
  const trailing = parseFrame(buffer);
  if (trailing) onEvent(trailing);
}

export interface StreamHandlers {
  onEvent: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

async function postForEvents(url: string, body: unknown, handlers: StreamHandlers): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: handlers.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    handlers.onEvent({ type: 'error', message: 'Could not reach the agent.' });
    return;
  }
  if (!response.ok) {
    handlers.onEvent({ type: 'error', message: `Agent request failed (${response.status}).` });
    return;
  }
  await streamEvents(response, handlers.onEvent);
}

export function sendAgentMessage(request: AgentRequest, handlers: StreamHandlers): Promise<void> {
  return postForEvents(AGENT_ENDPOINT, request, handlers);
}

export function sendAgentConfirm(request: ConfirmRequest, handlers: StreamHandlers): Promise<void> {
  return postForEvents(`${AGENT_ENDPOINT}/confirm`, request, handlers);
}

export async function fetchAgentHistory(conversationId: string): Promise<HistoryResponse | null> {
  try {
    const response = await fetch(`${AGENT_ENDPOINT}/history?conversationId=${encodeURIComponent(conversationId)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<HistoryResponse> &
      Pick<HistoryResponse, 'conversationId' | 'messages' | 'chips' | 'project'>;
    return {
      conversationId: data.conversationId,
      messages: data.messages,
      chips: data.chips,
      project: data.project,
      greeting: data.greeting ?? DEFAULT_GREETING,
      quickActions: data.quickActions ?? [],
      checklist: data.checklist ?? null,
      projectPill: data.projectPill ?? null,
    };
  } catch {
    return null;
  }
}

/** GET /api/agent/suggest?q= — another workstream owns this route; until it
 * ships, a 404/network error resolves to no suggestions rather than an error. */
export async function fetchSuggestions(query: string, signal?: AbortSignal): Promise<Suggestion[]> {
  try {
    const response = await fetch(`${AGENT_ENDPOINT}/suggest?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) return [];
    const data = (await response.json()) as SuggestResponse;
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export function loadStoredConversationId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(CONVERSATION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeConversationId(conversationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
  } catch {
    return;
  }
}
