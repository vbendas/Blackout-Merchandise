CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
