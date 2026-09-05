CREATE TABLE "specials"."venue_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"photo_data" text NOT NULL,
	"photo_mime_type" text NOT NULL,
	"caption" text,
	"submission_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."venue_photos" ADD CONSTRAINT "venue_photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venue_photos" ADD CONSTRAINT "venue_photos_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "specials"."submissions"("id") ON DELETE set null ON UPDATE no action;