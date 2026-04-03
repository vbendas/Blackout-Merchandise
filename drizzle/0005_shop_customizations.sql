CREATE TABLE IF NOT EXISTS "shop_customizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL UNIQUE REFERENCES "artist_stores"("id") ON DELETE CASCADE,
  "slider_images" jsonb DEFAULT '[]',
  "background_color" text DEFAULT '#0A0A0A',
  "text_color" text DEFAULT '#FFFFFF',
  "about_text" text,
  "social_links" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "shop_customizations_store_id_idx" ON "shop_customizations" ("store_id");
