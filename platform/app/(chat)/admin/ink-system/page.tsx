import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { getActiveInkSystem } from '@/lib/services/ink-system';
import { formatStamp } from '@/components/admin/prepress/format';
import { InkSystemForm } from '@/components/admin/ink-system/InkSystemForm';
// AdminPageHeader's name line is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';
import '@/components/admin/ink-system/ink-system.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ink system' };

/** The shop's ink system profile (Plan section 5): bases, underbase and flash,
 * highlight white, mesh, cure, press. Packs and job sheets are made from it.
 * Pre-press "View" reads it; "Manage" changes it. */
export default async function InkSystemPage() {
  const { actor } = await requireStaffPage('prepress', 'view', { page: '/admin/ink-system' });

  const active = await getActiveInkSystem();
  const canManage = can(actor, 'prepress', 'manage');

  return (
    <>
      <AdminPageHeader title="Ink system" meta={active.profile.name} />
      <div className="pp-page">
        <div className="pp pp-stack isy">
          <p className="pp-lede">The inks and press settings the pre-press packs, proofs and job sheets are made from.</p>
          <InkSystemForm profile={active.profile} canManage={canManage} updatedLabel={active.updatedAt ? formatStamp(active.updatedAt) : null} />
        </div>
      </div>
    </>
  );
}
