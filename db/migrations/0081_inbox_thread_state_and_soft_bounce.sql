-- Applied to production by hand on 2026-11-22 (Mike approved the exact SQL). IF NOT EXISTS makes this
-- file a safe no-op if drizzle-kit migrate ever runs it against that database.
CREATE TABLE IF NOT EXISTS "specials"."inbox_thread_state" (
  "thread_key" text PRIMARY KEY NOT NULL,
  "starred" boolean DEFAULT false NOT NULL,
  "snoozed_until" timestamp with time zone,
  "status" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inbox_thread_state_status_check" CHECK ("status" IN ('new','interested','waiting','needs_update','done'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_thread_state_snoozed_idx" ON "specials"."inbox_thread_state" ("snoozed_until") WHERE "snoozed_until" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."outreach_sends" ADD COLUMN IF NOT EXISTS "soft_bounce_count" integer DEFAULT 0 NOT NULL;
