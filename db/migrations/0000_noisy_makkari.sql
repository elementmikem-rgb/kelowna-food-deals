CREATE SCHEMA "specials";
--> statement-breakpoint
CREATE TABLE "specials"."scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_hash" text,
	"changed" boolean NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "specials"."specials" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price_cents" integer,
	"day_of_week" smallint,
	"start_time" time,
	"end_time" time,
	"category" text NOT NULL,
	"last_verified_at" timestamp with time zone NOT NULL,
	"source_url" text,
	"confidence" real DEFAULT 1 NOT NULL,
	"extraction_notes" text
);
--> statement-breakpoint
CREATE TABLE "specials"."venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"website" text,
	"menu_url" text,
	"instagram_handle" text,
	"source_urls" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."scrape_runs" ADD CONSTRAINT "scrape_runs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD CONSTRAINT "specials_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;