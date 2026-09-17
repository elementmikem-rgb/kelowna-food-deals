ALTER TABLE "specials"."bookings" ADD COLUMN "event_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "category_kind" text;--> statement-breakpoint
ALTER TABLE "specials"."category_sponsors" ADD COLUMN "kind" text DEFAULT 'special' NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "boosted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "specials"."events"("id") ON DELETE cascade ON UPDATE no action;