import {
  STUDIO_PROBLEM,
  type AgentErrorCode,
  type AgentEvent,
  type AgentRequest,
  type ConfirmRequest,
  type HistoryPage,
  type HistoryResponse,
  type Suggestion,
  type SuggestResponse,
  type TranscribeResponse,
  type TtsRequest,
  type VoiceSessionResponse,
} from '@/lib/agent/protocol';

export const AGENT_ENDPOINT = process.env.NEXT_PUBLIC_AGENT_ENDPOINT ?? '/api/agent';

export const CONVERSATION_STORAGE_KEY = 'mf-conversation';

// Fallback defaults for the guided-chat fields on HistoryResponse: the
// history endpoint is being extended by another workstream to include
// greeting/quickActions/checklist/projectPill. Until it does, these keep the
// empty state sane instead of throwing on missing fields.
const DEFAULT_GREETING = { headline: 'What are we making?', line: '' };

/** Plain words for each way a request can fail. Never a status code. */
const FAILURE_MESSAGES: Record<AgentErrorCode, string> = {
  offline: "You're offline. Your message is kept.",
  signed_out: "You've been signed out. Sign in again.",
  rate_limited: 'Too many messages at once. Wait a moment and try again.',
  not_pending: 'This step was already handled.',
  server: STUDIO_PROBLEM,
  dropped: STUDIO_PROBLEM,
};

export function failureMessage(code: AgentErrorCode): string {
  return FAILURE_MESSAGES[code];
}

/** The browser knows it has no network. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

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

/** How a request for a streamed reply ended. `done`: a closing event
 * (message_end, confirm_required or an error) arrived. `failed` always comes
 * with an error event first, so a caller that only listens to events still
 * hears about it. `aborted`: the caller's signal (Stop) cut it short. */
export type StreamEnd =
  | { status: 'done' }
  | { status: 'aborted' }
  | { status: 'failed'; code: AgentErrorCode; body?: unknown };

function closes(event: AgentEvent): boolean {
  return event.type === 'message_end' || event.type === 'confirm_required' || event.type === 'error';
}

/** Reads SSE frames until the stream ends. A dropped connection (the reader
 * throws) and a stream that ends without its closing event both come back
 * as `failed`, never as a throw, so the chat can always unlock. */
async function readEvents(response: Response, onEvent: (event: AgentEvent) => void, signal?: AbortSignal): Promise<StreamEnd> {
  if (!response.body) return { status: 'failed', code: 'dropped' };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let closed = false;
  const deliver = (frame: string) => {
    const event = parseFrame(frame);
    if (!event) return;
    if (closes(event)) closed = true;
    onEvent(event);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        deliver(buffer.slice(0, separatorIndex));
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) deliver(buffer);
  } catch {
    if (signal?.aborted) return { status: 'aborted' };
    return closed ? { status: 'done' } : { status: 'failed', code: 'dropped' };
  }
  if (closed) return { status: 'done' };
  return signal?.aborted ? { status: 'aborted' } : { status: 'failed', code: 'dropped' };
}

/** Signed out: 401/403, Clerk's 404 for an API call without a session (it
 * marks the response with its auth headers), or a redirect to sign-in. */
function isSignedOut(response: Response): boolean {
  if (response.status === 401 || response.status === 403) return true;
  if (response.status === 404 && (response.headers.get('x-clerk-auth-reason') || response.headers.get('x-clerk-auth-status') === 'signed-out')) {
    return true;
  }
  if (!response.redirected) return false;
  try {
    return new URL(response.url).pathname.startsWith('/sign-in');
  } catch {
    return false;
  }
}

function failureFor(response: Response): AgentErrorCode {
  if (isSignedOut(response)) return 'signed_out';
  if (response.status === 429) return 'rate_limited';
  if (response.status === 409) return 'not_pending';
  return 'server';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export interface StreamHandlers {
  onEvent: (event: AgentEvent) => void;
  /** the server accepted the request and its reply is about to stream */
  onOpen?: () => void;
  signal?: AbortSignal;
}

/** POSTs and streams the reply's events. Always settles (never rejects): every
 * failure is reported as an error event in plain words, then returned. */
async function postForEvents(url: string, body: unknown, handlers: StreamHandlers): Promise<StreamEnd> {
  const fail = (code: AgentErrorCode, extra: { body?: unknown } = {}): StreamEnd => {
    handlers.onEvent({ type: 'error', message: failureMessage(code), code });
    return { status: 'failed', code, ...extra };
  };
  if (handlers.signal?.aborted) return { status: 'aborted' };
  if (isOffline()) return fail('offline');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: handlers.signal,
    });
  } catch {
    if (handlers.signal?.aborted) return { status: 'aborted' };
    // fetch rejects (a TypeError) only when no answer came back at all: no
    // network, or the Studio out of reach. Nothing was sent.
    return fail('offline');
  }
  if (!response.ok || isSignedOut(response)) {
    return fail(failureFor(response), { body: await readJson(response) });
  }
  if (!(response.headers.get('content-type') ?? '').includes('text/event-stream')) return fail('server');

  handlers.onOpen?.();
  const end = await readEvents(response, handlers.onEvent, handlers.signal);
  if (end.status === 'failed') handlers.onEvent({ type: 'error', message: failureMessage(end.code), code: end.code });
  return end;
}

export function sendAgentMessage(request: AgentRequest, handlers: StreamHandlers): Promise<StreamEnd> {
  return postForEvents(AGENT_ENDPOINT, request, handlers);
}

export function sendAgentConfirm(request: ConfirmRequest, handlers: StreamHandlers): Promise<StreamEnd> {
  return postForEvents(`${AGENT_ENDPOINT}/confirm`, request, handlers);
}

export async function fetchAgentHistory(
  conversationId: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<HistoryResponse | null> {
  try {
    const query = fresh ? 'fresh=1' : `conversationId=${encodeURIComponent(conversationId)}`;
    const response = await fetch(`${AGENT_ENDPOINT}/history?${query}`);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<HistoryResponse> &
      Pick<HistoryResponse, 'conversationId' | 'messages' | 'chips' | 'project'>;
    return {
      conversationId: data.conversationId,
      messages: data.messages,
      earlierCursor: data.earlierCursor ?? null,
      chips: data.chips,
      project: data.project,
      greeting: data.greeting ?? DEFAULT_GREETING,
      quickActions: data.quickActions ?? [],
      checklist: data.checklist ?? null,
      projectPill: data.projectPill ?? null,
      resume: data.resume ?? null,
    };
  } catch {
    return null;
  }
}

/** The page of messages before `before` (a message id from the last page's
 * `earlierCursor`), or null when it could not load. */
export async function fetchEarlierHistory(conversationId: string, before: string): Promise<HistoryPage | null> {
  try {
    const query = `conversationId=${encodeURIComponent(conversationId)}&before=${encodeURIComponent(before)}`;
    const response = await fetch(`${AGENT_ENDPOINT}/history?${query}`);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<HistoryPage>;
    if (!data.conversationId || !Array.isArray(data.messages)) return null;
    return { conversationId: data.conversationId, messages: data.messages, earlierCursor: data.earlierCursor ?? null };
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

export const UPLOAD_ENDPOINT = '/api/uploads';

export interface UploadResult {
  designId: string;
  url: string;
  previewUrl: string;
  widthPx: number;
  heightPx: number;
  readiness: 'ready' | 'needs_cleanup' | 'blocked';
  notes: string[];
}

export interface UploadHandlers {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** POST /api/uploads (multipart `file`) — another workstream owns this route
 * and it 404s/500s until it lands. Uses XHR (not fetch) so upload progress is
 * observable for the composer's progress pill. */
export function uploadDesign(file: File, handlers: UploadHandlers = {}): Promise<UploadResult> {
  // XHR is the only way to observe upload progress in the browser; fetch has
  // no upload-progress event.
  // oxlint-disable-next-line eslint-plugin-promise(avoid-new)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_ENDPOINT);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) handlers.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error("That upload didn't go through. Try again."));
        }
      } else {
        reject(new Error("That upload didn't go through. Try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Couldn't reach the Studio. Check your connection."));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    handlers.signal?.addEventListener('abort', () => xhr.abort());
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export const VOICE_ENDPOINT = '/api/voice';

/** POST /api/voice/transcribe (multipart `audio`) — another workstream owns
 * this route; until it ships this rejects and callers surface an error. */
export async function transcribeAudio(audio: Blob, signal?: AbortSignal): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', audio, 'audio.webm');
  let response: Response;
  try {
    response = await fetch(`${VOICE_ENDPOINT}/transcribe`, { method: 'POST', body: formData, signal });
  } catch {
    throw new Error("Couldn't reach the Studio. Check your connection.");
  }
  if (!response.ok) throw new Error("Couldn't make out what you said. Try again.");
  return (await response.json()) as TranscribeResponse;
}

/** POST /api/voice/tts { text } → audio/mpeg stream. Another workstream owns
 * this route; until it ships this rejects and callers surface an error. */
export async function fetchTts(text: string, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${VOICE_ENDPOINT}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text } satisfies TtsRequest),
      signal,
    });
  } catch {
    throw new Error("Couldn't reach the Studio. Check your connection.");
  }
  if (!response.ok) throw new Error("Couldn't play the reply.");
  return await response.blob();
}

/** GET /api/voice/session — another workstream owns this route; a 404 or
 * network error resolves to the fallback engine rather than throwing. */
export async function fetchVoiceSession(signal?: AbortSignal): Promise<VoiceSessionResponse> {
  try {
    const response = await fetch(`${VOICE_ENDPOINT}/session`, { signal });
    if (!response.ok) return { mode: 'fallback' };
    return (await response.json()) as VoiceSessionResponse;
  } catch {
    return { mode: 'fallback' };
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
