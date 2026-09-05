CREATE TABLE "specials"."menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer,
	"last_verified_at" timestamp with time zone NOT NULL,
	"source_url" text,
	"confidence" real DEFAULT 1 NOT NULL,
	"extraction_notes" text,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "specials"."submissions" ALTER COLUMN "submission_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."submissions" ADD COLUMN "resolved_item_keys" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."menu_items" ADD CONSTRAINT "menu_items_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;