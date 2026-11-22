# Keep specials and events in the same region as their venue (trigger draft, NOT APPLIED)

Drafted 2026-11-22 for Mike's review. Nothing here has been run.

## Why

Each special and event carries its own copy of a region. The public events pages filter by that copy, so when a venue is moved to another region, its events must move too. The app has no code that moves a venue (it is done by scripts or direct SQL), so app code cannot prevent drift. On 2026-11-22 we found and fixed 929 specials and 174 events across 29 venues that had drifted. A trigger makes it impossible.

## The SQL

```sql
CREATE OR REPLACE FUNCTION specials.sync_item_regions() RETURNS trigger AS $$
BEGIN
  IF NEW.region_id IS DISTINCT FROM OLD.region_id THEN
    UPDATE specials.specials SET region_id = NEW.region_id WHERE venue_id = NEW.id;
    UPDATE specials.events   SET region_id = NEW.region_id WHERE venue_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_sync_item_regions
  AFTER UPDATE OF region_id ON specials.venues
  FOR EACH ROW EXECUTE FUNCTION specials.sync_item_regions();
```

- Fires only when a venue's `region_id` actually changes. It updates that one venue's specials and events and nothing else.
- Adds no cost to normal scraping or page loads.
- Does not touch `submissions`, `extraction_batch_items` or `chat_term_sponsors`, which also carry a region.
- Rollback: `DROP TRIGGER venues_sync_item_regions ON specials.venues; DROP FUNCTION specials.sync_item_regions();`

## Also in place

The admin Scrape health page shows a "Region tags" line that says "in sync" or lists any drift (lib/region-drift.ts).
The old tags from the 2026-11-22 sync are saved in `C:\Users\Mike\region-tag-sync-backup-2026-11-22.json` (to undo: set `region_id = old_region_id` by id).
