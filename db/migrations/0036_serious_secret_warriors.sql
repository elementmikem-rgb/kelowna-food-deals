CREATE TABLE "specials"."add_on_settings" (
	"add_on_type" text PRIMARY KEY NOT NULL,
	"price_cents_per_day" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "has_photo_add_on" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "photo_data" text;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "photo_mime_type" text;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "photo_data" text;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "photo_mime_type" text;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "photo_data" text;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "photo_mime_type" text;