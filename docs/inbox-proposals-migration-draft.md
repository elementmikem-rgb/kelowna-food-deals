# Inbox proposals table (NOT APPLIED)

Drafted 2026-11-22 for Mike's review. Nothing here has been run.

One row per venue reply that the local `claude -p` script has read. A proposal never changes a listing or sends an email by itself: it only waits in the admin inbox for Mike's click.

```sql
CREATE TABLE specials.inbox_proposals (
  id               serial PRIMARY KEY,
  inbound_email_id integer NOT NULL UNIQUE REFERENCES specials.inbound_emails(id) ON DELETE CASCADE,
  venue_id         integer REFERENCES specials.venues(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'applied', 'dismissed', 'failed')),
  intent           text NOT NULL,
  confidence       text NOT NULL,
  proposal         jsonb NOT NULL,
  error            text,
  attempts         integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz
);

CREATE INDEX inbox_proposals_pending_idx ON specials.inbox_proposals (venue_id) WHERE status = 'pending';
```

- `UNIQUE (inbound_email_id)` means a reply is read at most once, so a re-run can never create a second proposal or spend a second model call on it.
- `ON DELETE CASCADE` means deleting a conversation also removes its proposal.
- `proposal` holds the validated JSON (special, phone, draft reply, language). `error` and `attempts` are only for a failed read, retried at most 3 times.
- New table, empty at the start, nothing existing touched. Rollback: `DROP TABLE specials.inbox_proposals;`
