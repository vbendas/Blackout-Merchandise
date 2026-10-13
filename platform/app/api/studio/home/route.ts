import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getStudioHome } from '@/lib/services/studio-home';

export const runtime = 'nodejs';

/** What the Studio home and the sidebar's Shop block show: the shop, this
 * month's sales, what needs the artist and the live run. */
export async function GET() {
  const { store } = await requireUser();
  return NextResponse.json(await getStudioHome(store));
}
