CREATE TABLE "specials"."chat_term_sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"term" text NOT NULL,
	"venue_id" integer NOT NULL,
	"price_cents_per_day" integer NOT NULL,
	"until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."chat_term_sponsors" ADD CONSTRAINT "chat_term_sponsors_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."chat_term_sponsors" ADD CONSTRAINT "chat_term_sponsors_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;