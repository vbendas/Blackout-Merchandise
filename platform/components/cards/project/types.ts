import type { z } from 'zod';
import type { CardAction, checklistItemSchema } from '@/lib/ui-cards/schemas';

type ChecklistItem = z.infer<typeof checklistItemSchema>;

export interface OnboardingProjectState {
  items?: ChecklistItem[];
}

export interface ProductProjectState {
  imageUrl?: string;
  name?: string;
  code?: string;
  colours?: { code: string; name: string; hex: string }[];
  sizes?: string[];
  printService?: string;
  baseCostCents?: number;
  retailCents?: number;
  status?: string;
  actions?: CardAction[];
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
