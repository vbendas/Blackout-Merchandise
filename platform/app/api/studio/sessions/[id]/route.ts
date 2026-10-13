import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { deleteSession, renameSession, setSessionCollection, SESSION_TITLE_MAX } from '@/lib/services/studio-sessions';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    title: z.string().trim().min(1).max(SESSION_TITLE_MAX).optional(),
    collectionId: z.string().uuid().nullable().optional(),
  })
  .refine((b) => b.title !== undefined || b.collectionId !== undefined, { message: 'Nothing to update.' });

// A malformed id is no session: it gets the same 404 as an unknown one, not a database error.
const sessionIdSchema = z.uuid();

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, store } = await requireUser();
  if (!sessionIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { title, collectionId } = parsed.data;

  let result = null;
  if (title !== undefined) {
    result = await renameSession(user.id, id, title);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (collectionId !== undefined) {
    result = await setSessionCollection(user.id, store?.id ?? null, id, collectionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result!.value);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user } = await requireUser();
  if (!sessionIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const result = await deleteSession(user.id, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
