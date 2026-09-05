ALTER TABLE "specials"."events" ALTER COLUMN "venue_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "location_address" text;