import { PRODUCT_DETAILS, printTechniquesFor } from './product-details';
import { PRODUCTS } from './products';
import { typeFor } from './catalog-filters';

// Every "verifiable" claim on the site (hero facts, the Cloth section,
// the catalog intro band, llms.txt) reads from here instead of a
// hardcoded number, so a claim can never drift from the catalog as
// products are added, removed or re-classified. Pure computation, no
// 'use client' — safe to import from server components and route
// handlers alike.

export function isHeavy(code: string): boolean {
  return (PRODUCT_DETAILS[code]?.weightGsm ?? 0) >= 220;
}

export function isGots(code: string): boolean {
  return PRODUCT_DETAILS[code]?.certifications.includes('GOTS') ?? false;
}

function isOeko(code: string): boolean {
  return PRODUCT_DETAILS[code]?.certifications.includes('OEKO-TEX') ?? false;
}

let total = 0;
let gots = 0;
let oeko = 0;
let heavy = 0;
let heaviestGsm = 0;
let heaviestTeeGsm = 0;
let lightestTeeGsm = Infinity;
const techniques = new Set<string>();

for (const product of PRODUCTS) {
  total += 1;
  if (isGots(product.code)) gots += 1;
  if (isOeko(product.code)) oeko += 1;
  if (isHeavy(product.code)) heavy += 1;

  // 0 means "unknown weight" in the extracted data, not a real gsm —
  // never let it win a minimum, and it can't win a maximum either way.
  const gsm = PRODUCT_DETAILS[product.code]?.weightGsm ?? 0;
  if (gsm > heaviestGsm) heaviestGsm = gsm;
  if (typeFor(product.code) === 'T-shirts' && gsm > 0) {
    if (gsm > heaviestTeeGsm) heaviestTeeGsm = gsm;
    if (gsm < lightestTeeGsm) lightestTeeGsm = gsm;
  }

  for (const technique of printTechniquesFor(product.code)) techniques.add(technique);
}

export const CATALOG_STATS = {
  total,
  gots,
  oeko,
  heavy,
  heaviestGsm,
  heaviestTeeGsm,
  lightestTeeGsm: Number.isFinite(lightestTeeGsm) ? lightestTeeGsm : 0,
  methods: techniques.size,
};
