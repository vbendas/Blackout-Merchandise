CREATE TYPE "public"."agent_name" AS ENUM('Leopoldo', 'Francisca', 'Antônia');--> statement-breakpoint
CREATE TYPE "public"."breach_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."bulk_order_status" AS ENUM('quoted', 'proof_pending', 'awaiting_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."consent_method" AS ENUM('explicit_opt_in', 'implicit', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('essential', 'analytics', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."design_readiness" AS ENUM('ready', 'needs_cleanup', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."design_source" AS ENUM('upload', 'generated', 'edited');--> statement-breakpoint
CREATE TYPE "public"."domain_status" AS ENUM('pending', 'verifying', 'active', 'error');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'discord', 'inapp');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('pod', 'bulk');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'proof_pending', 'live', 'archived');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('queued', 'printing', 'packed', 'shipped', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."project_kind" AS ENUM('onboarding', 'product', 'bulk_order');--> statement-breakpoint
CREATE TYPE "public"."proof_status" AS ENUM('pending', 'approved', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('access', 'deletion', 'portability');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('user', 'ai', 'human', 'system');--> statement-breakpoint
CREATE TYPE "public"."supplier_order_status" AS ENUM('draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('artist', 'admin');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"value_json" jsonb,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "artist_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"theme_config" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"accent_colour" text,
	"logo_url" text,
	"banner_url" text,
	"about" text,
	"socials" jsonb,
	"country" text,
	"currency" text DEFAULT 'EUR',
	"locale" text DEFAULT 'en',
	"memory" jsonb,
	"custom_domain" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_stores_slug_unique" UNIQUE("slug"),
	CONSTRAINT "artist_stores_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "base_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blank_code" text NOT NULL,
	"print_service_code" text NOT NULL,
	"qty_from" integer DEFAULT 1 NOT NULL,
	"garment_cost_cents" integer NOT NULL,
	"print_cost_cents" integer NOT NULL,
	"margin_cents" integer NOT NULL,
	"total_cents" integer GENERATED ALWAYS AS (garment_cost_cents + print_cost_cents + margin_cents) STORED,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_to" timestamp,
	CONSTRAINT "base_costs_blank_service_qty_unique" UNIQUE("blank_code","print_service_code","qty_from")
);
--> statement-breakpoint
CREATE TABLE "blank_colours" (
	"blank_code" text NOT NULL,
	"colour_code" text NOT NULL,
	"front_image_url" text,
	"back_image_url" text,
	CONSTRAINT "blank_colours_blank_code_colour_code_pk" PRIMARY KEY("blank_code","colour_code")
);
--> statement-breakpoint
CREATE TABLE "blank_print_services" (
	"blank_code" text NOT NULL,
	"print_service_code" text NOT NULL,
	CONSTRAINT "blank_print_services_blank_code_print_service_code_pk" PRIMARY KEY("blank_code","print_service_code")
);
--> statement-breakpoint
CREATE TABLE "blank_sizes" (
	"blank_code" text NOT NULL,
	"size" text NOT NULL,
	"display_order" integer,
	CONSTRAINT "blank_sizes_blank_code_size_pk" PRIMARY KEY("blank_code","size")
);
--> statement-breakpoint
CREATE TABLE "blanks" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"supplier_name" text,
	"description" text,
	"type" text NOT NULL,
	"fit" text,
	"composition" text,
	"weight_gsm" integer,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"details" jsonb DEFAULT '[]'::jsonb,
	"front_image_url" text,
	"back_image_url" text,
	"video_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "bulk_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"quote" jsonb,
	"status" "bulk_order_status" DEFAULT 'quoted' NOT NULL,
	"ship_to" jsonb,
	"order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	CONSTRAINT "collections_store_id_slug_unique" UNIQUE("store_id","slug")
);
--> statement-breakpoint
CREATE TABLE "colours" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex" text,
	"is_light" boolean DEFAULT false NOT NULL,
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp,
	"withdrawn_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"consent_version" text DEFAULT '1.0' NOT NULL,
	"method" "consent_method" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_at_time" "user_role",
	"title" text,
	"summary" text,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"status" "domain_status" DEFAULT 'pending' NOT NULL,
	"vercel_domain_id" text,
	"verification" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "data_breach_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" "breach_severity" NOT NULL,
	"affected_count" integer NOT NULL,
	"data_types" text NOT NULL,
	"description" text NOT NULL,
	"notified_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_subject_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"request_type" "request_type" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"source" "design_source" NOT NULL,
	"original_url" text,
	"print_url" text,
	"preview_url" text,
	"width_px" integer,
	"height_px" integer,
	"dpi_at_print" integer,
	"has_alpha" boolean,
	"readiness" "design_readiness",
	"readiness_notes" text,
	"parent_design_id" uuid,
	"generation_params" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" jsonb NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"discord_dm" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"discord_user_id" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"read_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_at_purchase" integer NOT NULL,
	"colour_code" text,
	"size" text,
	"unit_base_cost_cents" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"order_type" "order_type" DEFAULT 'pod' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"shipping_address" jsonb,
	"fan_email" text,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"application_fee_cents" integer DEFAULT 0 NOT NULL,
	"transfer_cents" integer DEFAULT 0 NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_transfer_id" text,
	"production_status" "production_status",
	"tracking" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
CREATE TABLE "payout_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"stripe_charge_id" text,
	"stripe_transfer_id" text,
	"gross_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"transfer_cents" integer NOT NULL,
	"stripe_fee_cents" integer,
	"status" text NOT NULL,
	"anomaly_flags" jsonb DEFAULT '[]'::jsonb,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"max_colours" integer,
	"positions" jsonb DEFAULT '[]'::jsonb,
	"setup_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "print_services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "processed_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"object_id" text,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_webhook_events_provider_event_unique" UNIQUE("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "product_colours" (
	"product_id" uuid NOT NULL,
	"colour_code" text NOT NULL,
	"mockup_url" text,
	CONSTRAINT "product_colours_product_id_colour_code_pk" PRIMARY KEY("product_id","colour_code")
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"product_id" uuid NOT NULL,
	"size" text NOT NULL,
	CONSTRAINT "product_sizes_product_id_size_pk" PRIMARY KEY("product_id","size")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"design_id" uuid,
	"blank_code" text NOT NULL,
	"print_service_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"placement" jsonb,
	"base_cost_cents" integer,
	"retail_price_cents" integer,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"collection_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"kind" "project_kind" NOT NULL,
	"ref_id" uuid,
	"state" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_cards_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"bulk_order_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"mockup_urls" jsonb,
	"spec" jsonb,
	"status" "proof_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"approved_at" timestamp,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"countries" jsonb DEFAULT '[]'::jsonb,
	"flat_cents" integer NOT NULL,
	"free_over_cents" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_customizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"slider_images" jsonb DEFAULT '[]'::jsonb,
	"background_color" text DEFAULT '#0A0A0A',
	"text_color" text DEFAULT '#FFFFFF',
	"about_text" text,
	"social_links" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_customizations_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "size_guides" (
	"blank_code" text PRIMARY KEY NOT NULL,
	"unit" text DEFAULT 'cm',
	"columns" jsonb DEFAULT '[]'::jsonb,
	"rows" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "stripe_accounts" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"charges_enabled" boolean DEFAULT false NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"requirements" jsonb,
	"last_synced_at" timestamp,
	CONSTRAINT "stripe_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_eur" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"supplier_name" text NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"status" "supplier_order_status" DEFAULT 'draft' NOT NULL,
	"total_cost_eur" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"visitor_token" text,
	"agent_id" "agent_name" NOT NULL,
	"assigned_staff_id" uuid,
	"status" "ticket_status" DEFAULT 'pending' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'chat' NOT NULL,
	"contact_email" text,
	"visitor_name" text,
	"estimated_wait_minutes" integer,
	"metadata" jsonb,
	"assigned_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" uuid,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"conversation_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"status" text NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp,
	"idempotency_key" text,
	"duration_ms" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_invocations_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'artist' NOT NULL,
	"stripe_customer_id" text,
	"stripe_connect_id" text,
	"image_url" text,
	"discord_user_id" text,
	"locale" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"social_link" text,
	"follower_range" text,
	"interview_responses" jsonb,
	"source" text DEFAULT 'organic' NOT NULL,
	"position" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "artist_stores" ADD CONSTRAINT "artist_stores_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "base_costs" ADD CONSTRAINT "base_costs_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "base_costs" ADD CONSTRAINT "base_costs_print_service_code_print_services_code_fk" FOREIGN KEY ("print_service_code") REFERENCES "public"."print_services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blank_colours" ADD CONSTRAINT "blank_colours_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blank_colours" ADD CONSTRAINT "blank_colours_colour_code_colours_code_fk" FOREIGN KEY ("colour_code") REFERENCES "public"."colours"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blank_print_services" ADD CONSTRAINT "blank_print_services_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blank_print_services" ADD CONSTRAINT "blank_print_services_print_service_code_print_services_code_fk" FOREIGN KEY ("print_service_code") REFERENCES "public"."print_services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blank_sizes" ADD CONSTRAINT "blank_sizes_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designs" ADD CONSTRAINT "designs_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_ledger" ADD CONSTRAINT "payout_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_ledger" ADD CONSTRAINT "payout_ledger_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_colours" ADD CONSTRAINT "product_colours_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_colours" ADD CONSTRAINT "product_colours_colour_code_colours_code_fk" FOREIGN KEY ("colour_code") REFERENCES "public"."colours"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_print_service_code_print_services_code_fk" FOREIGN KEY ("print_service_code") REFERENCES "public"."print_services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_cards" ADD CONSTRAINT "project_cards_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_bulk_order_id_bulk_orders_id_fk" FOREIGN KEY ("bulk_order_id") REFERENCES "public"."bulk_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_customizations" ADD CONSTRAINT "shop_customizations_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_guides" ADD CONSTRAINT "size_guides_blank_code_blanks_code_fk" FOREIGN KEY ("blank_code") REFERENCES "public"."blanks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_accounts" ADD CONSTRAINT "stripe_accounts_store_id_artist_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."artist_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_order_id_supplier_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_invocations" ADD CONSTRAINT "tool_invocations_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_invocations" ADD CONSTRAINT "tool_invocations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_settings_key_idx" ON "app_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "artist_stores_artist_id_idx" ON "artist_stores" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "blanks_type_idx" ON "blanks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "designs_store_id_idx" ON "designs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_stripe_payment_intent_id_idx" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_order_type_idx" ON "orders" USING btree ("order_type");--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "shop_customizations_store_id_idx" ON "shop_customizations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "supplier_order_items_order_id_idx" ON "supplier_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "supplier_order_items_variant_id_idx" ON "supplier_order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "supplier_orders_po_number_idx" ON "supplier_orders" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "supplier_orders_status_idx" ON "supplier_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supplier_orders_supplier_name_idx" ON "supplier_orders" USING btree ("supplier_name");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_agent_id_idx" ON "support_tickets" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_staff_id_idx" ON "support_tickets" USING btree ("assigned_staff_id");--> statement-breakpoint
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_visitor_token_idx" ON "support_tickets" USING btree ("visitor_token");--> statement-breakpoint
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_messages_sender_type_idx" ON "ticket_messages" USING btree ("sender_type");--> statement-breakpoint
CREATE INDEX "ticket_messages_created_at_idx" ON "ticket_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tool_invocations_conversation_id_idx" ON "tool_invocations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_position_idx" ON "waitlist" USING btree ("position");