ALTER TABLE "specials"."submissions" ALTER COLUMN "venue_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."submissions" ADD COLUMN "venue_name" text;--> statement-breakpoint
ALTER TABLE "specials"."submissions" ADD COLUMN "venue_address" text;