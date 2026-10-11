import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { renameSession, setSessionCollection, SESSION_TITLE_MAX } from '@/lib/services/studio-sessions';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    title: z.string().trim().min(1).max(SESSION_TITLE_MAX).optional(),
    collectionId: z.string().uuid().nullable().optional(),
  })
  .refine((b) => b.title !== undefined || b.collectionId !== undefined, { message: 'Nothing to update.' });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, store } = await requireUser();

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
