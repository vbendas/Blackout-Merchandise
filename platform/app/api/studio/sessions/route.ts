import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listSidebar } from '@/lib/services/studio-sessions';

export const runtime = 'nodejs';

export async function GET() {
  const { user, store } = await requireUser();
  return NextResponse.json(await listSidebar(user.id, store?.id ?? null));
}
