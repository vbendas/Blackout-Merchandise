import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { createCollection } from '@/lib/services/collections';
import { COLLECTION_NAME_MAX, listSidebar } from '@/lib/services/studio-sessions';
import type { StudioCollection } from '@/lib/studio/types';

export const runtime = 'nodejs';

const bodySchema = z.object({ name: z.string().trim().min(1).max(COLLECTION_NAME_MAX) });

export async function GET() {
  const { user, store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });
  const { collections } = await listSidebar(user.id, store.id);
  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const { store } = await requireUser();
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await createCollection(store.id, parsed.data.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const out: StudioCollection = { id: result.value.id, name: result.value.name, productCount: 0 };
  return NextResponse.json(out);
}
