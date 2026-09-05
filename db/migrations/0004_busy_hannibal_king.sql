CREATE TABLE "specials"."submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"submission_type" text NOT NULL,
	"raw_text" text,
	"photo_data" text,
	"photo_mime_type" text,
	"status" text DEFAULT 'needs_review' NOT NULL,
	"ai_extracted" jsonb,
	"ai_confidence" real,
	"ai_notes" text,
	"resulting_row_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "specials"."submissions" ADD CONSTRAINT "submissions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;