CREATE TABLE "specials"."extraction_batch_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"venue_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	"custom_id" text NOT NULL,
	"source_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"include_menu_items" boolean NOT NULL,
	"fetch_tokens" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "specials"."extraction_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"anthropic_batch_id" text NOT NULL,
	"region_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "specials"."extraction_batch_items" ADD CONSTRAINT "extraction_batch_items_batch_id_extraction_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "specials"."extraction_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."extraction_batch_items" ADD CONSTRAINT "extraction_batch_items_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."extraction_batch_items" ADD CONSTRAINT "extraction_batch_items_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."extraction_batches" ADD CONSTRAINT "extraction_batches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE cascade ON UPDATE no action;