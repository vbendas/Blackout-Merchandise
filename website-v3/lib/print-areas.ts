import { PRINT_SHARD_A } from './print-areas/shard-a';
import { PRINT_SHARD_B } from './print-areas/shard-b';
import { PRINT_SHARD_C } from './print-areas/shard-c';

// Printable / decoration areas per supplier style code, extracted from
// the supplier's product sheets where they state them. Every field is
// optional — the modal only renders what exists.
export interface PrintAreas {
  /** e.g. '30 × 40 cm' */
  front?: string;
  back?: string;
  sleeve?: string;
  /** anything else stated, e.g. 'Chest pocket 8 × 8 cm' */
  other?: string;
}

export const PRINT_AREAS: Record<string, PrintAreas> = {
  ...PRINT_SHARD_A,
  ...PRINT_SHARD_B,
  ...PRINT_SHARD_C,
};
