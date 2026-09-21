CREATE TABLE "specials"."credit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"related_booking_id" integer,
	"stripe_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "credits_spent_cents" integer;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."credit_ledger" ADD CONSTRAINT "credit_ledger_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."credit_ledger" ADD CONSTRAINT "credit_ledger_related_booking_id_bookings_id_fk" FOREIGN KEY ("related_booking_id") REFERENCES "specials"."bookings"("id") ON DELETE set null ON UPDATE no action;