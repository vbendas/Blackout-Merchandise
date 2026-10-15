import type { z } from 'zod';
import type { ToolUi } from '@/lib/ui-cards/schemas';
import type { Area, Level, PermissionMap, Role } from '@/lib/auth/permissions';

export type { Role } from '@/lib/auth/permissions';

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
  /** staff only: access by area (lib/auth/permissions.ts). Absent for artists
   * and the owner; `can()` treats the owner as allowed everywhere. A staff
   * caller without it has no staff access at all. */
  permissions?: PermissionMap | null;
  /** staff only: a suspended account has no access */
  suspended?: boolean;
}

export interface ToolResult<T = unknown> {
  /** data returned to the model (kept small; large payloads go in cards) */
  data: T;
  /** cards / chips / project-card update for the client */
  ui?: ToolUi;
}

/** Staff tools declare the area and level they need; the registry only hands
 * a caller the tools `can()` allows, and the loop re-checks before running. */
export interface ToolAccess {
  area: Area;
  level: Exclude<Level, 'none'>;
}

interface ToolBase<I, O> {
  name: string;
  /** model-facing description: what it does, when to use it, what it returns */
  description: string;
  input: z.ZodType<I>;
  /** pure read; safe to call freely and in parallel */
  readOnly?: boolean;
  /** never executes on the model's say-so — returns a confirm card and waits for a human click */
  confirm?: boolean;
  /** conditional gate: confirm only for some inputs (e.g. advancing an order to 'shipped') */
  confirmWhen?: (input: I) => boolean;
  /** one-line human summary of a pending confirm-gated call, shown on the confirm card */
  summarize?: (input: I) => string;
  /** A look before a confirm card is shown, for a step that would be refused whatever the artist says (a product
   * whose artwork isn't approved, say). A result is the step's outcome, and nothing waits for a click. `run`
   * still decides when the step is confirmed: this only reads, and never writes. */
  preflight?: (ctx: ToolContext, input: I) => Promise<ToolResult<O> | null>;
  run: (ctx: ToolContext, input: I) => Promise<ToolResult<O>>;
}

/** Who a tool is for. 'artist' tools go to artists, 'both' to everyone signed
 * in, and 'staff' tools to the owner and the employees whose access reaches
 * `access` (lib/tools/registry.ts). A staff tool can't be declared without an
 * area and level: that is a type error, and lib/tools/registry.test.ts fails
 * on one that slips through as data. */
export type ToolScope =
  | { scope: 'artist' | 'both'; access?: undefined }
  | { scope: 'staff'; access: ToolAccess };

export type Tool<I = unknown, O = unknown> = ToolBase<I, O> & ToolScope;

export function defineTool<I, O>(tool: Tool<I, O>): Tool<I, O> {
  return tool;
}
