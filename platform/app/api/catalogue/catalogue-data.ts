import { unstable_cache } from 'next/cache';
import { loadShopFromPrices } from '@/lib/services/pricing-admin';
import {
  buildCatalogueDetail,
  buildCatalogueIndex,
  type CatalogueDetail,
  type CatalogueIndex,
  type CataloguePrices,
} from '@/lib/catalog/catalogue-index';

// The catalogue feed (/api/catalogue) is static files plus one live input:
// each blank's "from" price. Cache Components is not enabled in next.config.ts,
// so unstable_cache is the way to keep the price query across requests (see
// lib/storefront/read-model.ts, which does the same). Only the prices are
// cached, a few KB of JSON; the index around them is built in microseconds
// from files already in memory (lib/catalog/catalogue-index.ts).

/** Bump when the shape or the meaning of the cached prices changes. v3: the shop price of a garment, no longer the cheapest
 * one-piece base cost of any service. */
const SHAPE = 'v3';
const PRICES_REVALIDATE_SECONDS = 3600;

/** What a shop product of each blank costs with one print area: its price in the shop price table, or the placeholder it stands
 * on until the owner sets one (loadShopFromPrices in lib/services/pricing-admin.ts, the same figure list_blanks and get_blank
 * show as "from"), for every blank in a few queries. Saving a shop price or a base cost refreshes it (tag 'catalogue'). */
const readPrices = unstable_cache(
  async (): Promise<Record<string, number>> => Object.fromEntries(await loadShopFromPrices()),
  ['catalogue-prices', SHAPE],
  { revalidate: PRICES_REVALIDATE_SECONDS, tags: ['catalogue'] },
);

/** Prices are a nicety: when the query fails the catalogue still shows every
 * blank, without "from" prices, and asks again on the next request (a thrown
 * error is not cached). `complete` tells the route whether the answer may be
 * kept by the browser. */
async function loadPrices(): Promise<{ prices: CataloguePrices; complete: boolean }> {
  try {
    return { prices: await readPrices(), complete: true };
  } catch (error) {
    console.error('catalogue: base prices unavailable', error);
    return { prices: {}, complete: false };
  }
}

export async function getCatalogueIndex(): Promise<{ index: CatalogueIndex; complete: boolean }> {
  const { prices, complete } = await loadPrices();
  return { index: buildCatalogueIndex(prices), complete };
}

/** `detail` is null for a code the catalogue does not have (no price query then). */
export async function getCatalogueDetail(code: string): Promise<{ detail: CatalogueDetail | null; complete: boolean }> {
  const bare = buildCatalogueDetail(code);
  if (!bare) return { detail: null, complete: true };
  const { prices, complete } = await loadPrices();
  return { detail: { ...bare, fromPriceCents: prices[bare.code] ?? null }, complete };
}
