import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';

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
  | { type: 'error'; message: string };

export interface AgentRequest {
  conversationId?: string;
  /** plain text from the input box or a chip prompt */
  text: string;
  /** optional image/file references already uploaded (Cloudinary URLs) */
  attachments?: { url: string; kind: 'image' | 'file'; name?: string; designId?: string }[];
}

export interface ConfirmRequest {
  conversationId: string;
  toolCallId: string;
  approve: boolean;
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

/** GET /api/agent/history?conversationId= */
export interface HistoryResponse {
  conversationId: string;
  messages: { id: string; role: 'user' | 'assistant'; text: string; cards?: Card[] }[];
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
}
