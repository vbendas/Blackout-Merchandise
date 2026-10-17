import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import type { StationKind } from '@/lib/services/production-progress';
import { parseStation, STATION_COOKIE } from '@/components/station/model';
import { QueueScreen } from '@/components/station/QueueScreen';
import { loadQueue } from './data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Queue' };

/** The station this iPad was set to last time (the cookie the picker writes), or null: none yet, or no request to read one from. */
async function rememberedStation(): Promise<StationKind | null> {
  try {
    return parseStation((await cookies()).get(STATION_COOKIE)?.value);
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

/** The queue at a production station: every job on the floor, for this iPad's station (screen print, DTG, DTF or all, remembered on the
 * device; ?s= sets it). Everyone with Production "View" sees it; counting and moving jobs on the next screens needs "Work". */
export default async function StationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireStaffPage('production', 'view', { page: '/station' });
  const params = await searchParams;
  const asked = parseStation(Array.isArray(params.s) ? params.s[0] : params.s);
  const station = asked ?? (await rememberedStation()) ?? 'all';
  const initial = await loadQueue(session);
  return <QueueScreen initial={initial} station={station} canWork={can(session.actor, 'production', 'work')} adminHref="/admin/production" />;
}
