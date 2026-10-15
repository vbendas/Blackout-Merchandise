import type { NextRequest } from 'next/server';
import { uploadDeps } from '../deps';
import { handleUploadUrl } from '../upload-handlers';

// POST { filename, size } asks for a signed URL to put a corrected screen PSD on
// (Pre-press "Work" access). The file itself never comes through here: the browser
// sends it straight to print storage, then calls ../upload-done. What is checked,
// and why, is in ../upload-handlers.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ packId: string }> }) {
  const { packId } = await ctx.params;
  return handleUploadUrl(req, packId, uploadDeps());
}
