import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { getPackDetail } from '@/lib/services/prepress';
import { PackView } from '@/components/admin/prepress/PackView';
import { isPackId, uploadMaxBytes } from '@/components/admin/prepress/rules';
// AdminPageHeader's run line is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pre-press pack' };

/** One production pack (Plan sections 6 and 8): its films in press order, the proof
 * drawn from them, the inks with their Pantone codes, what the engine chose, the
 * automatic checks, and the auditor's actions. Everyone with Pre-press "View" sees
 * it; the actions need "Work". The tabs are the design's other production files,
 * each a pack of its own. */
export default async function PackPage({ params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const { actor } = await requireStaffPage('prepress', 'view', {
    page: '/admin/prepress/[packId]',
    itemType: 'production_pack',
    itemId: isPackId(packId) ? packId : undefined,
  });
  if (!isPackId(packId)) notFound();

  const detail = await getPackDetail(actor, packId);
  if (!detail) notFound();

  // The view says what the service allows; the actor decides too, so a stale or sample view never draws a button they can't use.
  const canWork = detail.canWork && can(actor, 'prepress', 'work');

  return <PackView detail={detail} canWork={canWork} maxUploadBytes={uploadMaxBytes(process.env)} now={new Date()} />;
}
