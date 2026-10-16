import { unstable_cache } from 'next/cache';
import { and, eq, min, notLike } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import {
  buildCatalogueDetail,
  buildCatalogueIndex,
  type CatalogueDetail,
  type CatalogueIndex,
  type CataloguePrices,
} from '@/lib/catalog/catalogue-index';

// The catalogue feed (/api/catalogue) is static files plus one live input:
// each blank's base price. Cache Components is not enabled in next.config.ts,
// so unstable_cache is the way to keep the price query across requests (see
// lib/storefront/read-model.ts, which does the same). Only the prices are
// cached, a few KB of JSON; the index around them is built in microseconds
// from files already in memory (lib/catalog/catalogue-index.ts).

/** Bump when the shape of the cached prices changes. */
const SHAPE = 'v2';
const PRICES_REVALIDATE_SECONDS = 3600;

/** Cheapest one-piece base cost per blank across every print service: the same
 * figure lib/services/blanks.ts shows as "from" (qty_from = 1, lowest total),
 * in one grouped query for all blanks instead of one per list. Screen print has
 * no base costs (runs are priced by their screens), so a row an old seed left
 * for it is not a price. */
const readPrices = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const rows = await db
      .select({ blankCode: schema.baseCosts.blankCode, cents: min(schema.baseCosts.totalCents) })
      .from(schema.baseCosts)
      .where(and(eq(schema.baseCosts.qtyFrom, 1), notLike(schema.baseCosts.printServiceCode, 'screen\_%')))
      .groupBy(schema.baseCosts.blankCode);
    const prices: Record<string, number> = {};
    for (const row of rows) {
      if (row.cents != null) prices[row.blankCode] = Number(row.cents);
    }
    return prices;
  },
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
