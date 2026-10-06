CREATE TABLE "specials"."bundle_discount_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_venues" integer NOT NULL,
	"discount_percent" integer NOT NULL
);
