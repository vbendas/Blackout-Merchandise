import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ServiceResult } from '@/lib/services/products';

// Artist-defined product groupings, per store. Slugs are derived from the
// name and de-duplicated within the store.

export interface Collection {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isVisible: boolean;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'collection';
}

export async function createCollection(storeId: string, name: string): Promise<ServiceResult<Collection>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Collection name is required.' };

  const base = slugify(trimmed);
  let slug = base;
  let attempt = 1;
  for (;;) {
    const existing = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.storeId, storeId), eq(schema.collections.slug, slug)))
      .limit(1);
    if (existing.length === 0) break;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  const [row] = await db.insert(schema.collections).values({ storeId, name: trimmed, slug }).returning();
  return { ok: true, value: row };
}

export async function listCollections(storeId: string): Promise<Collection[]> {
  return db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.storeId, storeId))
    .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name));
}

export interface AssignResult {
  productId: string;
  collectionId: string | null;
}

export async function assignToCollection(storeId: string, productId: string, collectionId: string | null): Promise<ServiceResult<AssignResult>> {
  const productRows = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.storeId, storeId)))
    .limit(1);
  if (productRows.length === 0) return { ok: false, error: 'Product not found for this shop.' };

  if (collectionId) {
    const collectionRows = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.storeId, storeId)))
      .limit(1);
    if (collectionRows.length === 0) return { ok: false, error: 'Collection not found for this shop.' };
  }

  await db.update(schema.products).set({ collectionId, updatedAt: new Date() }).where(eq(schema.products.id, productId));
  return { ok: true, value: { productId, collectionId } };
}
