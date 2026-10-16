import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { getScreenPriceTableState } from '@/lib/services/pricing-admin';
import { formatStamp } from '@/components/admin/prepress/format';
import { ScreenPriceEditor } from '@/components/admin/pricing/ScreenPriceEditor';
// AdminPageHeader's name line is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';
import '@/components/admin/pricing/pricing.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pricing' };

/** What a screen-printed run costs (Plan section 10): a price table by screen count and
 * quantity, the fixed surcharge for screens above 8, and the settings around them. Quotes read
 * the table as saved. Catalogue and pricing "View" reads it; "Manage" changes it. */
export default async function PricingPage() {
  const { actor } = await requireStaffPage('catalogue', 'view', { page: '/admin/pricing' });

  const state = await getScreenPriceTableState();
  const canManage = can(actor, 'catalogue', 'manage');

  return (
    <>
      <AdminPageHeader title="Pricing" meta="Screen print" />
      <div className="pp-page">
        <div className="pp pp-stack prc">
          <p className="pp-lede">
            What a screen-printed run costs. The price follows the number of screens the design really uses, the white underbase and the highlight white included, which comes from the design&apos;s print
            files, not from the print method the artist picked. Shop products always print DTG/DTF and are priced as they are today.
          </p>
          <ScreenPriceEditor
            initial={state.table}
            placeholder={state.placeholder}
            updatedLabel={state.updatedAt ? formatStamp(state.updatedAt) : null}
            canManage={canManage}
          />
        </div>
      </div>
    </>
  );
}
