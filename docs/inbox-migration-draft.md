# Inbox migration draft (NOT APPLIED)

Status: drafted 2026-11-22 for Mike's review. Nothing here has been run, and no file under db/migrations has been created. Both changes are additive: new table, new column with a default. No existing rows are rewritten and nothing is dropped.

## 1. Stars, snooze and status per conversation

One row per conversation (thread key as used in /admin/inbox/t/<key>, for example `v4828` or `u<encoded email>`). A conversation with no row is simply not starred, not snoozed, no status. So the table starts empty and existing inbox behaviour is unchanged.

```sql
CREATE TABLE specials.inbox_thread_state (
  thread_key    text PRIMARY KEY,
  starred       boolean NOT NULL DEFAULT false,
  snoozed_until timestamptz,
  status        text CHECK (status IN ('new', 'interested', 'waiting', 'needs_update', 'done')),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inbox_thread_state_snoozed_idx
  ON specials.inbox_thread_state (snoozed_until)
  WHERE snoozed_until IS NOT NULL;
```

Drizzle definition to add to db/schema.ts:

```ts
export const inboxThreadState = specialsSchema.table("inbox_thread_state", {
  threadKey: text("thread_key").primaryKey(),
  starred: boolean("starred").notNull().default(false),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  status: text("status").$type<"new" | "interested" | "waiting" | "needs_update" | "done">(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Powers: Starred and Snoozed folders, the star on each row, "remind me if no reply", and the status pills.

Rollback: `DROP TABLE specials.inbox_thread_state;` (loses only stars, snoozes and statuses).

## 2. Soft-bounce counter (so we can stop mailing a mailbox that keeps failing)

```sql
ALTER TABLE specials.outreach_sends
  ADD COLUMN soft_bounce_count integer NOT NULL DEFAULT 0;
```

Drizzle: `softBounceCount: integer("soft_bounce_count").notNull().default(0)` on outreachSends.

Rule once it exists: increment on each Brevo soft_bounce event; at 3, treat the send as bounced. Today soft bounces are ignored.

Rollback: `ALTER TABLE specials.outreach_sends DROP COLUMN soft_bounce_count;`

## How it would be applied

Run against the production Postgres only after Mike says yes, using the exact SQL above (not `drizzle-kit migrate` blind, per Mike's rule), then add the matching file to db/migrations and the schema.ts change in the same commit, and deploy outside 13:00 to 16:00 UTC. Both statements take a brief lock on a small table or add a defaulted column; no downtime expected.
