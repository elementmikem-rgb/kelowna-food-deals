CREATE TABLE "specials"."pending_booking_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"photo_data" text NOT NULL,
	"photo_mime_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
