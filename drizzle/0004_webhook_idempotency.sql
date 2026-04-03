CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL,
  "event_id" text NOT NULL,
  "object_id" text,
  "processed_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "processed_webhook_events_provider_event_unique"
  ON "processed_webhook_events" ("provider", "event_id");
