// Shop-product pricing (print on demand, DTG/DTF). Owner decision, 16 Oct
// 2026: each garment has its own base price, which includes one print area
// up to A2 on the front or the back; extras are added for more print areas.
// For example a T-shirt at €17, +€1 when the print becomes front and back,
// +€2 once for sleeve prints (one or both sleeves).
//
// The contract PL-A calls when a shop product is created or its print areas
// change. The prices are the shop price table the owner edits at /admin/pricing
// (Shop products tab): a base price for each garment, and the two extras. Until
// a garment's price is saved it is a placeholder (today's one-print DTG base
// cost), and the breakdown says so.
//
// The types, placementKind() and DEFAULT_POD_EXTRAS live in pod-table.ts, which
// has no server imports so the admin editor can share them; they are re-exported
// here, so `import { ... } from '@/lib/pricing/pod'` keeps working. This file is
// server-only: podPrice() reads the database through lib/services/pricing-admin.ts.
import { resolvePodBase } from '@/lib/services/pricing-admin';
import { buildPodBreakdown, type PodPlacementInput, type PodPriceBreakdown } from '@/lib/pricing/pod-table';

export { DEFAULT_POD_EXTRAS, placementKind } from '@/lib/pricing/pod-table';
export type { PlacementKind, PodPlacementInput, PodPriceBreakdown, PodPriceLine } from '@/lib/pricing/pod-table';

/**
 * What a shop product costs the artist with these print areas, for one piece:
 * - the garment's base price (one print area up to A2, front or back);
 * - "Front and back" when the product has a front area and a back area;
 * - "Sleeve prints", once, when it has any sleeve area.
 * `printServiceCode` is the method to price: left out, it is the garment's own (DTG, or DTF where DTG isn't ideal: a garment with no
 * DTG, or one the owner marked), which is what a shop product of it prints with. dtg and dtf price that method as asked (a garment
 * is priced DTF with its DTF price when the owner set one, else with its base price: the same as DTG). Print size does not change
 * the price. `placeholder` is true while the garment's price is still unset.
 *
 * Null when the blank isn't in the catalogue or has no price at all. A print method that isn't DTG or DTF (embroidery, which
 * print prep leaves as it was) is priced at the blank's own base cost for it, as a placeholder, with no extras.
 */
export async function podPrice(blankCode: string, placements: PodPlacementInput[], printServiceCode?: string): Promise<PodPriceBreakdown | null> {
  const base = await resolvePodBase(blankCode, printServiceCode);
  if (!base) return null;
  return buildPodBreakdown({
    blankCode,
    baseCents: base.baseCents,
    placeholder: base.placeholder,
    ...(base.extras ? { extras: base.extras } : {}),
    // a method outside the shop table adds nothing for more print areas
    placements: base.extras ? placements : [],
  });
}
