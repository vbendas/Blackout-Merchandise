-- Production progress (owner request, 16 Oct 2026): the jobs, lines and screens the stations' iPads record, and the artist's opt-in to the website's "On the press" board (platform/lib/services/production-progress.ts). Additive only, and safe to run again: each type, table, column, constraint and index is made only when it is missing.
DO $$ BEGIN CREATE TYPE "public"."production_method" AS ENUM('screen', 'dtg', 'dtf'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."production_stage" AS ENUM('queued', 'screens', 'printing', 'curing', 'folding', 'shipped'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."screen_status" AS ENUM('waiting', 'film_printed', 'screen_ready', 'on_press', 'reclaimed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"method" "production_method" NOT NULL,
	"stage" "production_stage" DEFAULT 'queued' NOT NULL,
	"hidden_from_board" boolean DEFAULT false NOT NULL,
	"stage_changed_at" timestamp DEFAULT now() NOT NULL,
	"shipped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"line_key" text NOT NULL,
	"order_id" uuid NOT NULL,
	"order_ref" text NOT NULL,
	"blank_code" text NOT NULL,
	"colour_code" text NOT NULL,
	"size" text NOT NULL,
	"placement" text,
	"total" integer NOT NULL,
	"printed" integer DEFAULT 0 NOT NULL,
	"flag" text,
	"flagged_at" timestamp,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_lines_counts_check" CHECK ("production_lines"."total" >= 0 and "production_lines"."printed" >= 0 and "production_lines"."printed" <= "production_lines"."total")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screen_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"screen_key" text NOT NULL,
	"pack_id" uuid NOT NULL,
	"film_number" integer NOT NULL,
	"film_count" integer NOT NULL,
	"set_name" text NOT NULL,
	"ink_name" text NOT NULL,
	"ink_role" text DEFAULT 'ink' NOT NULL,
	"status" "screen_status" DEFAULT 'waiting' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "screen_progress_job_screen_unique" UNIQUE("job_id","screen_key")
);
--> statement-breakpoint
ALTER TABLE "artist_stores" ADD COLUMN IF NOT EXISTS "show_on_press_board" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_job_id_production_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."production_jobs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "screen_progress" ADD CONSTRAINT "screen_progress_job_id_production_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."production_jobs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "screen_progress" ADD CONSTRAINT "screen_progress_pack_id_production_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."production_packs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "screen_progress" ADD CONSTRAINT "screen_progress_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_jobs_open_unique" ON "production_jobs" USING btree ("design_id","method") WHERE "production_jobs"."stage" in ('queued', 'screens', 'printing');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_jobs_stage_idx" ON "production_jobs" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_lines_line_key_unique" ON "production_lines" USING btree ("line_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_lines_job_id_idx" ON "production_lines" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_lines_order_id_idx" ON "production_lines" USING btree ("order_id");
