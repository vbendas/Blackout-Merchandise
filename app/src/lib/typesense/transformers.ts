/**
 * Data Transformers — PostgreSQL rows → Typesense documents
 *
 * Flattens joins and extracts the primary image URL for each product type.
 * These transform functions are called by the sync layer.
 */

// ─── Catalog Product Transformer ────────────────────────────────────────

// Accept the raw Drizzle row shape
export async function catalogProductToDoc(
  product: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Try to get primary image if available
  let imageUrl: string | undefined;

  // If imageUrl is directly provided, use it
  if ('imageUrl' in product && product.imageUrl) {
    imageUrl = product.imageUrl as string;
  } else {
    // Try to fetch from productImages table
    try {
      const { getImagesByProduct } = await import('@db-root/catalog');
      const images = await getImagesByProduct(product.id as string);
      const primary = images.find((img) => img.isPrimary) || images[0];
      imageUrl = primary?.cloudinaryUrl ?? undefined;
    } catch {
      // No images found — that's OK
    }
  }

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: (product.description as string) || '',
    brand: product.brand,
    category: (product.categoryName as string) || 'Uncategorized',
    categorySlug: (product.categorySlug as string) || null,
    material: (product.material as string) || null,
    baseCostEur: product.baseCostEur,
    suggestedRetailEur: product.suggestedRetailEur ?? undefined,
    status: product.status,
    weightG: product.weightG ?? undefined,
    attributes: product.attributes ?? undefined,
    imageUrl: imageUrl ?? undefined,
    createdAt: Math.floor(new Date(product.createdAt as string | Date).getTime() / 1000),
  };
}

// ─── Artist Product Transformer ─────────────────────────────────────────

export function artistProductToDoc(
  product: Record<string, unknown>,
  store: { id: string; slug: string; name: string }
): Record<string, unknown> {
  return {
    id: product.id,
    storeId: product.storeId,
    storeSlug: store.slug,
    storeName: store.name,
    name: product.name,
    description: (product.description as string) || '',
    baseCost: product.baseCost,
    retailPrice: product.retailPrice,
    mockupUrl: product.mockupUrl,
    isActive: product.isActive,
    createdAt: Math.floor(new Date(product.createdAt as string | Date).getTime() / 1000),
  };
}
