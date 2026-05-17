/**
 * Typesense Collection Schemas
 *
 * Two collections for two search contexts:
 * 1. catalog_products — Blank garments for artist dashboard
 * 2. artist_products — Artist-designed products for MerchShop storefronts
 *
 * [ARCH] Using Typesense built-in CLIP embeddings (ts/clip-vit-b-p32) for visual search.
 * Image URLs must be publicly accessible (Cloudinary URLs are public by default).
 */

import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

/**
 * Collection 1: Blank garment catalog for artist dashboard search.
 * Artists search this when choosing products to apply designs to.
 */
export const CATALOG_PRODUCTS_COLLECTION = 'catalog_products';

export const catalogProductsSchema: CollectionCreateSchema = {
  name: CATALOG_PRODUCTS_COLLECTION,
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'sku', type: 'string', sort: true },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'categorySlug', type: 'string', optional: true },
    { name: 'material', type: 'string', facet: true, optional: true },
    { name: 'baseCostEur', type: 'int32', sort: true },
    { name: 'suggestedRetailEur', type: 'int32', sort: true, optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'weightG', type: 'int32', optional: true },
    { name: 'attributes', type: 'object', optional: true },
    { name: 'imageUrl', type: 'string', optional: true },
    { name: 'createdAt', type: 'int64', sort: true },
  ],
  default_sorting_field: 'createdAt',
};

/**
 * Collection 2: Artist-designed products for MerchShop storefront search.
 * Customers search this when browsing an artist's store.
 * Scoped by storeId/storeSlug for multi-tenant isolation.
 */
export const ARTIST_PRODUCTS_COLLECTION = 'artist_products';

export const artistProductsSchema: CollectionCreateSchema = {
  name: ARTIST_PRODUCTS_COLLECTION,
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'storeId', type: 'string', facet: true },
    { name: 'storeSlug', type: 'string' },
    { name: 'storeName', type: 'string', optional: true },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'baseCost', type: 'int32', sort: true },
    { name: 'retailPrice', type: 'int32', sort: true },
    { name: 'mockupUrl', type: 'string', optional: true },
    { name: 'isActive', type: 'bool' },
    { name: 'createdAt', type: 'int64', sort: true },
  ],
  default_sorting_field: 'createdAt',
};

/**
 * All collection schemas for easy iteration.
 */
export const ALL_SCHEMAS = [catalogProductsSchema, artistProductsSchema] as const;
