import { SIZE_SHARD_A } from './size-guides/shard-a';
import { SIZE_SHARD_B } from './size-guides/shard-b';
import { SIZE_SHARD_C } from './size-guides/shard-c';

// Garment measurement tables per supplier style code, read from the
// size-guide page of the supplier's product sheets. Values are strings
// exactly as printed (numbers only, no unit) in the order of `columns`.
export interface SizeGuide {
  /** unit for every value, e.g. 'cm' */
  unit: string;
  /** measurement names, e.g. ['Half chest', 'Body length', 'Sleeve length'] */
  columns: string[];
  /** one row per size, values aligned to `columns` */
  rows: { size: string; values: string[] }[];
}

export const SIZE_GUIDES: Record<string, SizeGuide> = {
  ...SIZE_SHARD_A,
  ...SIZE_SHARD_B,
  ...SIZE_SHARD_C,
};
