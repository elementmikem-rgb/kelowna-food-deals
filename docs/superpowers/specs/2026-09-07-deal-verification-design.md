# Deal Verification Design

## Goal

Give every special a trust signal beyond "an AI read this off a website once." Two independent, low-cost sources of human confirmation: the venue itself confirming its own listing is accurate, and site visitors crowdsourcing confirmation ("I was just here, this deal is real") or flagging one as wrong. Neither requires building a login system, a verifier workforce, or any new infrastructure beyond what this codebase already has proven patterns for.

## Background

Every special today carries `confidence` (AI extraction confidence), `lastVerifiedAt` (last time the cron re-confirmed the source page still shows this), and `sourceUrl` — but nothing that reflects a human, rather than an AI, having looked at it. The site's own value proposition already leans on "checked daily, not scraped" (see `app/layout.tsx`'s `generateMetadata`); this closes the gap between that promise and what visitors can actually see reflected in the UI.

## Non-goals

- No venue login/dashboard system — a one-time magic link per outreach email is sufficient (Section 2).
- No verification for `events` in this build — specials get the whole feature first; events can get the same treatment later if it proves valuable (events are a small fraction of traffic: 21 hits vs 433 for the homepage in the last 30 days).
- No auto-hiding of disputed specials — disputes surface to an admin queue, never remove content unilaterally (see Section 3's rationale).
- No verification expiry — a confirmation stays valid until the special itself changes or archives, not on a fixed timer.

## Section 1: Data model

**`specials` table** gains one nullable column:
```
venueConfirmedAt: timestamp with time zone, nullable
```
`null` means "never confirmed by the venue." This lives on `specials` the same way `lastVerifiedAt`/`archivedAt` already do. Because `cron/upsert.ts`'s `replaceVenueSpecials` keeps the same row (just updating `lastVerifiedAt`) when a special is unchanged night-to-night, and only creates a *new* row when the special's content actually changes, `venueConfirmedAt` naturally survives on an unchanged special and naturally resets to `null` on an edited one — no extra logic needed to implement the "stays valid until it changes" rule from the brainstorm.

**New table `special_feedback`:**
```
special_feedback
  id            serial primary key
  specialId     integer not null references specials.id
  kind          text not null   -- 'confirm' | 'dispute'
  createdAt     timestamp with time zone not null default now()
```
Counts are computed at read time (`count(*) where special_id = X and kind = 'confirm' and created_at > now() - interval '30 days'`) — no running totals to keep in sync, no risk of drift between a stored count and the underlying rows. The 30-day window keeps an old special's confirmation count from just accumulating forever and losing meaning; a dispute count has no time window since a real unresolved problem shouldn't silently age out of the admin queue.

Anti-spam is handled entirely by the existing `checkRateLimit` helper (Section 3), not by anything stored on this table — there's no fingerprint/hash column here, just a plain append-only log of who confirmed or disputed what and when.

## Section 2: Venue verification flow

A new signed-token helper, `buildVenueVerifyUrl(venueId, domain)` in `lib/venue-verify.ts`, follows the exact same HMAC pattern `lib/unsubscribe.ts`'s `buildUnsubscribeToken`/`buildUnsubscribeUrl` already use — token encodes the venue id, is scoped to that venue only (can't be reused to confirm a different venue's listings), and does not expire on a timer.

This link is added to the **existing outreach email** (`app/api/admin/outreach/send/route.ts` → `buildOutreachHtml`), right alongside the copy that already invites a venue to "verify their listing is accurate" — no new email campaign, just a second call-to-action in the email already being sent.

A new public route, `/verify/[token]`, resolves the token to a venue, loads that venue's current live (non-archived) specials, and renders each with a single "Yes, this is accurate" button. Clicking it POSTs to a new API route that verifies the token server-side (never trusting a client-supplied venue id) and sets `venueConfirmedAt = now()` on that specific special row. No login, no session, no dashboard.

## Section 3: Visitor confirm/dispute flow

Every rendered special gets two small controls: a confirm control ("Confirm this deal") and a dispute control ("Report inaccurate"), wherever specials already render (homepage, venue detail pages). Each posts to a new API route (`/api/specials/[id]/feedback`) that:

1. Checks the existing rate-limiting helper (`lib/request-rate-limit.ts`'s `checkRateLimit`, the same one already gating bookings/submissions). `checkRateLimit` takes a route-name string and buckets by the requester's IP internally — passing `` `special-feedback-${kind}-${specialId}` `` as that route name gives a natural "N times per IP per window, per special, per confirm-or-dispute" cap using the existing mechanism exactly as it already works elsewhere, with no new fingerprinting or hashing logic to write.
2. Inserts one row into `special_feedback` with `kind: 'confirm'` or `kind: 'dispute'`.

**Confirms** render as "Confirmed by N visitors" — omitted entirely when N is 0, rather than showing a discouraging "0 confirmations."

**Disputes never hide or remove anything.** This is a deliberate choice: an anonymous, unauthenticated flag is trivially weaponizable (a competitor, a prank, a confused visitor) if it can unilaterally take a real listing off the site. Instead, any special with one or more disputes appears in a new admin queue (Section 4) for a human to actually look at.

## Section 4: Display and admin visibility

**Public display**, per special card:
- `venueConfirmedAt` set → a "✓ Confirmed by venue" badge, styled to match the site's existing "Okanagan · verified" stamp treatment (the strongest, most visually prominent signal).
- One or more recent confirms → a lighter "Confirmed by N visitors" badge.
- Neither → no badge at all. An unverified special renders exactly as it does today; nothing about it is de-emphasized (per the brainstorm's explicit choice to avoid a two-tier visual hierarchy for v1).
- Both a venue confirmation and visitor confirmations can show simultaneously — they're independent signals, not merged into one score.

**New admin page, "Flagged specials"** (`app/admin/flagged/page.tsx`, added to the existing admin nav alongside Submissions/Outreach/Sponsored/Revenue/Analytics): lists every special with `>= 1` dispute row, sorted by dispute count descending, each with a one-click "Archive" (sets `archivedAt`, same mechanism the cron already uses to retire a special) or "Dismiss flags" (deletes the dispute rows without touching the special) action.

## Testing

- `buildVenueVerifyUrl`/its token verification get the same kind of direct unit-style script test the existing `unsubscribe`/`booking-token` signing code already has — this project favors one-off `scripts/tmp-test-*.mjs` verification scripts over a formal test runner (no `test` script exists in `package.json`), so a throwaway script proving sign→verify round-trips correctly, and that a token for venue A rejects when used to confirm venue B's specials, is sufficient.
- Rate limiting reuses already-tested infrastructure (`checkRateLimit`) — no new test coverage needed for that mechanism itself, just confirmation the new route calls it with a sane key/limit.
- The two new visitor-facing buttons and the admin queue get a manual Playwright check (click confirm, see the count increment; click dispute, see it land in the Flagged specials queue; visit `/verify/[token]` and confirm a special, see the badge appear) rather than an automated test suite, matching how UI changes have been verified elsewhere in this project this session.

## Open items carried forward, not blocking this build

- Whether to extend `venueConfirmedAt`/visitor feedback to `events` later — deferred, not in scope now.
- Whether disputes should ever influence anything automatically (e.g. de-prioritizing in sort order) beyond surfacing to the admin queue — deferred; start with the simplest version and revisit if the admin queue proves too slow to keep up with.
