CREATE TABLE "waitlist_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"product" text,
	"colour" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"role" text,
	"favourites" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"invite_token" text,
	"invited_at" timestamp,
	"approved_at" timestamp,
	"registered_user_id" uuid,
	"notes" text,
	CONSTRAINT "waitlist_signups_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
DROP TABLE "waitlist" CASCADE;--> statement-breakpoint
CREATE INDEX "waitlist_signups_status_idx" ON "waitlist_signups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_signups_email_idx" ON "waitlist_signups" USING btree ("email");