-- Applied to production by hand on 2026-11-22 (Mike approved the exact SQL). Remembers which venue a sender address
-- belongs to. Safe to re-run.
CREATE TABLE IF NOT EXISTS specials.sender_aliases (
  id serial PRIMARY KEY,
  email text NOT NULL,
  venue_id integer NOT NULL REFERENCES specials.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sender_aliases_email_unique ON specials.sender_aliases (lower(email));
