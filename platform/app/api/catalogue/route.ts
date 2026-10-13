import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getCatalogueIndex } from './catalogue-data';
import { catalogueCacheControl } from './cache-control';

export const runtime = 'nodejs';

/** Every blank in the catalogue with its category counts: what the Studio's
 * catalogue panel filters, sorts and pages through on the client. */
export async function GET() {
  await requireUser();
  const { index, complete } = await getCatalogueIndex();
  return NextResponse.json(index, { headers: { 'Cache-Control': catalogueCacheControl(complete) } });
}
