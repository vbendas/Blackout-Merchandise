-- Migration: Product Catalog Tables
-- Creates the comprehensive product catalog system
-- Date: 2026-02-20

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "product_status" AS ENUM ('active', 'archived', 'discontinued');
CREATE TYPE "variant_status" AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'discontinued');
CREATE TYPE "product_batch_status" AS ENUM ('active', 'sold_out', 'expired');
CREATE TYPE "attribute_type" AS ENUM ('text', 'number', 'boolean', 'enum', 'json');

-- ============================================
-- CORE TABLES
-- ============================================

-- Categories Table
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "parent_id" uuid REFERENCES "categories" ("id") ON DELETE SET NULL,
  "display_order" integer DEFAULT 0,
  "image_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories" ("parent_id");

-- Category Attributes (Dynamic attributes per category)
CREATE TABLE IF NOT EXISTS "category_attributes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL REFERENCES "categories" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "label" text NOT NULL,
  "attribute_type" attribute_type NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0,
  "unit" text,
  "options" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "category_attributes_category_id_idx" ON "category_attributes" ("category_id");

-- Colors Table
CREATE TABLE IF NOT EXISTS "colors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "hex_code" text,
  "cloudinary_folder" text,
  "display_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "colors_name_idx" ON "colors" ("name");

-- Sizes Table (different per category)
CREATE TABLE IF NOT EXISTS "sizes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "categories" ("id"),
  "display_order" integer DEFAULT 0,
  "measurements" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sizes_category_id_idx" ON "sizes" ("category_id");

-- Catalog Products Table (Main products - replaces/enhances productBlanks)
CREATE TABLE IF NOT EXISTS "catalog_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sku" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "category_id" uuid NOT NULL REFERENCES "categories" ("id"),
  "brand" text NOT NULL,
  "material" text,
  "weight_g" integer,
  
  -- Pricing (all in EUR cents)
  "cost_price_eur" integer, -- INTERNAL: What WE pay
  "base_cost_eur" integer NOT NULL, -- EXTERNAL: What artists pay
  "suggested_retail_eur" integer, -- EXTERNAL: Recommended retail
  
  -- Multi-currency support (for future)
  "currency_code" text DEFAULT 'EUR' NOT NULL,
  
  -- Status
  "status" product_status DEFAULT 'active' NOT NULL,
  
  -- Additional attributes (dynamic based on category)
  "attributes" jsonb,
  
  -- Metadata
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "catalog_products_sku_idx" ON "catalog_products" ("sku");
CREATE INDEX IF NOT EXISTS "catalog_products_category_id_idx" ON "catalog_products" ("category_id");
CREATE INDEX IF NOT EXISTS "catalog_products_status_idx" ON "catalog_products" ("status");

-- Product Variants Table (Size/color combinations)
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "catalog_products" ("id") ON DELETE CASCADE,
  "sku" text NOT NULL UNIQUE,
  "color_id" uuid NOT NULL REFERENCES "colors" ("id"),
  "size_id" uuid NOT NULL REFERENCES "sizes" ("id"),
  "barcode" text,
  
  -- Variant-specific pricing (can override product base)
  "base_cost_override" integer,
  
  "status" variant_status DEFAULT 'in_stock' NOT NULL,
  
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants" ("sku");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_color_id_idx" ON "product_variants" ("color_id");
CREATE INDEX IF NOT EXISTS "product_variants_size_id_idx" ON "product_variants" ("size_id");

-- Inventory Table (Stock tracking per variant)
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "variant_id" uuid NOT NULL REFERENCES "product_variants" ("id") ON DELETE CASCADE,
  "quantity_available" integer DEFAULT 0 NOT NULL,
  "quantity_reserved" integer DEFAULT 0 NOT NULL,
  "reorder_point" integer DEFAULT 10,
  "warehouse_location" text,
  "last_counted_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "inventory_variant_id_idx" ON "inventory" ("variant_id");

-- Product Images Table (Cloudinary URLs)
CREATE TABLE IF NOT EXISTS "product_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "variant_id" uuid REFERENCES "product_variants" ("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "catalog_products" ("id") ON DELETE CASCADE,
  
  "cloudinary_public_id" text NOT NULL,
  "cloudinary_url" text NOT NULL,
  
  "image_type" text NOT NULL, -- "front", "back", "detail", "lifestyle", "swatch"
  "is_primary" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0,
  "alt_text" text,
  
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_images_variant_id_idx" ON "product_images" ("variant_id");
CREATE INDEX IF NOT EXISTS "product_images_product_id_idx" ON "product_images" ("product_id");

-- Pricing History Table (Audit trail)
CREATE TABLE IF NOT EXISTS "pricing_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "catalog_products" ("id") ON DELETE CASCADE,
  "field_changed" text NOT NULL,
  "old_value" integer,
  "new_value" integer NOT NULL,
  "changed_by" text NOT NULL,
  "change_reason" text,
  "effective_date" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pricing_history_product_id_idx" ON "pricing_history" ("product_id");
CREATE INDEX IF NOT EXISTS "pricing_history_effective_date_idx" ON "pricing_history" ("effective_date");

-- Pricing Schedules Table (Future price changes)
CREATE TABLE IF NOT EXISTS "pricing_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "catalog_products" ("id") ON DELETE CASCADE,
  "field_to_change" text NOT NULL,
  "new_value" integer NOT NULL,
  "effective_date" timestamp NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pricing_schedules_product_id_idx" ON "pricing_schedules" ("product_id");
CREATE INDEX IF NOT EXISTS "pricing_schedules_effective_date_idx" ON "pricing_schedules" ("effective_date");

-- Product Batches Table (For internal profit tracking)
CREATE TABLE IF NOT EXISTS "product_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "variant_id" uuid NOT NULL REFERENCES "product_variants" ("id") ON DELETE CASCADE,
  "batch_code" text NOT NULL,
  "supplier" text,
  "purchase_cost_eur" integer NOT NULL, -- What WE paid
  
  "quantity_received" integer NOT NULL,
  "quantity_remaining" integer NOT NULL,
  
  "status" product_batch_status DEFAULT 'active' NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "notes" text,
  
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_batches_variant_id_idx" ON "product_batches" ("variant_id");
CREATE INDEX IF NOT EXISTS "product_batches_batch_code_idx" ON "product_batches" ("batch_code");

-- ============================================
-- SEED DATA (Initial categories and colors)
-- ============================================

-- Insert default categories
INSERT INTO "categories" ("name", "slug", "display_order") VALUES
  ('T-Shirts', 't-shirts', 1),
  ('Hoodies', 'hoodies', 2),
  ('Sweatshirts', 'sweatshirts', 3),
  ('Pants', 'pants', 4),
  ('Shorts', 'shorts', 5),
  ('Accessories', 'accessories', 6)
ON CONFLICT ("slug") DO NOTHING;

-- Insert default colors
INSERT INTO "colors" ("name", "hex_code", "display_order") VALUES
  ('Black', '#000000', 1),
  ('White', '#FFFFFF', 2),
  ('Navy', '#000080', 3),
  ('Grey', '#808080', 4),
  ('Red', '#FF0000', 5),
  ('Blue', '#0000FF', 6),
  ('Green', '#008000', 7),
  ('Burgundy', '#800020', 8)
ON CONFLICT ("name") DO NOTHING;

-- Insert default sizes for T-Shirts category
INSERT INTO "sizes" ("name", "category_id", "display_order", "measurements") 
SELECT s.name, c.id, s.display_order, s.measurements
FROM (VALUES
  ('XS', 1, '{"chest": "46cm", "length": "66cm"}'),
  ('S', 2, '{"chest": "48cm", "length": "68cm"}'),
  ('M', 3, '{"chest": "50cm", "length": "70cm"}'),
  ('L', 4, '{"chest": "52cm", "length": "72cm"}'),
  ('XL', 5, '{"chest": "54cm", "length": "74cm"}'),
  ('2XL', 6, '{"chest": "56cm", "length": "76cm"}'),
  ('3XL', 7, '{"chest": "58cm", "length": "78cm"}'),
  ('4XL', 8, '{"chest": "60cm", "length": "80cm"}')
) AS s(name, display_order, measurements)
JOIN "categories" c ON c."slug" = 't-shirts'
ON CONFLICT DO NOTHING;

-- Insert default sizes for Hoodies category
INSERT INTO "sizes" ("name", "category_id", "display_order", "measurements") 
SELECT s.name, c.id, s.display_order, s.measurements
FROM (VALUES
  ('XS', 1, '{"chest": "48cm", "length": "63cm"}'),
  ('S', 2, '{"chest": "50cm", "length": "65cm"}'),
  ('M', 3, '{"chest": "52cm", "length": "67cm"}'),
  ('L', 4, '{"chest": "54cm", "length": "69cm"}'),
  ('XL', 5, '{"chest": "56cm", "length": "71cm"}'),
  ('2XL', 6, '{"chest": "58cm", "length": "73cm"}'),
  ('3XL', 7, '{"chest": "60cm", "length": "75cm"}'),
  ('4XL', 8, '{"chest": "62cm", "length": "77cm"}')
) AS s(name, display_order, measurements)
JOIN "categories" c ON c."slug" = 'hoodies'
ON CONFLICT DO NOTHING;

-- Add category attributes for T-Shirts
INSERT INTO "category_attributes" ("category_id", "name", "label", "attribute_type", "required", "display_order", "options")
SELECT c.id, a.name, a.label, a.type, a.required, a.display_order, a.options::jsonb
FROM (VALUES
  ('fit_type', 'Fit Type', 'enum', true, 1, '["slim", "regular", "relaxed", "oversized"]'),
  ('fabric_weight', 'Fabric Weight', 'number', false, 2, NULL),
  ('neckline', 'Neckline', 'enum', false, 3, '["crew", "v-neck", "scoop", "henley"]'),
  ('sleeve_length', 'Sleeve Length', 'enum', false, 4, '["short", "long", "3/4", "sleeveless"]')
) AS a(name, label, type, required, display_order, options)
JOIN "categories" c ON c."slug" = 't-shirts';

-- Add category attributes for Hoodies
INSERT INTO "category_attributes" ("category_id", "name", "label", "attribute_type", "required", "display_order", "options")
SELECT c.id, a.name, a.label, a.type, a.required, a.display_order, a.options::jsonb
FROM (VALUES
  ('fit_type', 'Fit Type', 'enum', true, 1, '["slim", "regular", "relaxed", "oversized"]'),
  ('fabric_weight', 'Fabric Weight', 'number', false, 2, NULL),
  ('hood_type', 'Hood Type', 'enum', false, 3, '["standard", "drawstring", "zipper"]'),
  ('pocket_style', 'Pocket Style', 'enum', false, 4, '["kangaroo", "side", "none"]')
) AS a(name, label, type, required, display_order, options)
JOIN "categories" c ON c."slug" = 'hoodies';
