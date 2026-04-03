-- Migration: Add performance indexes for catalog queries
-- Improves query performance for common lookup patterns
-- Date: 2026-02-20

-- ============================================
-- COMPOSITE INDEXES
-- ============================================

-- Variant lookup by product+color+size (most common query pattern)
CREATE INDEX product_variants_lookup_idx ON product_variants(product_id, color_id, size_id);

-- Active batches query (filter by status)
CREATE INDEX product_batches_active_idx ON product_batches(variant_id, status) WHERE status = 'active';

-- Primary image lookup (quick find main product image)
CREATE INDEX product_images_primary_idx ON product_images(product_id, is_primary) WHERE is_primary = true;

-- Full-text search on catalog products (name + description)
CREATE INDEX catalog_products_search_idx ON catalog_products 
USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- Category + status filter for products
CREATE INDEX catalog_products_cat_status_idx ON catalog_products(category_id, status);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
