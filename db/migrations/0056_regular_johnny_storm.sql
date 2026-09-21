CREATE TABLE "specials"."credit_bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"credits" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- Placeholder tiers, same posture as monetization_settings' seed in 0020 -- the
-- operator sets real numbers before this goes live. Par value at the smallest tier
-- (no bonus), an increasing bonus at the larger tiers to reward buying more upfront.
INSERT INTO "specials"."credit_bundles" ("name", "price_cents", "credits", "sort_order") VALUES
  ('Starter', 10000, 100, 0),
  ('Growth', 25000, 275, 1),
  ('Pro', 50000, 600, 2);
