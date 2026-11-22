-- Applied to production by hand on 2026-11-22 (Mike approved the exact SQL). IF NOT EXISTS makes this file a safe
-- no-op if drizzle-kit migrate ever runs it against that database.
CREATE TABLE IF NOT EXISTS "specials"."inbox_proposals" (
  "id" serial PRIMARY KEY NOT NULL,
  "inbound_email_id" integer NOT NULL,
  "venue_id" integer,
  "status" text DEFAULT 'pending' NOT NULL,
  "intent" text NOT NULL,
  "confidence" text NOT NULL,
  "proposal" jsonb NOT NULL,
  "error" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "decided_at" timestamp with time zone,
  CONSTRAINT "inbox_proposals_inbound_email_id_unique" UNIQUE ("inbound_email_id"),
  CONSTRAINT "inbox_proposals_status_check" CHECK ("status" IN ('pending','applied','dismissed','failed'))
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "specials"."inbox_proposals" ADD CONSTRAINT "inbox_proposals_inbound_email_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "specials"."inbound_emails"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "specials"."inbox_proposals" ADD CONSTRAINT "inbox_proposals_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_proposals_pending_idx" ON "specials"."inbox_proposals" ("venue_id") WHERE "status" = 'pending';
