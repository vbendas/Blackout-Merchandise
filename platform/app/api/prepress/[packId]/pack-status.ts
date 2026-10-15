// A pack's build state, for the page to poll: one small answer instead of asking
// the server to draw the whole page again every few seconds (each page view by an
// employee goes in the staff activity log, so polling the page itself would fill
// it). The page refreshes itself once, when this answer changes.
import type { Actor } from '@/lib/auth/permissions';
import type { PackTab } from '@/lib/services/prepress';
import { isReplaced } from '@/components/admin/prepress/format';
import { authorise, ok, refuse } from './guard';

export interface StatusDeps {
  getActor: () => Promise<Actor | null>;
  /** the pack's view, or null when there is no such pack */
  getPackDetail: (actor: Actor, packId: string) => Promise<{ buildStatus: string; tabs: PackTab[] } | null>;
}

export async function handlePackStatus(packId: string, deps: StatusDeps): Promise<Response> {
  const actor = await authorise(packId, deps.getActor, 'view');
  if (actor instanceof Response) return actor;

  let detail: Awaited<ReturnType<StatusDeps['getPackDetail']>>;
  try {
    detail = await deps.getPackDetail(actor, packId);
  } catch (err) {
    console.error('[prepress status] could not read the pack:', err instanceof Error ? err.message : err);
    return refuse('failed');
  }
  if (!detail) return refuse('not_found');
  return ok({ buildStatus: detail.buildStatus, replaced: isReplaced(detail) });
}
