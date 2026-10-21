ALTER TABLE "specials"."analytics_events" ADD COLUMN "visitor_city" text;--> statement-breakpoint
ALTER TABLE "specials"."analytics_events" ADD COLUMN "visitor_region" text;--> statement-breakpoint
ALTER TABLE "specials"."analytics_events" ADD COLUMN "visitor_distance_km" integer;
