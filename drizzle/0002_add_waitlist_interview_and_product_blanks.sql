CREATE TABLE "product_blanks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"sku" text NOT NULL,
	"base_cost" integer NOT NULL,
	"suggested_retail" integer NOT NULL,
	"image_urls" jsonb NOT NULL,
	"colors" jsonb,
	"sizes" jsonb,
	"specs" jsonb,
	"sustainability_badges" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_blanks_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "social_link" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "follower_range" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "interview_responses" jsonb;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "source" text DEFAULT 'organic' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;