/**
 * Data Sync Layer — PostgreSQL → Typesense
 *
 * Keeps Typesense collections in sync with PostgreSQL data.
 * All sync calls are non-blocking (fire-and-forget) — sync failure NEVER
 * breaks the primary CRUD operation.
 *
 * [ARCH] For MVP, sync is synchronous-call-with-catch.
 * For scale, migrate to Upstash QStash queue for reliable async sync.
 */

import { getSharedServerClient, isTypesenseConfigured } from './client';
import { CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION } from './schemas';
import { catalogProductToDoc, artistProductToDoc } from './transformers';

// ─── Catalog Products Sync ──────────────────────────────────────────────

/**
 * Upsert a single catalog product into Typesense.
 * Called after create/update operations in src/db/catalog.ts
 */
export async function syncCatalogProduct(product: Record<string, unknown>): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const client = getSharedServerClient();
    const doc = await catalogProductToDoc(product);

    await client
      .collections(CATALOG_PRODUCTS_COLLECTION)
      .documents()
      .upsert(doc);
  } catch (error) {
    console.error('[Typesense] Failed to sync catalog product:', {
      id: product.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete a catalog product from Typesense.
 * Called after delete/deactivate operations.
 */
export async function deleteCatalogProduct(id: string): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const client = getSharedServerClient();
    await client
      .collections(CATALOG_PRODUCTS_COLLECTION)
      .documents(id)
      .delete();
  } catch (error) {
    console.error('[Typesense] Failed to delete catalog product:', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Artist Products Sync ───────────────────────────────────────────────

/**
 * Upsert a single artist product into Typesense.
 * Requires store info for multi-tenant scoping.
 */
export async function syncArtistProduct(
  product: { id: string; storeId: string; name: string; description: string | null; baseCost: number; retailPrice: number; mockupUrl: string; isActive: boolean; createdAt: Date },
  store: { id: string; slug: string; name: string }
): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const client = getSharedServerClient();
    const doc = artistProductToDoc(product, store);

    await client
      .collections(ARTIST_PRODUCTS_COLLECTION)
      .documents()
      .upsert(doc);
  } catch (error) {
    console.error('[Typesense] Failed to sync artist product:', {
      id: product.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete an artist product from Typesense.
 */
export async function deleteArtistProduct(id: string): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const client = getSharedServerClient();
    await client
      .collections(ARTIST_PRODUCTS_COLLECTION)
      .documents(id)
      .delete();
  } catch (error) {
    console.error('[Typesense] Failed to delete artist product:', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Mark an artist product as inactive in Typesense (soft delete).
 */
export async function deactivateArtistProduct(id: string): Promise<void> {
  if (!isTypesenseConfigured()) return;

  try {
    const client = getSharedServerClient();
    await client
      .collections(ARTIST_PRODUCTS_COLLECTION)
      .documents(id)
      .update({ isActive: false });
  } catch (error) {
    console.error('[Typesense] Failed to deactivate artist product:', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Bulk Sync Helpers ──────────────────────────────────────────────────

/**
 * Bulk upsert catalog products. Used for initial seed/reindex.
 */
export async function bulkSyncCatalog(
  products: Parameters<typeof catalogProductToDoc>[0][]
): Promise<{ indexed: number; failed: number }> {
  if (!isTypesenseConfigured()) return { indexed: 0, failed: 0 };

  const client = getSharedServerClient();
  const docs = await Promise.all(products.map((p) => catalogProductToDoc(p)));

  if (docs.length === 0) return { indexed: 0, failed: 0 };

  const results = await client
    .collections(CATALOG_PRODUCTS_COLLECTION)
    .documents()
    .import(docs, { action: 'upsert' });

  const indexed = results.filter((r: { success: boolean }) => r.success).length;
  const failed = results.length - indexed;

  return { indexed, failed };
}
