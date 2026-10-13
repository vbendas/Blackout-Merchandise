import type { z } from 'zod';
import type { checklistItemSchema } from '@/lib/ui-cards/schemas';

// The 'product' project state has grown a fuller shape (wave 1: design →
// product) — sourced from schemas.ts so the card and the project panel share
// one definition instead of drifting apart.
export type { ProductProjectState } from '@/lib/ui-cards/schemas';

type ChecklistItem = z.infer<typeof checklistItemSchema>;

export interface OnboardingProjectState {
  items?: ChecklistItem[];
}

export interface BulkOrderLine {
  label: string;
  colour?: string;
  sizes?: string;
  qty: number;
  totalCents?: number;
}

// State carried by the 'bulk_order' project card (right-hand / top-bar
// pill): one run. Deliberately narrower than the bulk_quote card's line shape
// (no per-unit cost) — the panel is a status glance, not the full quote.
export interface BulkOrderProjectState {
  bulkOrderId: string;
  /** the run's number in its shop ('Run 3' is 3); runs saved before numbering have none */
  runNumber?: number;
  lines: BulkOrderLine[];
  totalCents: number;
  status: string;
  shipTo?: string;
}
