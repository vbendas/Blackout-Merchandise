CREATE TABLE "app_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL,
    "value" text NOT NULL,
    "description" text,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);

CREATE INDEX "app_settings_key_idx" ON "app_settings" USING btree ("key");
