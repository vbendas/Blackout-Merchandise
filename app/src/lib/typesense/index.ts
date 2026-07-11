/**
 * Typesense Search Integration
 *
 * Barrel export for all Typesense modules.
 */

export { getServerClient, getSharedServerClient, getBrowserClientConfig, isTypesenseConfigured } from './client';
export { CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION, catalogProductsSchema, artistProductsSchema } from './schemas';
export { ensureCollections, resetCollections, reindexCatalog, reindexArtistProducts, reindexAll } from './collections';
export { syncCatalogProduct, deleteCatalogProduct, syncArtistProduct, deleteArtistProduct, deactivateArtistProduct, bulkSyncCatalog } from './sync';
export { catalogProductToDoc, artistProductToDoc } from './transformers';
