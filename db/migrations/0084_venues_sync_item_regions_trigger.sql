-- Applied to production by hand on 2026-11-22 (Mike approved the exact SQL). Safe to re-run: the function is
-- CREATE OR REPLACE and the trigger is dropped first if it exists.
-- When a venue's region changes, move its specials and events to the same region (they carry their own copy, and the
-- public events pages filter by it).
CREATE OR REPLACE FUNCTION specials.sync_item_regions() RETURNS trigger AS $$
BEGIN
  IF NEW.region_id IS DISTINCT FROM OLD.region_id THEN
    UPDATE specials.specials SET region_id = NEW.region_id WHERE venue_id = NEW.id;
    UPDATE specials.events   SET region_id = NEW.region_id WHERE venue_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS venues_sync_item_regions ON specials.venues;--> statement-breakpoint
CREATE TRIGGER venues_sync_item_regions
  AFTER UPDATE OF region_id ON specials.venues
  FOR EACH ROW EXECUTE FUNCTION specials.sync_item_regions();
