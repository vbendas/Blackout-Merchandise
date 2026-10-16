import type { NextRequest } from 'next/server';
import { calibrationDeps } from '../deps';
import { handleScanUrl } from '../handlers';

// POST { filename, size } asks for a signed URL to put a scan of the printed chart on (Pre-press "Manage"
// access). The scan itself never comes through here: the browser sends it straight to print storage, then calls
// ../scan. What is checked, and why, is in ../handlers.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return handleScanUrl(req, calibrationDeps());
}
