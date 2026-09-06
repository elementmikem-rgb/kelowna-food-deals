ALTER TABLE "specials"."events" ADD COLUMN "region" text DEFAULT 'central-okanagan' NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "region" text DEFAULT 'central-okanagan' NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "region" text DEFAULT 'central-okanagan' NOT NULL;