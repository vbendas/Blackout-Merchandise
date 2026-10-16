// The tabs of /admin/pricing: what a screen-printed run costs, and what a shop product (print on
// demand, DTG/DTF) costs. The tab lives in the address (?tab=shop), so a tab can be shared and
// Back works. No React and nothing server-only.

export type PricingTab = 'runs' | 'shop';

export const PRICING_TABS: { id: PricingTab; label: string }[] = [
  { id: 'runs', label: 'Runs (screen print)' },
  { id: 'shop', label: 'Shop products (DTG/DTF)' },
];

/** The tab an address asks for; anything else is the runs tab, which is the page's default. */
export function parsePricingTab(value: string | string[] | undefined): PricingTab {
  const first = Array.isArray(value) ? value[0] : value;
  return PRICING_TABS.find((tab) => tab.id === first)?.id ?? 'runs';
}

/** A tab's address; the default tab has no query. */
export function pricingHref(tab: PricingTab): string {
  return tab === 'runs' ? '/admin/pricing' : `/admin/pricing?tab=${tab}`;
}
