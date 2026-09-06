import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

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

export async function findByMessageId(messageId: string): Promise<ToolInvocationRow[]> {
  return db.select().from(schema.toolInvocations).where(eq(schema.toolInvocations.messageId, messageId));
}
