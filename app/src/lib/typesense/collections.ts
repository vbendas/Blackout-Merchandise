/**
 * Typesense Collection Management
 *
 * Create, drop, and check collections. Plus full reindex from PostgreSQL.
 */

import { getSharedServerClient, isTypesenseConfigured } from './client';
import { ALL_SCHEMAS, CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION } from './schemas';
import { catalogProductToDoc, artistProductToDoc } from './transformers';

/**
 * Ensure all collections exist. Creates them if missing.
 * Safe to call multiple times (idempotent).
 */
export async function ensureCollections(): Promise<{ created: string[]; existing: string[] }> {
  const client = getSharedServerClient();
  const created: string[] = [];
  const existing: string[] = [];

  for (const schema of ALL_SCHEMAS) {
    try {
      await client.collections(schema.name).retrieve();
      existing.push(schema.name);
    } catch (error: unknown) {
      // Collection doesn't exist — create it
      if (error instanceof Error && (error as { httpStatus?: number }).httpStatus === 404) {
        await client.collections().create(schema as never);
        created.push(schema.name);
      } else {
        throw error;
      }
    }
  }

  return { created, existing };
}

/**
 * Drop and recreate all collections. Destructive — use for development only.
 */
export async function resetCollections(): Promise<void> {
  const client = getSharedServerClient();

  for (const schema of ALL_SCHEMAS) {
    try {
      await client.collections(schema.name).delete();
    } catch {
      // Collection may not exist — ignore
    }
  }

  await ensureCollections();
}

/**
 * Full reindex of catalog_products from PostgreSQL.
 * Returns the number of documents indexed.
 */
export async function reindexCatalog(): Promise<number> {
  const client = getSharedServerClient();

  // Dynamic import to avoid circular deps
  const { getAllCatalogProducts } = await import('@db-root/catalog');
  const products = await getAllCatalogProducts();

  const documents = await Promise.all(
    products.map((p) => catalogProductToDoc(p))
  );

  // Use import endpoint for bulk upsert
  const results = await client
    .collections(CATALOG_PRODUCTS_COLLECTION)
    .documents()
    .import(documents, { action: 'upsert' });

  const successCount = results.filter(
    (r: { success: boolean }) => r.success
  ).length;

  return successCount;
}

/**
 * Full reindex of artist_products from PostgreSQL.
 * Returns the number of documents indexed.
 */
export async function reindexArtistProducts(): Promise<number> {
  const client = getSharedServerClient();

  // Dynamic imports to avoid circular deps
  const { db } = await import('@db-root/index');
  const { products, artistStores } = await import('@db-root/schema');
  const { eq } = await import('drizzle-orm');

  // Get all active products with their store info
  const allProducts = await db
    .select({
      product: products,
      store: artistStores,
    })
    .from(products)
    .innerJoin(artistStores, eq(products.storeId, artistStores.id))
    .where(eq(products.isActive, true));

  const documents = allProducts.map(({ product, store }) =>
    artistProductToDoc(product, store)
  );

  if (documents.length === 0) return 0;

  const results = await client
    .collections(ARTIST_PRODUCTS_COLLECTION)
    .documents()
    .import(documents, { action: 'upsert' });

  const successCount2 = results.filter(
    (r: { success: boolean }) => r.success
  ).length;

  return successCount2;
}

/**
 * Full reindex of all collections.
 */
export async function reindexAll(): Promise<{ catalog: number; artist: number }> {
  if (!isTypesenseConfigured()) {
    throw new Error('Typesense not configured. Set environment variables first.');
  }

  await ensureCollections();

  const [catalog, artist] = await Promise.all([
    reindexCatalog(),
    reindexArtistProducts(),
  ]);

  return { catalog, artist };
}
