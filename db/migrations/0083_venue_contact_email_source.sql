-- Applied to production by hand on 2026-11-22 (Mike approved the exact SQL). IF NOT EXISTS makes this file a safe
-- no-op if drizzle-kit migrate ever runs it against that database.
ALTER TABLE "specials"."venues" ADD COLUMN IF NOT EXISTS "contact_email_source" text;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN IF NOT EXISTS "contact_email_source_url" text;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN IF NOT EXISTS "contact_email_verified_at" timestamp with time zone;
