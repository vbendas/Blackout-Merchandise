import { SHARD_A } from './details/shard-a';
import { SHARD_B } from './details/shard-b';
import { SHARD_C } from './details/shard-c';

// Structured facts per supplier style code, extracted from the
// supplier's product sheets (facts only — descriptions are our own).
// Filled by the data-extraction shards; a missing code simply renders
// a leaner modal.
export interface ProductDetails {
  /** Supplier's commercial style name, e.g. 'Creator 2.0' */
  name: string;
  /** One-line description in Blackout Merchandise's own words */
  description: string;
  /** e.g. '100% organic ring-spun cotton' */
  composition: string;
  /** Fabric weight in g/m²; 0 when unknown */
  weightGsm: number;
  /** e.g. 'Regular fit' */
  fit: string;
  /** e.g. ['XS', 'S', 'M', 'L', 'XL', '2XL'] */
  sizes: string[];
  /** e.g. ['GOTS', 'OEKO-TEX'] */
  certifications: string[];
}

export const PRODUCT_DETAILS: Record<string, ProductDetails> = {
  ...SHARD_A,
  ...SHARD_B,
  ...SHARD_C,
};

// Blackout Merchandise's own print offering, mapped by garment family (the letter
// after the ST prefix). Curate per product later if needed. DTF is offered on
// every garment, so a shop product can always print DTF; DTG only where it was
// already offered (owner's decision; Print-Prep-Plan section 1).
const TECHNIQUES: Record<string, string[]> = {
  T: ['Screen print', 'DTG', 'DTF'],
  S: ['Screen print', 'DTG', 'DTF', 'Embroidery'],
  J: ['Embroidery', 'Heat transfer', 'DTF'],
  P: ['Embroidery', 'DTG', 'DTF'],
  A: ['Screen print', 'Embroidery', 'DTF'],
  B: ['Screen print', 'Embroidery', 'DTF'],
  W: ['Embroidery', 'DTF'],
  K: ['Screen print', 'DTG', 'DTF'],
};

const DEFAULT_TECHNIQUES = ['Screen print', 'DTG', 'DTF'];

export function printTechniquesFor(code: string): string[] {
  return TECHNIQUES[code.slice(2, 3)] ?? DEFAULT_TECHNIQUES;
}

// Print technique (catalog wording) -> the print_services this platform
// actually offers. 'Heat transfer' has no matching print service in the
// seeded catalog (screen print, DTG, DTF and embroidery only), so it is
// dropped. The seed (scripts/seed.ts) reads this table, and so do the tests.
export const PRINT_SERVICES_FOR_TECHNIQUE: Record<string, string[]> = {
  'Screen print': ['screen_1c', 'screen_2c', 'screen_3c'],
  DTG: ['dtg'],
  DTF: ['dtf'],
  Embroidery: ['embroidery'],
};

/** The print_services codes a blank is offered with, by its style code. */
export function printServiceCodesFor(code: string): string[] {
  const services = new Set<string>();
  for (const technique of printTechniquesFor(code)) {
    for (const service of PRINT_SERVICES_FOR_TECHNIQUE[technique] ?? []) services.add(service);
  }
  return [...services];
}

/**
 * print_services.available_in_shop for the services the print-prep plan
 * decides: shop products print DTG/DTF only, screen print is for runs
 * (Print-Prep-Plan section 1). Embroidery is outside that plan, so it is
 * deliberately absent: the seed leaves whatever it has.
 */
export const SHOP_PRINT_SERVICE_FLAGS: Record<string, boolean> = {
  screen_1c: false,
  screen_2c: false,
  screen_3c: false,
  dtg: true,
  dtf: true,
};
