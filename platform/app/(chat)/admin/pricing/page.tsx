import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireStaffPage } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { getPodPriceTableState, getScreenPriceTableState, listPodGarments } from '@/lib/services/pricing-admin';
import { formatStamp } from '@/components/admin/prepress/format';
import { TabNav } from '@/components/admin/prepress/TabNav';
import { PRICING_TABS, parsePricingTab, pricingHref } from '@/components/admin/pricing/pricing-tabs';
import { ScreenPriceEditor } from '@/components/admin/pricing/ScreenPriceEditor';
import { ShopPriceEditor } from '@/components/admin/pricing/ShopPriceEditor';
// AdminPageHeader's name line is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';
import '@/components/admin/pricing/pricing.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pricing' };

/** What things cost (Plan sections 1 and 10), in two tabs:
 * - Runs (screen print): a price table by screen count and quantity, the fixed surcharge for screens above 8, and the settings
 *   around them. Quotes read the table as saved.
 * - Shop products (DTG/DTF): a base price for each garment, which covers one print area up to A2 on the front or the back, and the
 *   extras for more print areas. A shop product is priced from it when it is created or its print areas change.
 * Catalogue and pricing "View" reads them; "Manage" changes them. The tab lives in the address (?tab=shop). */
export default async function PricingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const params = (await searchParams) ?? {};
  const { actor } = await requireStaffPage('catalogue', 'view', { page: '/admin/pricing' });
  const tab = parsePricingTab(params.tab);
  const canManage = can(actor, 'catalogue', 'manage');

  const tabs = (
    <TabNav label="Pricing" items={PRICING_TABS.map((entry) => ({ href: pricingHref(entry.id), label: entry.label, current: entry.id === tab }))} />
  );

  if (tab === 'shop') {
    const [garments, state] = await Promise.all([listPodGarments(actor), getPodPriceTableState()]);
    return (
      <>
        <AdminPageHeader title="Pricing" />
        <div className="pp-page">
          {tabs}
          <div className="pp pp-stack prc">
            <p className="pp-lede">
              What a shop product costs the artist: the garment with its print, printed DTG or DTF to order. Every garment has its own base price, which covers one print area up to A2 on the front or the back. A
              second main print and sleeve prints add the extras below. The screen-print surcharge never applies to shop products.
            </p>
            <ShopPriceEditor garments={garments} extras={state.table.extras} updatedLabel={state.updatedAt ? formatStamp(state.updatedAt) : null} canManage={canManage} />
          </div>
        </div>
      </>
    );
  }

  const state = await getScreenPriceTableState();
  return (
    <>
      <AdminPageHeader title="Pricing" />
      <div className="pp-page">
        {tabs}
        <div className="pp pp-stack prc">
          <p className="pp-lede">
            What a screen-printed run costs. The price follows the number of screens the design really uses, the white underbase and the highlight white included, which comes from the design&apos;s print
            files, not from the print method the artist picked. Shop products always print DTG/DTF and have their own prices, on the Shop products tab.
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
