CREATE TABLE "specials"."payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'cad' NOT NULL,
	"stripe_fee_cents" integer,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"stripe_object_id" text NOT NULL,
	"stripe_event_id" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"booking_id" integer,
	"booking_ids" text,
	"venue_id" integer,
	"related_payment_id" integer,
	"livemode" boolean NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "refunded_cents" integer;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "specials"."payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "specials"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."payments" ADD CONSTRAINT "payments_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_object_id_uniq" ON "specials"."payments" USING btree ("stripe_object_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "specials"."payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "payments_payment_intent_idx" ON "specials"."payments" USING btree ("stripe_payment_intent_id");