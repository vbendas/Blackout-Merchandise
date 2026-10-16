ALTER TABLE "product_colours" ADD COLUMN IF NOT EXISTS "mockup_views" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "placements" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_cost_lines" jsonb;--> statement-breakpoint
-- Products carry a list of print areas (Print-Prep-Plan section 11). A product's one placement and its design become its first area. The old column stays and is no longer written; a row this leaves out (no placement saved) is read from it as before. Additive and safe to run again: the columns are added only when missing, and a row that already has its list is left alone.
UPDATE "products" SET "placements" = jsonb_build_array("placement" || jsonb_build_object('designId', "design_id")) WHERE "placements" IS NULL AND jsonb_typeof("placement") = 'object';
