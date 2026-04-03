-- Migration: Add UNIQUE constraints to catalog tables
-- Fixes data integrity issues found in audit
-- Date: 2026-02-20

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

-- Colors: Ensure color names are unique
ALTER TABLE colors ADD CONSTRAINT colors_name_unique UNIQUE(name);

-- Inventory: Ensure 1:1 relationship with variants (only one inventory row per variant)
ALTER TABLE inventory ADD CONSTRAINT inventory_variant_id_unique UNIQUE(variant_id);

-- Product Variants: Ensure unique combination of product + color + size
ALTER TABLE product_variants ADD CONSTRAINT product_variants_composite_unique UNIQUE(product_id, color_id, size_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
