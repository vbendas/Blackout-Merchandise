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
  /** One-line description in MerchFrom's own words */
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

// MerchFrom's own print offering, mapped by garment family (the letter
// after the ST prefix). Curate per product later if needed.
const TECHNIQUES: Record<string, string[]> = {
  T: ['Screen print', 'DTG'],
  S: ['Screen print', 'DTG', 'Embroidery'],
  J: ['Embroidery', 'Heat transfer'],
  P: ['Embroidery', 'DTG'],
  A: ['Screen print', 'Embroidery'],
  B: ['Screen print', 'Embroidery'],
  W: ['Embroidery'],
  K: ['Screen print', 'DTG'],
};

export function printTechniquesFor(code: string): string[] {
  return TECHNIQUES[code.slice(2, 3)] ?? ['Screen print', 'DTG'];
}
