import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import type { ChatPick } from '@/lib/agent/pick';

/** What the artist reads when something on our side went wrong. Raw errors
 * stay in the server log; this is all that reaches the screen. */
export const STUDIO_PROBLEM = 'The Studio had a problem. Try again.';

/** Why a request failed. Set by the client on the error events it makes up
 * itself (the server's own error events carry no code). */
export type AgentErrorCode = 'offline' | 'signed_out' | 'rate_limited' | 'not_pending' | 'server' | 'dropped';

// SSE events streamed from POST /api/agent to the chat client, in order.
export type AgentEvent =
  | { type: 'message_start'; messageId: string; conversationId: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; toolCallId: string; name: string; label: string }
  | { type: 'tool_end'; toolCallId: string; name: string; ok: boolean; ui?: ToolUi }
  | { type: 'cards'; cards: Card[] }
  | { type: 'chips'; chips: Chip[] }
  | { type: 'project'; project: NonNullable<ToolUi['project']> | null }
  /** a confirm-gated tool is waiting; the turn ends here */
  | { type: 'confirm_required'; toolCallId: string; name: string; card: Extract<Card, { kind: 'confirm' }> }
  | { type: 'message_end'; messageId: string; stopReason: string }
  | { type: 'error'; message: string; code?: AgentErrorCode };

export interface AgentRequest {
  conversationId?: string;
  /** plain text from the input box or a chip prompt */
  text: string;
  /** optional image/file references already uploaded (Cloudinary URLs) */
  attachments?: { url: string; kind: 'image' | 'file'; name?: string; designId?: string }[];
  /** Try again after a failed reply: when the artist's last stored message
   * is this same text, the server answers it instead of storing it twice */
  retry?: boolean;
  /** several blanks picked in the catalogue, for one design or one run (lib/agent/pick.ts) */
  pick?: ChatPick;
}

export interface ConfirmRequest {
  conversationId: string;
  toolCallId: string;
  approve: boolean;
}

/** What became of a confirm-gated step (absent while it waits for the artist). */
export type ConfirmOutcome = NonNullable<Extract<Card, { kind: 'confirm' }>['outcome']>;

/** 409 from POST /api/agent/confirm: the step was already decided, here or elsewhere. */
export interface ConfirmConflict {
  error: 'not_pending';
  outcome: ConfirmOutcome | null;
}

// --- Guided-chat additions (chat redesign) ---

export type SuggestionArea = 'Catalog' | 'Product' | 'Design' | 'Shop' | 'Bulk' | 'Orders' | 'Admin';

export interface Suggestion {
  /** full prompt text the user can accept */
  text: string;
  area: SuggestionArea;
}

/** GET /api/agent/suggest?q=<typed text> → ranked, max 5; empty q = state defaults. */
export interface SuggestResponse {
  suggestions: Suggestion[];
}

export interface ChecklistStep {
  key: string;
  label: string;
  done: boolean;
  prompt: string;
}

export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: Card[];
  /** images the artist sent with the message */
  attachments?: AgentRequest['attachments'];
  /** the catalogue pick the artist sent with a user message, for its strip */
  pick?: ChatPick;
}

/** GET /api/agent/history?conversationId=&before=<message id>: the page of
 * messages before that one (older first), for "Show earlier messages". */
export interface HistoryPage {
  conversationId: string;
  messages: HistoryMessage[];
  /** pass as `before` for the page before this one; null at the start */
  earlierCursor: string | null;
}

/** GET /api/agent/history?conversationId= */
export interface HistoryResponse {
  conversationId: string;
  messages: HistoryMessage[];
  /** older messages exist: pass as `before` to load them (null when all are here) */
  earlierCursor?: string | null;
  /** chips from the last assistant turn */
  chips: Chip[];
  project: NonNullable<ToolUi['project']> | null;
  /** empty-state greeting: 'What are we making, Hellslain?' + a status line */
  greeting: { headline: string; line: string };
  /** state-keyed quick actions shown as rounded pills above the composer (3–5) */
  quickActions: Chip[];
  /** onboarding progress shown under the composer while the shop is not live (null once live) */
  checklist: ChecklistStep[] | null;
  /** compact summary for the top-bar project pill (null when nothing active) */
  projectPill: { label: string; status: string; colourHex?: string } | null;
  /** fresh sessions only: the previous conversation the Studio home offers
   * to continue, labelled by its project when it has one */
  resume?: { conversationId: string; label: string; status?: string } | null;
}

// --- Storefront ↔ Stripe checkout contract (wave 2) ---

export interface CheckoutLine {
  productId: string;
  colourCode: string;
  size: string;
  qty: number;
}

/** POST /api/stripe/checkout */
export interface CheckoutRequest {
  storeSlug: string;
  lines: CheckoutLine[];
  /** ISO-2 destination country chosen on the cart page; selects the shipping zone */
  country: string;
  email?: string;
}

export interface CheckoutResponse {
  /** hosted Checkout URL (or the local mock checkout page when STRIPE_MOCK=1) */
  url: string;
  sessionId: string;
}

// --- Voice (wave 4) ---

/** POST /api/voice/transcribe (multipart `audio`, webm/opus or wav) */
export interface TranscribeResponse {
  text: string;
  language?: string;
  durationMs?: number;
}

/** POST /api/voice/tts { text } → audio/mpeg stream */
export interface TtsRequest {
  text: string;
}

/** GET /api/voice/session → a signed URL for ElevenLabs Conversational AI (null when no agent is configured) */
export interface VoiceSessionResponse {
  mode: 'conversational' | 'fallback';
  signedUrl?: string;
  agentId?: string;
}
