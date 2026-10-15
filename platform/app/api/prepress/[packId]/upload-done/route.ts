import type { NextRequest } from 'next/server';
import { uploadDeps } from '../deps';
import { handleUploadDone } from '../upload-handlers';

// POST { key } says the corrected PSD is in storage (Pre-press "Work" access). The
// stored file is checked, then the service rebuilds the pack's films, proof and job
// sheet from it inside this request, so it gets the longest run the platform allows.
// What is checked, and why, is in ../upload-handlers.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest, ctx: { params: Promise<{ packId: string }> }) {
  const { packId } = await ctx.params;
  return handleUploadDone(req, packId, uploadDeps());
}
