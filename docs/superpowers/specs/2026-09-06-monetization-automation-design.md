# Monetization Automation — Design

**Date:** 2026-09-06
**Status:** Approved for planning
**Scope:** Self-serve purchase (Stripe) for Featured Placement, Seasonal Boost, and Category
Sponsorship, with admin approval still required before anything goes live, and slot/date-range
conflict checking so paid placements can't oversell.

## Background

Phase 1 and Phase 2 of monetization (see `project_kelowna_specials_ui_audit.md` in the operator's
memory) built Featured Placement, Seasonal Boost, Verified Partner, and Category Sponsorship as
admin-toggled features — every activation is a manual click in `/admin/sponsored`, and every sale
is a manual conversation. This spec covers turning that into a self-serve flow: a venue owner
finds their venue on the public site, buys a placement directly, and it enters an admin approval
queue before going live. Admin approval is preserved by explicit request — this automates the
sales/payment/inventory mechanics, not the judgment call of whether a listing should run.

## Explicit scope decisions (from brainstorming)

- **Self-serve, not admin-mediated**: the buyer completes checkout on the public site without a
  human sending them a payment link.
- **Verified Partner is out of scope.** It remains a standing relationship tier the admin grants by
  hand after an actual conversation, not a purchasable line item. This spec covers Featured, Boost,
  and Category Sponsorship only.
- **Featured is capped** (configurable slot count); **Boost is uncapped**; **Category Sponsorship**
  keeps its existing 1-per-category rule. Caps are read from a settings table, not hardcoded.
- **Pay first, then admin approves.** Payment reserves the slot; the placement doesn't go live
  until approved. Rejections are flagged for a manual refund — nothing refunds automatically.
- **Pricing and caps are admin-configurable**, seeded with placeholder values. No dollar amount or
  cap number in this spec is a real business decision — those are the operator's to set before
  launch.
- **Lightweight email verification** (magic link) confirms the buyer controls the email they enter,
  without building a full venue-owner account/login system.
- **Future date-range booking (calendar model)**, not "available now only" — a buyer can book a
  slot to start once the current occupant's run ends, and the system checks for date-range overlap
  rather than just current-moment availability.

## Data model

### `bookings` (new table, in the `specials` Postgres schema)

| column | type | notes |
|---|---|---|
| `id` | serial PK | |
| `productType` | text, `'featured' \| 'boost' \| 'category_sponsor'` | |
| `venueId` | integer, nullable, FK → `venues.id` | set for `featured`; null for `category_sponsor`; set (to the special's venue) for `boost` |
| `specialId` | integer, nullable, FK → `specials.id` | only for `boost` |
| `category` | text, nullable | only for `category_sponsor` |
| `startDate`, `endDate` | date | the requested/booked range |
| `status` | text, `'pending_payment' \| 'pending_approval' \| 'approved' \| 'rejected' \| 'expired'` | |
| `reservedUntil` | timestamptz, nullable | only meaningful while `status = 'pending_payment'`; the checkout hold expiry |
| `priceCents` | integer | snapshot of what was actually charged, independent of later settings changes |
| `stripeSessionId`, `stripePaymentIntentId` | text | |
| `buyerEmail` | text | |
| `buyerVerifiedAt` | timestamptz, nullable | |
| `refundNeeded` | boolean, default false | set on rejection; cleared once the admin marks the refund done |
| `conflictDetected` | boolean, default false | set by the webhook if payment succeeded but the dates now conflict with an approved booking made in the interim (see Error handling) — surfaced in the admin queue for manual resolution |
| `createdAt`, `reviewedAt` | timestamptz | |

`expired` is the terminal status for a `pending_payment` row whose hold lapsed without payment —
written lazily (see below), not by a cleanup job.

### `monetization_settings` (new table)

| column | type | notes |
|---|---|---|
| `productType` | text PK, `'featured' \| 'boost' \| 'category_sponsor'` | |
| `capCount` | integer, nullable | null = uncapped (`boost`) |
| `priceCentsPerDay` | integer | |
| `minDays`, `maxDays` | integer | bounds on a single booking's length |

Seeded with placeholder values at migration time (`featured` cap 4, `category_sponsor` cap 1,
`boost` cap null; all prices an obviously-fake placeholder). Editable from a new "Settings" panel
in `/admin/sponsored`, plain number inputs following the existing panel pattern.

### No changes to existing tables

`venues.featuredUntil`, `venues.partnerSince`, `specials.boostedUntil`, and `categorySponsors`
are untouched. They remain the "what's live right now" cache every existing render path already
reads (`SpecialsBoard.tsx`, `SpecialVenueGroup.tsx`, `isPromotionActive()`, `getActiveCategorySponsors()`,
etc.) — none of that code changes. A daily sync job (below) is the only thing that writes to them
going forward, alongside the existing manual admin panels, which keep working exactly as they do
today for anything not going through self-serve purchase.

## Conflict checking

Only `featured` and `category_sponsor` are capped, so only they run a conflict check. `boost` skips
straight to "is this special real and does it belong to a real venue" and then checkout.

A booking counts as **occupying** a date range if its status is:
- `approved`, or
- `pending_approval`, or
- `pending_payment` with `reservedUntil` still in the future (a checkout in progress).

A `pending_payment` row whose `reservedUntil` has passed does **not** count — this is a plain
`WHERE` clause on the availability query, not a background cleanup job, so there is nothing to
schedule for expiry. (A stale row is left in the table with status still nominally
`pending_payment`; the next write that touches it — a later booking attempt for the same
slot finding it stale, or a periodic light query — flips it to `expired` for bookkeeping, but its
presence never affects correctness because the availability query already ignores it by the
`reservedUntil` filter.)

**Availability check** (for `featured`/`category_sponsor`): count occupying bookings whose
`[startDate, endDate]` overlaps the requested range (for `category_sponsor`, further filtered to
the same `category`); for `featured`, filtered to `productType = 'featured'` venue-agnostically
(the cap is site-wide, not per-venue). If the count is `>= capCount`, reject with "not available
for those dates."

**Race-condition prevention**: the availability check and the creation of the `pending_payment` row
happen inside a single database transaction with a row lock (mirroring the existing pattern already
used in `app/api/admin/submissions/[id]/route.ts`'s `for("update")` transaction) — two buyers hitting
checkout for the same last slot at the same moment can't both pass the check and both insert. Only
one gets the `pending_payment` row; the other gets "not available" and is asked to pick different
dates.

This check runs twice: once as a live courtesy check while the buyer is picking dates (client asks
"is this range free?", shown inline), and again — authoritatively, inside the transaction — at the
moment they submit and a Checkout session is created. The first is UX; only the second is trusted.

## Purchase flow (public, on `/advertise`)

Each of the three product cards on the existing `/advertise` page gets a "Get started" action that
expands an inline flow, reusing the existing venue-search component pattern from `SubmitForm.tsx`:

1. **Pick venue** — typeahead against `venues`.
2. **Product-specific detail** — `featured`: nothing extra. `boost`: pick which of *that venue's*
   specials to boost. `category_sponsor`: pick the category.
3. **Pick date range** — bounded by `minDays`/`maxDays` from settings. For capped products, the
   live courtesy availability check runs here and shows "sold out for those dates" inline if the
   range conflicts.
4. **Email verification** — buyer enters a business email; the server sends a magic link (via
   Brevo, matching the existing transactional-email pattern) valid ~15 minutes. Because this step
   requires leaving the page, the in-progress selection (venue/product/dates) is carried in a
   short-lived signed token in the magic link's return URL — not a session — so clicking it resumes
   the flow at step 5 without re-entering everything.
5. **Checkout** — server re-runs the authoritative availability check inside the transaction,
   creates the `pending_payment` booking and a Stripe Checkout session, redirects to Stripe.
6. **Return** — Stripe redirects to a confirmation page: "Payment received — pending review, you'll
   hear from us within a day or two." Nothing is live yet.

## Stripe webhook & fulfillment

New route `app/api/webhooks/stripe/route.ts`, verifying Stripe's signature via
`stripe.webhooks.constructEvent` (Stripe's standard HMAC scheme — a different mechanism from the
existing token-in-URL pattern used by `api/webhooks/brevo-inbound/[token]`, but the same "one
route per external event source" shape). Handles `checkout.session.completed`: looks up the
booking by `stripeSessionId`, and if its status is still `pending_payment`, flips it to
`pending_approval` and notifies the admin (reusing the existing admin-inbox/notification path) so
the queue doesn't depend on remembering to check it. Idempotent: if Stripe retries the event,
finding the row already past `pending_payment` is a no-op.

## Admin approval queue

New "Pending Bookings" panel in `/admin/sponsored`, listing `pending_approval` rows — venue name,
product, dates, price paid, buyer email — with two actions:

- **Approve** → status `approved`. If `startDate <= today <= endDate`, activates immediately by
  writing straight into the existing live columns (`featuredUntil`, `boostedUntil`, or
  `categorySponsors`), exactly like the current manual panels do. If it starts in the future, the
  daily sync job (below) activates it on `startDate`.
- **Reject** → status `rejected`, `refundNeeded = true`. Surfaces in a "Refunds needed" list
  showing the Stripe payment ID and buyer email for the admin to refund by hand in Stripe's own
  dashboard. Nothing is charged back automatically. The admin can mark `refundNeeded = false` once
  handled.

## Daily sync job

One function, invoked by the existing Railway cron service (already runs daily): for every
`approved` booking, if `startDate <= today <= endDate` and the corresponding live column isn't yet
set to match, write it; if `endDate < today` and the live column still reflects this booking,
clear it. This is the only new scheduled job in the system — the availability check, checkout, and
webhook are all request-time.

## Error handling & edge cases

- **Stale checkout link**: if a buyer returns to a Checkout session after their `reservedUntil` has
  passed (e.g. abandoned tab, came back an hour later) and someone else has since taken the slot,
  Stripe's own session either has already expired (Checkout sessions have their own TTL, set to
  match the 15-minute hold) or completes but the webhook finds the booking's dates now conflict
  with an approved booking made in the interim — in that case the webhook still marks it
  `pending_approval` (payment succeeded, can't be silently dropped) but flags a `conflictDetected`
  note for the admin to see and resolve manually (reject + refund, or negotiate different dates)
  rather than the system silently double-booking.
- **Email verification link reused/expired**: standard short-lived signed token, checked for
  expiry and single-use; an expired link sends the buyer back to step 3 to restart (their date
  selection may have gone stale anyway, so this is the safe default, not a shortcut).
- **Buyer never completes email verification or checkout**: the `pending_payment` row simply stops
  counting toward availability once `reservedUntil` passes (see conflict checking above) — no
  cleanup action required for correctness.

## Explicitly out of scope

- Verified Partner self-serve purchase (stays admin-only, per decision above).
- Automatic Stripe refunds (manual, per decision above).
- A venue-owner login/account system (email verification per booking, not a persistent account).
- Buyer-initiated cancellation or rescheduling of an existing booking (the admin can still clear a
  live placement manually via the existing panels; a buyer wanting to cancel emails/contacts the
  operator, same as today).
- A public availability calendar UI (the live courtesy check only reports "available" / "not
  available for these dates," not a full calendar view — could be added later if buyers want to
  browse open ranges before picking a date).

## Testing plan

- Unit-level: availability-check query logic (occupying-status filter, overlap logic, cap
  comparison) against seeded fixture bookings — covers the no-conflict, exact-cap-reached, and
  expired-hold-doesn't-count cases.
- Integration: the transactional reserve-on-checkout path, specifically the race condition —
  simulate two concurrent requests for the last slot and confirm exactly one succeeds.
- Manual/live verification (matching this project's established pattern): a real end-to-end
  purchase through Stripe's test mode, including the webhook firing and the admin queue reflecting
  it, plus a rejection flow confirming `refundNeeded` surfaces correctly — checked against the live
  Railway deployment before considering this done, consistent with how every other feature in this
  project has been verified this session.
