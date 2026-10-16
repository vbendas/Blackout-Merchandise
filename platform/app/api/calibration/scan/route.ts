import type { NextRequest } from 'next/server';
import { calibrationDeps } from '../deps';
import { handleScan } from '../handlers';

// POST { key, lpi, angleDeg } reads the chart in the scan that was put on a signed URL and answers the points
// of each film's wedge, with the reader's warnings (Pre-press "Manage" access). The scan is removed from storage
// afterwards. What is checked, and why, is in ../handlers.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  return handleScan(req, calibrationDeps());
}
