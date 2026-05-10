-- Human Handoff Support Schema
-- Created: May 10, 2026

-- Create enums
CREATE TYPE "staff_role" AS ENUM ('head_of_operations', 'head_of_design', 'head_of_customer_success', 'support_agent', 'admin', 'viewer');
--> statement-breakpoint
CREATE TYPE "ticket_status" AS ENUM ('pending', 'assigned', 'in_progress', 'resolved', 'closed');
--> statement-breakpoint
CREATE TYPE "ticket_priority" AS ENUM ('low', 'medium', 'high', 'urgent');
--> statement-breakpoint
CREATE TYPE "sender_type" AS ENUM ('user', 'ai', 'human', 'system');
--> statement-breakpoint

-- Create staff table
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"department" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint

-- Create agent_staff_assignments table
CREATE TABLE "agent_staff_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" "agent_name" NOT NULL,
	"staff_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create support_tickets table
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

-- Create ticket_messages table
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

-- Add columns to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN "support_ticket_id" uuid;
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "human_handoff_requested_at" timestamp;
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "human_handoff_status" text;
--> statement-breakpoint

-- Create indexes for staff
CREATE INDEX "staff_email_idx" ON "staff" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "staff_role_idx" ON "staff" USING btree ("role");
--> statement-breakpoint
CREATE INDEX "staff_is_active_idx" ON "staff" USING btree ("is_active");
--> statement-breakpoint

-- Create indexes for agent_staff_assignments
CREATE INDEX "agent_staff_agent_id_idx" ON "agent_staff_assignments" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX "agent_staff_staff_id_idx" ON "agent_staff_assignments" USING btree ("staff_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_staff_primary_unique" ON "agent_staff_assignments" USING btree ("agent_id") WHERE "is_primary" = true AND "is_active" = true;
--> statement-breakpoint

-- Create indexes for support_tickets
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "support_tickets_agent_id_idx" ON "support_tickets" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_staff_id_idx" ON "support_tickets" USING btree ("assigned_staff_id");
--> statement-breakpoint
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "support_tickets_visitor_token_idx" ON "support_tickets" USING btree ("visitor_token");
--> statement-breakpoint
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets" USING btree ("created_at");
--> statement-breakpoint

-- Create indexes for ticket_messages
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages" USING btree ("ticket_id");
--> statement-breakpoint
CREATE INDEX "ticket_messages_sender_type_idx" ON "ticket_messages" USING btree ("sender_type");
--> statement-breakpoint
CREATE INDEX "ticket_messages_created_at_idx" ON "ticket_messages" USING btree ("created_at");
--> statement-breakpoint

-- Create index for chat_sessions
CREATE INDEX "chat_sessions_support_ticket_id_idx" ON "chat_sessions" USING btree ("support_ticket_id");
--> statement-breakpoint

-- Add foreign keys (after tables are created)
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_staff_assignments" ADD CONSTRAINT "agent_staff_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_staff_id_staff_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "staff"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE cascade ON UPDATE no action;