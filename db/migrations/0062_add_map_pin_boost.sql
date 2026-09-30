ALTER TABLE "specials"."venues" ADD COLUMN "map_pin_boosted_until" timestamp with time zone;--> statement-breakpoint
-- Placeholder pricing, same convention as 0020_curly_puppet_master.sql's seed for
-- featured/boost/category_sponsor -- the operator sets the real price before this
-- goes live for real purchases. Capped at 4 per region like featured, so a busy
-- region's map doesn't end up with every pin highlighted (defeats the point).
INSERT INTO "specials"."monetization_settings" ("product_type", "cap_count", "price_cents_per_day", "min_days", "max_days") VALUES
  ('map_pin', 4, 100, 1, 60);