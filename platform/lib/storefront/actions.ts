'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Called from the cart page (a Client Component) to catch a line whose
// product went back to draft/archived, or was archived, after it was added
// to a fan's cart. Read-only — checkout itself is the real gate.
export async function checkProductsLive(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return [];
  const rows = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(inArray(schema.products.id, productIds), eq(schema.products.status, 'live')));
  return rows.map((r) => r.id);
}
