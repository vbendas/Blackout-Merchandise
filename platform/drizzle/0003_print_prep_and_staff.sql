CREATE TYPE "public"."pack_audit_status" AS ENUM('idle', 'waiting', 'being_fixed', 'approved', 'sent_back');--> statement-breakpoint
CREATE TYPE "public"."pack_build_status" AS ENUM('building', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."print_job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."print_technique" AS ENUM('screen', 'dtg_dtf');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'staff' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "design_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_id" uuid NOT NULL,
	"design_version_id" uuid NOT NULL,
	"pack_hashes" jsonb NOT NULL,
	"garment_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"placements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recipe" jsonb,
	"approved_by" uuid NOT NULL,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"invalidated_at" timestamp,
	"invalidated_reason" text
);
--> statement-breakpoint
CREATE TABLE "design_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"art_url" text NOT NULL,
	"art_key" text,
	"sha256" text NOT NULL,
	"width_px" integer NOT NULL,
	"height_px" integer NOT NULL,
	"source" text NOT NULL,
	"parent_version_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "design_versions_design_version_unique" UNIQUE("design_id","version")
);
--> statement-breakpoint
CREATE TABLE "ink_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"profile" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantone_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"lab_l" real NOT NULL,
	"lab_a" real NOT NULL,
	"lab_b" real NOT NULL,
	"source" text NOT NULL,
	"substrate" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"design_version_id" uuid NOT NULL,
	"status" "print_job_status" DEFAULT 'queued' NOT NULL,
	"input" jsonb NOT NULL,
	"input_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_after" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"locked_by" text,
	"error" text,
	"result" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "print_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capsule_id" text,
	"design_id" uuid,
	"recipe" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "print_recipes_capsule_unique" UNIQUE("capsule_id"),
	CONSTRAINT "print_recipes_design_unique" UNIQUE("design_id")
);
--> statement-breakpoint
CREATE TABLE "production_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_version_id" uuid NOT NULL,
	"placement" jsonb NOT NULL,
	"technique" "print_technique" NOT NULL,
	"screen_set_key" text,
	"garment_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"method" text,
	"screen_count" integer,
	"files" jsonb,
	"manifest" jsonb,
	"checks" jsonb,
	"input_hash" text NOT NULL,
	"build_status" "pack_build_status" DEFAULT 'building' NOT NULL,
	"audit_status" "pack_audit_status" DEFAULT 'idle' NOT NULL,
	"needed_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audited_by" uuid,
	"audited_at" timestamp,
	"corrected_from_pack_id" uuid,
	"job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"area" text NOT NULL,
	"action" text NOT NULL,
	"item_type" text,
	"item_id" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"title" text,
	"permissions" jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" uuid,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_permissions" (
	"user_id" uuid NOT NULL,
	"area" text NOT NULL,
	"level" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_permissions_user_id_area_pk" PRIMARY KEY("user_id","area")
);
--> statement-breakpoint
ALTER TABLE "print_services" ADD COLUMN "available_in_shop" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "design_approvals" ADD CONSTRAINT "design_approvals_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_approvals" ADD CONSTRAINT "design_approvals_design_version_id_design_versions_id_fk" FOREIGN KEY ("design_version_id") REFERENCES "public"."design_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_approvals" ADD CONSTRAINT "design_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ink_systems" ADD CONSTRAINT "ink_systems_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantone_library" ADD CONSTRAINT "pantone_library_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_design_version_id_design_versions_id_fk" FOREIGN KEY ("design_version_id") REFERENCES "public"."design_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_recipes" ADD CONSTRAINT "print_recipes_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_recipes" ADD CONSTRAINT "print_recipes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_packs" ADD CONSTRAINT "production_packs_design_version_id_design_versions_id_fk" FOREIGN KEY ("design_version_id") REFERENCES "public"."design_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_packs" ADD CONSTRAINT "production_packs_audited_by_users_id_fk" FOREIGN KEY ("audited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_packs" ADD CONSTRAINT "production_packs_job_id_print_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."print_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_activity" ADD CONSTRAINT "staff_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "design_approvals_design_id_idx" ON "design_approvals" USING btree ("design_id");--> statement-breakpoint
CREATE INDEX "design_versions_design_id_idx" ON "design_versions" USING btree ("design_id");--> statement-breakpoint
CREATE INDEX "pantone_library_code_idx" ON "pantone_library" USING btree ("code");--> statement-breakpoint
CREATE INDEX "print_jobs_status_run_after_idx" ON "print_jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "print_jobs_design_version_id_idx" ON "print_jobs" USING btree ("design_version_id");--> statement-breakpoint
CREATE INDEX "production_packs_design_version_id_idx" ON "production_packs" USING btree ("design_version_id");--> statement-breakpoint
CREATE INDEX "production_packs_audit_status_idx" ON "production_packs" USING btree ("audit_status");--> statement-breakpoint
CREATE INDEX "staff_activity_actor_id_idx" ON "staff_activity" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "staff_activity_item_idx" ON "staff_activity" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "staff_activity_created_at_idx" ON "staff_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "staff_invites_email_idx" ON "staff_invites" USING btree ("email");