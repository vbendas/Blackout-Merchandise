import type { NextRequest } from 'next/server';
import { jobSheetDeps } from './deps';
import { handleJobSheetRequest } from './handler';

// GET answers the job sheet of one design as a PDF (Pre-press or Production "View" access). One
// sheet per design, covering every garment that uses it; it is made when it is asked for and
// kept by the hash of what it says (lib/services/job-sheets.ts). The rules are in ./handler.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ designId: string }> }) {
  const { designId } = await ctx.params;
  return handleJobSheetRequest(req, designId, jobSheetDeps());
}
