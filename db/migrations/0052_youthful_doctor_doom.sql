ALTER TABLE "specials"."venue_owners" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "specials"."venue_owners" ADD COLUMN "password_set_at" timestamp with time zone;