ALTER TABLE "specials"."specials" ADD COLUMN "is_monthly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "archived_at" timestamp with time zone;