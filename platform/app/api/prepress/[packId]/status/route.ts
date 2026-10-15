import type { NextRequest } from 'next/server';
import { statusDeps } from '../deps';
import { handlePackStatus } from '../pack-status';

// GET answers { buildStatus, replaced } for a pack (Pre-press "View" access), so
// the pack page can wait for a build or a run again without drawing itself over
// and over. What is checked is in ../pack-status.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ packId: string }> }) {
  const { packId } = await ctx.params;
  return handlePackStatus(packId, statusDeps());
}
