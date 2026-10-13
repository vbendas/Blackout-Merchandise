import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getCatalogueDetail } from '../catalogue-data';
import { catalogueCacheControl } from '../cache-control';

export const runtime = 'nodejs';

/** One blank in full: description, sizes and size guide, print methods,
 * certifications and every colour with its photos. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  await requireUser();
  const { detail, complete } = await getCatalogueDetail(code);
  if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(detail, { headers: { 'Cache-Control': catalogueCacheControl(complete) } });
}
