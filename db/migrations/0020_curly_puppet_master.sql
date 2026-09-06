CREATE TABLE "specials"."bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_type" text NOT NULL,
	"venue_id" integer,
	"special_id" integer,
	"category" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"reserved_until" timestamp with time zone,
	"price_cents" integer NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"buyer_email" text NOT NULL,
	"buyer_verified_at" timestamp with time zone,
	"refund_needed" boolean DEFAULT false NOT NULL,
	"conflict_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "specials"."monetization_settings" (
	"product_type" text PRIMARY KEY NOT NULL,
	"cap_count" integer,
	"price_cents_per_day" integer NOT NULL,
	"min_days" integer NOT NULL,
	"max_days" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD CONSTRAINT "bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD CONSTRAINT "bookings_special_id_specials_id_fk" FOREIGN KEY ("special_id") REFERENCES "specials"."specials"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "specials"."monetization_settings" ("product_type", "cap_count", "price_cents_per_day", "min_days", "max_days") VALUES
  ('featured', 4, 100, 1, 60),
  ('boost', NULL, 100, 1, 60),
  ('category_sponsor', 1, 100, 7, 90);