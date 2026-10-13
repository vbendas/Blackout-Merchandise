import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ConfirmOutcome } from '@/lib/agent/protocol';

export type ToolInvocationRow = typeof schema.toolInvocations.$inferSelect;
export type ToolInvocationStatus = 'ok' | 'error' | 'pending_confirm' | 'cancelled';

export interface RecordInvocationInput {
  conversationId: string;
  messageId?: string | null;
  toolName: string;
  input: unknown;
  idempotencyKey: string;
  status: ToolInvocationStatus;
  /** Set these when the tool already ran (non-confirm tools finish in one insert). */
  output?: unknown;
  durationMs?: number;
  error?: string | null;
}

export async function recordInvocation(input: RecordInvocationInput): Promise<ToolInvocationRow> {
  const [row] = await db
    .insert(schema.toolInvocations)
    .values({
      conversationId: input.conversationId,
      messageId: input.messageId ?? null,
      toolName: input.toolName,
      input: input.input as object,
      status: input.status,
      idempotencyKey: input.idempotencyKey,
      output: input.output === undefined ? null : (input.output as object),
      durationMs: input.durationMs ?? null,
      error: input.error ?? null,
    })
    .returning();
  return row;
}

export interface CompleteInvocationPatch {
  status: ToolInvocationStatus;
  output?: unknown;
  durationMs?: number;
  error?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: Date | null;
}

export async function completeInvocationByIdempotencyKey(
  idempotencyKey: string,
  patch: CompleteInvocationPatch,
): Promise<ToolInvocationRow | null> {
  const setValues: Partial<typeof schema.toolInvocations.$inferInsert> = { status: patch.status };
  if (patch.output !== undefined) setValues.output = patch.output as object;
  if (patch.durationMs !== undefined) setValues.durationMs = patch.durationMs;
  if (patch.error !== undefined) setValues.error = patch.error;
  if (patch.confirmedBy !== undefined) setValues.confirmedBy = patch.confirmedBy;
  if (patch.confirmedAt !== undefined) setValues.confirmedAt = patch.confirmedAt;

  const [row] = await db
    .update(schema.toolInvocations)
    .set(setValues)
    .where(eq(schema.toolInvocations.idempotencyKey, idempotencyKey))
    .returning();
  return row ?? null;
}

export async function findByIdempotencyKey(idempotencyKey: string): Promise<ToolInvocationRow | null> {
  const rows = await db
    .select()
    .from(schema.toolInvocations)
    .where(eq(schema.toolInvocations.idempotencyKey, idempotencyKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByIdempotencyKeys(idempotencyKeys: string[]): Promise<ToolInvocationRow[]> {
  if (idempotencyKeys.length === 0) return [];
  return db.select().from(schema.toolInvocations).where(inArray(schema.toolInvocations.idempotencyKey, idempotencyKeys));
}

export async function findByMessageId(messageId: string): Promise<ToolInvocationRow[]> {
  return db.select().from(schema.toolInvocations).where(eq(schema.toolInvocations.messageId, messageId));
}

/** A confirm-gated call in this conversation that is still waiting for the
 * artist: not yet decided, and not already claimed by an approval. */
function waitingCall(idempotencyKey: string, conversationId: string) {
  return and(
    eq(schema.toolInvocations.idempotencyKey, idempotencyKey),
    eq(schema.toolInvocations.conversationId, conversationId),
    eq(schema.toolInvocations.status, 'pending_confirm'),
    isNull(schema.toolInvocations.confirmedAt),
  );
}

/** Claims a waiting call for the artist's approval. One update guarded on the
 * call still waiting, so two clicks (two tabs, a reload mid-run) can never
 * run the tool twice: only the first claim gets the row back. The status
 * stays pending_confirm until the tool has run; confirmedAt marks the claim. */
export async function claimPendingInvocation(
  idempotencyKey: string,
  conversationId: string,
  confirmedBy: string,
): Promise<ToolInvocationRow | null> {
  const [row] = await db
    .update(schema.toolInvocations)
    .set({ confirmedBy, confirmedAt: new Date() })
    .where(waitingCall(idempotencyKey, conversationId))
    .returning();
  return row ?? null;
}

/** Declines a waiting call (the artist's Cancel, or a new message that moved
 * past it). Never touches a call an approval has already claimed. */
export async function declinePendingInvocation(
  idempotencyKey: string,
  conversationId: string,
  patch: { output: unknown; confirmedBy?: string | null },
): Promise<ToolInvocationRow | null> {
  const [row] = await db
    .update(schema.toolInvocations)
    .set({
      status: 'cancelled',
      output: patch.output as object,
      confirmedBy: patch.confirmedBy ?? null,
      confirmedAt: patch.confirmedBy ? new Date() : null,
    })
    .where(waitingCall(idempotencyKey, conversationId))
    .returning();
  return row ?? null;
}

/** What became of a confirm-gated call, or null while it still waits for the
 * artist (a claimed call whose tool is still running reads as approved). */
export function confirmOutcomeOf(row: Pick<ToolInvocationRow, 'status' | 'confirmedAt'>): ConfirmOutcome | null {
  switch (row.status) {
    case 'ok':
      return 'done';
    case 'error':
      return 'failed';
    case 'cancelled':
      return 'declined';
    case 'pending_confirm':
      return row.confirmedAt ? 'approved' : null;
    default:
      return null;
  }
}
