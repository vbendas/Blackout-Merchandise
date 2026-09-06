import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import type { SuggestResponse } from '@/lib/agent/protocol';
import { loadGuidanceCounts, guidanceStateFor } from '@/lib/agent/guidance';
import { suggestFor } from '@/lib/agent/suggest';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse<SuggestResponse>> {
  const session = await requireUser();
  const q = req.nextUrl.searchParams.get('q') ?? '';

  const counts = await loadGuidanceCounts(session);
  const state = guidanceStateFor(session, counts);
  const suggestions = await suggestFor(q, { role: session.role, state });

  return NextResponse.json({ suggestions });
}
