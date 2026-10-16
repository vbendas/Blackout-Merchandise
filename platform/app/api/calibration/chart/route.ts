import type { NextRequest } from 'next/server';
import { calibrationDeps } from '../deps';
import { handleChart } from '../handlers';

// GET answers the dot-gain test chart: format=psd is the films (one layer each), format=pdf the one-page
// instructions with a table for typed readings. Pre-press "View" access: whoever prints the chart can have it.
// The screen comes from the query (lpi, angle, mesh, films) and defaults to the house screen. What the route
// checks is in ../handlers.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleChart(req, calibrationDeps());
}
