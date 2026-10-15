// Test-only: a small catalogue on PGlite for the channel tests (products, runs,
// mockup tools). The print service flags and which blank offers which service
// come from lib/catalog/product-details.ts, the tables the real seed reads, so
// the tests exercise the rules as seeded. Never imported by app code.
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from '@db/schema';
import { SHOP_PRINT_SERVICE_FLAGS, printServiceCodesFor } from '@/lib/catalog/product-details';

type TestDatabase = PgliteDatabase<typeof schema>;

const SERVICE_NAMES: Record<string, string> = {
  screen_1c: 'Screen print (1 colour)',
  screen_2c: 'Screen print (2 colours)',
  screen_3c: 'Screen print (3 colours)',
  dtg: 'Direct-to-garment print',
  dtf: 'Direct-to-film print',
  embroidery: 'Embroidery',
};

// Placeholder print costs, as in scripts/seed.ts.
const PRINT_COST_CENTS: Record<string, number> = { screen_1c: 350, screen_2c: 520, screen_3c: 690, dtg: 600, dtf: 600, embroidery: 850 };

const BLANKS = [
  { code: 'STTU169', name: 'T-shirt', type: 'T-shirts' },
  { code: 'STSU177', name: 'Hoodie', type: 'Sweats & Hoodies' },
  { code: 'STBU070', name: 'Shorts', type: 'Bottoms' },
  { code: 'STJM158', name: 'Softshell', type: 'Jackets' },
  { code: 'STAU771', name: 'Beanie', type: 'Bags & Accessories' },
];

export const TEST_CATALOGUE = {
  tee: 'STTU169',
  hoodie: 'STSU177',
  shorts: 'STBU070',
  jacket: 'STJM158',
  beanie: 'STAU771',
  white: 'C001',
  black: 'C002',
  sizes: ['S', 'M', 'L'],
} as const;

export async function seedTestCatalogue(db: TestDatabase): Promise<typeof TEST_CATALOGUE> {
  await db.insert(schema.colours).values([
    { code: TEST_CATALOGUE.white, name: 'White', hex: '#FFFFFF', isLight: true },
    { code: TEST_CATALOGUE.black, name: 'Black', hex: '#000000', isLight: false },
  ]);

  // A service with no flag in SHOP_PRINT_SERVICE_FLAGS (embroidery) gets the column default, as in the seed.
  await db.insert(schema.printServices).values(
    Object.entries(SERVICE_NAMES).map(([code, name]) => ({
      code,
      name,
      ...(code in SHOP_PRINT_SERVICE_FLAGS ? { availableInShop: SHOP_PRINT_SERVICE_FLAGS[code] } : {}),
    })),
  );

  await db.insert(schema.blanks).values(BLANKS);
  for (const blank of BLANKS) {
    await db.insert(schema.blankColours).values([
      { blankCode: blank.code, colourCode: TEST_CATALOGUE.white },
      { blankCode: blank.code, colourCode: TEST_CATALOGUE.black },
    ]);
    await db.insert(schema.blankSizes).values(TEST_CATALOGUE.sizes.map((size) => ({ blankCode: blank.code, size })));

    const services = printServiceCodesFor(blank.code);
    await db.insert(schema.blankPrintServices).values(services.map((printServiceCode) => ({ blankCode: blank.code, printServiceCode })));
    await db.insert(schema.baseCosts).values(
      services.flatMap((printServiceCode) =>
        [
          { qtyFrom: 1, printCostCents: PRINT_COST_CENTS[printServiceCode] },
          { qtyFrom: 25, printCostCents: Math.round(PRINT_COST_CENTS[printServiceCode] * 0.92) },
        ].map(({ qtyFrom, printCostCents }) => ({
          blankCode: blank.code,
          printServiceCode,
          qtyFrom,
          garmentCostCents: 650,
          printCostCents,
          marginCents: Math.round(0.3 * (650 + printCostCents)),
        })),
      ),
    );
  }

  await db.insert(schema.shippingZones).values({ name: 'Spain', countries: ['ES'], flatCents: 450 });
  return TEST_CATALOGUE;
}
