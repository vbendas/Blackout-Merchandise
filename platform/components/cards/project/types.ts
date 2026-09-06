import type { z } from 'zod';
import type { CardAction, checklistItemSchema } from '@/lib/ui-cards/schemas';

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
  qty: number;
  priceCents?: number;
}

export interface BulkOrderProjectState {
  lines?: BulkOrderLine[];
  totalCents?: number;
  status?: string;
  actions?: CardAction[];
}
