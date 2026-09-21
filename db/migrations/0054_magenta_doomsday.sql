ALTER TABLE "specials"."bookings" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "specials"."bookings" ADD COLUMN "auto_renew" boolean DEFAULT false NOT NULL;