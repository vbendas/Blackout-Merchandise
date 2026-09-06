import type { z } from 'zod';
import type { ToolUi } from '@/lib/ui-cards/schemas';

export type Role = 'artist' | 'admin';

/** Everything a tool may need about the caller; built once per request. */
export interface ToolContext {
  userId: string;
  clerkId: string;
  role: Role;
  storeId: string | null;
  conversationId: string;
  /** idempotency key derived from the tool_use id; write tools must honour it */
  idempotencyKey: string;
  locale: string;
}

export interface ToolResult<T = unknown> {
  /** data returned to the model (kept small; large payloads go in cards) */
  data: T;
  /** cards / chips / project-card update for the client */
  ui?: ToolUi;
}

export interface Tool<I = unknown, O = unknown> {
  name: string;
  /** model-facing description: what it does, when to use it, what it returns */
  description: string;
  input: z.ZodType<I>;
  scope: Role | 'both';
  /** pure read; safe to call freely and in parallel */
  readOnly?: boolean;
  /** never executes on the model's say-so — returns a confirm card and waits for a human click */
  confirm?: boolean;
  /** one-line human summary of a pending confirm-gated call, shown on the confirm card */
  summarize?: (input: I) => string;
  run: (ctx: ToolContext, input: I) => Promise<ToolResult<O>>;
}

export function defineTool<I, O>(tool: Tool<I, O>): Tool<I, O> {
  return tool;
}
