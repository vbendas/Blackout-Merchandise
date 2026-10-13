import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { COLLECTION_NAME_MAX, deleteCollection, renameCollection } from '@/lib/services/studio-sessions';

export const runtime = 'nodejs';

const bodySchema = z.object({ name: z.string().trim().min(1).max(COLLECTION_NAME_MAX) });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await renameCollection(store.id, id, parsed.data.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.value);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });

  const result = await deleteCollection(store.id, id);
  if (!result.ok) {
    const status = result.error === 'Drop not found.' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
