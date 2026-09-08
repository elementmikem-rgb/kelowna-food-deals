# Admin Inbox Feature Parity Design

## Goal

Bring the admin inbox (outreach email replies) up to feature parity with Photaro's more mature admin inbox: inline archive/delete, bulk actions, a status filter, mark unread, forward, block sender, an in-app unsubscribe action, and full attachment support (a venue replying with a photo of an updated menu board currently vanishes entirely — nothing captures it).

## Background

Photaro's admin inbox (`routes/admin/emailer.js`) supports: paginated list with inline archive/delete per row, bulk select, a status filter, a full action bar in the thread view (mark unread/handled, unsubscribe, archive, forward, block sender, delete), attachment download, and reply. Kelowna's current inbox (`components/InboxThreadList.tsx`, `components/InboxThread.tsx`) only supports: click-to-open threads, search by name/email/snippet, auto-mark-read on open, and reply. This spec closes that gap, scoped to what's genuinely useful at Kelowna's actual scale (see the earlier scoping conversation — bulk-select, forward, block-sender, and attachments were all confirmed in scope; a separate "Sent" tab and Photaro-style non-threaded pagination were explicitly rejected in favor of keeping Kelowna's existing unified-thread view, which is a better fit for this scale).

## Section 1: Schema changes

Three changes to `db/schema.ts`:

```typescript
// On inboundEmails, alongside the existing `read` column:
archivedAt: timestamp("archived_at", { withTimezone: true }), // null = active/inbox

// New table: tracks which sender addresses are blocked. Keyed by email, not
// venueId, because an inbound email's venueId can be null (no match found) --
// see app/api/webhooks/brevo-inbound/[token]/route.ts's fallback matching.
export const blockedSenders = specialsSchema.table("blocked_senders", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

// New table: attachment metadata + the base64-encoded file itself, following
// this codebase's existing pattern for stored images (submissions.photoData,
// venuePhotos.photoData) -- no external blob storage (B2/S3) exists in this
// project, and introducing one for a low-volume admin inbox isn't justified.
export const emailAttachments = specialsSchema.table("email_attachments", {
  id: serial("id").primaryKey(),
  inboundEmailId: integer("inbound_email_id")
    .notNull()
    .references(() => inboundEmails.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileData: text("file_data").notNull(), // base64
  sizeBytes: integer("size_bytes").notNull(),
});
```

A blocked sender's future inbound emails are still recorded (audit trail, and so a mistaken block can be reversed without losing history) but land pre-archived rather than in the active inbox — see Section 4.

## Section 2: Blocking a new inbound email from a blocked sender

`app/api/webhooks/brevo-inbound/[token]/route.ts` gains one check: after resolving `fromEmail`, look up `blockedSenders` by that email. If blocked, still insert the `inboundEmails` row (never silently drop real mail — an admin should be able to see what a blocked sender sent, in case blocking was a mistake) but set `archivedAt: new Date()` on insert so it doesn't appear in the active inbox or count toward the unread badge.

## Section 3: Attachment pipeline

Brevo's inbound webhook payload includes an `Attachments` array per item: `[{Name, ContentType, ContentLength, ContentID, DownloadToken}]`. The webhook does NOT include the file bytes — those require a separate authenticated GET to Brevo's own download endpoint using the `DownloadToken`.

In `app/api/webhooks/brevo-inbound/[token]/route.ts`, for each item's `Attachments` array (if present and non-empty):
1. For each attachment, call Brevo's download endpoint (`GET https://api.brevo.com/v3/inbound/attachments/{DownloadToken}`, header `api-key: ${process.env.BREVO_API_KEY}`) to fetch the raw bytes.
2. Reject/skip any attachment over 4MB (matching the existing cap in `app/api/submit/route.ts`'s `MAX_PHOTO_BYTES`, for consistent DB row size discipline) — log it, don't fail the whole webhook.
3. Base64-encode the bytes and insert one `emailAttachments` row per attachment, linked to the `inboundEmails` row just inserted in the same request.

This fetch happens inline in the webhook handler (Brevo already retries on non-2xx/timeout, and the existing duplicate-message-id check prevents double-processing on retry — an attachment fetch failure for one item shouldn't block the other items in the same webhook batch, so wrap each attachment fetch in its own try/catch and continue on failure).

A new route, `app/api/admin/inbox/attachments/[id]/route.ts`, serves a stored attachment: `isAdminAuthed` check, look up the row by id, return the decoded bytes with the stored `contentType` and `fileName` (as `Content-Disposition: inline` so images preview in-browser rather than force-downloading).

## Section 4: List view (`InboxThreadList.tsx`)

- **Status filter**: a `<select>` (All / Unread / Archived) next to the existing search box. "All" and "Unread" both exclude archived threads by default (matching the mental model that Archive means "out of my way"); "Archived" shows only archived ones. A thread counts as a single unit here (unread if any of its messages are unread, archived if its most recent message is archived — see Section 6 for exactly how threading intersects with per-message archive state).
- **Inline actions per row**: an Archive and a Delete button, visible on hover/always-visible on mobile (matching the same tap-target reasoning already applied to the specials/confirm buttons this session — real padding, not bare text). These act on every message in the thread, not just its most recent one — see Section 6 for why a partial-thread archive would be a real bug (an older unarchived message would keep pulling the thread back into the active inbox).
- **Bulk select**: a checkbox per row + "Select all shown", with a small action bar (Archive selected / Delete selected) that appears once at least one row is checked.

## Section 5: Thread view (`InboxThread.tsx`)

New action bar at the top of the thread (below the existing header, mirroring Photaro's row of buttons): **Mark unread**, **Archive**, **Delete**, **Forward**, **Unsubscribe** (only shown when the thread has a linked `venueId` — there's nothing to unsubscribe without one), **Block sender**.

- **Mark unread**: sets `read = false` on the thread's inbound messages. Existing auto-mark-read-on-open behavior is unchanged; this just lets an admin undo it.
- **Archive/Delete**: same actions as the list view's inline buttons, available from inside the thread too.
- **Forward**: opens a small inline form (to-email input + optional note), POSTs to a new route that sends a new outbound email quoting the original message body, reusing the existing `sendOutreachEmail`-style send path already used by `/api/admin/inbox/send`.
- **Unsubscribe**: a single confirm-and-click action (no form) that sets `venues.unsubscribedAt = now()` directly for the thread's linked venue — the same effect as the public unsubscribe link (`app/api/unsubscribe/route.ts`), but triggered directly by an authenticated admin rather than requiring a signed token, since the admin session itself is already the authentication.
- **Block sender**: inserts a `blockedSenders` row for the thread's `fromEmail` (or all distinct sender addresses in the thread, if more than one contributed inbound messages — rare, but a thread can technically span multiple reply-from addresses for the same venue).
- **Attachments**: each inbound message that has one or more `emailAttachments` rows renders a small file chip below its body (file name + size), linking to `/api/admin/inbox/attachments/[id]`. Image content-types render an inline thumbnail; anything else renders as a plain download link.

## Section 6: Threading and archive/read state

Per this codebase's existing thread model (`lib/inbox-data.ts`, not modified by this spec), a "thread" is a computed grouping of `inboundEmails` rows (by venue or by sender email) — there's no separate `threads` table. This means "archive this thread" is really "archive every message currently in it": the Archive/Delete/Mark-unread actions all operate on the full set of `inboundEmails` ids belonging to the thread (as already collected by the existing thread-loading query), not just the most recent message, so a thread doesn't reappear in the active inbox with an older still-unarchived message once its newest one is archived.

## Testing

- `blockedSenders` lookup in the webhook route and the attachment-fetch/skip-on-oversized-file logic get a throwaway verification script (this project's established pattern — no formal test runner), simulating a webhook payload with a >4MB attachment and confirming it's skipped while the message itself still saves.
- The attachment serve route gets a manual check: upload/receive a real small test image via a simulated webhook call, confirm `/api/admin/inbox/attachments/[id]` returns it with the right content-type.
- List/thread UI changes (filter, bulk actions, forward, block, unsubscribe) get manual Playwright/browser verification against a local dev server with real inbox data, matching how UI changes have been verified throughout this session — not a new automated suite.

## Out of scope

- A separate "Sent" tab or Photaro-style flat paginated list — Kelowna's unified per-thread view stays.
- Any change to the outbound outreach email flow itself (Task 8's region-aware outreach emails, the outreach send route) — this spec only touches the reply/inbox side.
- Retroactively fetching attachments for `inboundEmails` rows that already exist before this ships — only newly-arriving mail gets attachment capture from this point forward.
