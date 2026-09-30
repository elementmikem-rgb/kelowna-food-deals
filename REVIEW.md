# TodaysTab Uber-Review: 2026-09-30 (8 commits, 102 files)

## 1. Executive Summary

Nothing in today's feature work breaks the three core invariants: claim approval before login, verbatim-quote extraction, and owner scoping to `session.venueIds`. There are no critical findings. There are two HIGH findings:
- A rejected auto-renew booking keeps billing the customer every month, and nothing in the code cancels it.
- One out-of-range date or time from extraction can crash the nightly cron again every night for up to about 29 days.

Most of the risk is in the new owner-cart, Stripe webhook and flash-special/push code. Holds can be abused, sponsor activation deletes other sponsors' rows, one-time payments are fulfilled without checking `payment_status`, pushes are not rate-limited, and the push endpoint allowlist added today can be bypassed. Revenue reporting is also wrong in both directions.

## 2. Finding Count

The run produced 54 verified entries. 10 of them were duplicates and are merged below, which leaves **44 unique findings**. The Devil's Advocate pass dismissed 4 more as false positives.

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 16 |
| LOW | 26 |
| **Total** | **44** |

The previous review (2026-09-05, full scope) had 69 findings: 2 critical, 16 high, 29 medium and 22 low. This run covers only today's 8 commits, so the numbers are not directly comparable.

## 3. Findings

### HIGH

| ID | Severity | File:Line | Issue | Confidence | Est. Fix Time |
|---|---|---|---|---|---|
| H1 | HIGH | cron/index.ts:494 | One bad extracted row crashes the cron on every run until the batch expires (up to about 29 days) | High | 2-3h |
| H2 | HIGH | lib/bookings-data.ts:248 | Rejecting an auto-renew booking never cancels its Stripe subscription | High | 3-4h |

**H1: `applyBatchItemResult` has no error isolation, so a poison batch loops the crash.**
- **Problem:** `cron/extract.ts` validates times and dates by format only (regex). Values like `start_time '25:00'` or `specific_date '2026-09-31'` pass validation, then Postgres rejects them on insert. Nothing catches that error, so the whole process exits.
- **Why it repeats:** the batch item stays `pending`. The next run calls `resolvePendingBatches(0)` first (index.ts:689) and crashes on the same item before scraping any region.
- **What gets skipped each night:** `syncBookings`, monthly archival and the Monday digests.
- **Precedent:** the NUL-byte incident on 2026-09-28 was the same class of crash.
- **Fix:**
  1. Write a failing test first that feeds `start_time: "25:00"` through the apply path.
  2. Wrap each `applyBatchItemResult` call (index.ts:537) in try/catch. On failure, call `markExtractionBatchItemDone(item.id, "failed")` with the error, log a failed scrape run, and continue.
  3. Tighten the zod schemas in `cron/extract.ts`. For times, refine to hours 00-23 (or exactly `24:00:00`) and minutes/seconds 00-59. For dates, refine with `new Date(s + "T00:00:00Z").toISOString().startsWith(s)` so impossible dates are rejected. Drop invalid rows at extraction, the same way specials without a verbatim quote are dropped.
  4. Optionally, run `syncBookings` in its own try block before the scrape cycle so scraper failures cannot block booking activation.

**H2: `rejectBooking` never cancels the subscription, and refunds can't be traced to it.**
- **Problem:** `rejectBooking` only sets `status='rejected'` and `refundNeeded=true`. Nothing in the repo calls `subscriptions.cancel` or `refunds.create`.
- **Refund queue shows nothing useful:** for `mode:"subscription"` sessions, `session.payment_intent` is null. The refund queue therefore shows "payment intent: unknown", and `getRefundsNeeded` never selects `stripeSubscriptionId`.
- **Renewals are invisible:** `handleInvoicePaid` ignores non-approved rows and only calls `console.error`. MRR filters on `approved`, so a rejected booking that is still billing never shows in the admin app.
- **Fix** (touches the payment flow, so it needs your explicit yes first):
  1. After the reject transaction commits, if `booking.stripeSubscriptionId` is set, call `getStripe().subscriptions.cancel(id)`. Store the result, or set a `subscriptionCancelledAt` column.
  2. Add `stripeSubscriptionId` to the `getRefundsNeeded` select and to `RefundsNeededPanel`. For subscription bookings, resolve the refundable charge via `invoices.list({ subscription })` and use the latest invoice's `payment_intent`.
  3. In `handleInvoicePaid`, when the matched booking is not `approved`, cancel the subscription and email the admin instead of only logging.
  4. Write a failing test for "reject auto-renew booking triggers cancel" before making the change.

### MEDIUM

| ID | Severity | File:Line | Issue | Confidence | Est. Fix Time |
|---|---|---|---|---|---|
| M1 | MEDIUM | app/api/owner/cart-checkout/route.ts:313 | Subscription Checkout Session has no `expires_at`, so it outlives the 30-min hold | High | 30m |
| M2 | MEDIUM | app/api/owner/cart-checkout/route.ts:251 | An owner can hold every capped slot in their region for free by abandoning carts | High | 2-3h |
| M3 | MEDIUM | app/api/webhooks/stripe/route.ts:72 (also :178) | Bookings and credits are fulfilled without checking `payment_status`, and async payment events are not handled | Medium | 2-3h |
| M4 | MEDIUM | lib/bookings-data.ts:216 (also :199) | Chat-term activation hard-deletes other venues' live sponsor rows and revenue history | High | 3h |
| M5 | MEDIUM | lib/bookings-data.ts:190 (also :199) | Category-sponsor activation replaces sponsors an admin set by hand, and capacity checks never see them | High | 2-3h |
| M6 | MEDIUM | app/api/events/[id]/interest/route.ts:20 | Public interest/confirm counts can be inflated by spoofing X-Forwarded-For; `rate_limits` is never pruned | Medium | 2-3h |
| M7 | MEDIUM | cron/index.ts:647 | Weekly digest has no send-once guard; every local Monday run emails all owners on the platform | High | 1-2h |
| M8 | MEDIUM | cron/index.ts:631 | The cron's advisory lock is lost silently after the pool's 30-60 min connection lifetime | High | 1h |
| M9 | MEDIUM | lib/revenue-data.ts:84 | Credit-paid bookings count as revenue, and bundle/cart cash is also counted as "tips" | High | 2h |
| M10 | MEDIUM | lib/revenue-data.ts:75 | Auto-renew revenue after the first month is never recorded | High | 3h |
| M11 | MEDIUM | scripts/send-credit-nudge.ts:70 | Credit nudge emails owners who unsubscribed (CASL exposure) | High | 15m |
| M12 | MEDIUM | scripts/send-credit-nudge.ts:104 | Nudge keeps no send record, so a re-run sends duplicates and Brevo events are dropped | High | 1-2h |
| M13 | MEDIUM | app/api/owner/flash-special/route.ts:104 (also :66) | An owner can repeat post/end/post to send unlimited high-urgency pushes to a whole region | High | 2h |
| M14 | MEDIUM | app/api/push/subscribe/route.ts:33 (also :36) | Junk push subscriptions are accepted and never pruned; a bad `regionId` returns 500 | High | 1-2h |
| M15 | MEDIUM | lib/push-send.ts:29 | "Never throws" is false, there is no send timeout, a missing VAPID config fails silently, and today's endpoint allowlist can be bypassed | High | 2-3h |
| M16 | MEDIUM | lib/map-data.ts:67 | Expired flash specials show on the map every day, forever | High | 1-2h |

**M1: subscription sessions outlive the hold.**
- **Problem:** the payment branch (route.ts:350) sets `expires_at` to the hold plus a margin. The subscription branch does not, so Stripe's 24h default applies.
- **Result:** after 30 minutes the hold stops counting and the slot can be resold. The owner can still pay hours later, which starts a live recurring subscription on a booking flagged `conflictDetected`.
- **Fix:** add `expires_at: Math.ceil((now + HOLD_MS + STRIPE_EXPIRY_MARGIN_MS) / 1000)` to the `mode:"subscription"` create call at :313. Also add a `checkout.session.expired` webhook case that sets that session's `pending_payment` rows to `expired`.

**M2: hold griefing.**
- **Problem:** each unpaid cart submit creates up to 10 `pending_payment` holds, each lasting 30 minutes. There is no per-owner cap. The only limit is 10 requests per 60 minutes, keyed by the leftmost X-Forwarded-For IP.
- **Precedent:** the anonymous flow (`bookings/checkout/route.ts:122-163`) already guards against exactly this.
- **Fix:**
  1. Inside the existing advisory-locked transaction, before inserting, retire this owner's own live holds by setting `status='expired'` on `pending_payment` rows where `venueId IN session.venueIds AND reservedUntil > now`. This mirrors the anonymous flow and also fixes the owner getting a 409 from their own stale hold (L2).
  2. Reject the cart if the owner would hold more than N live slots per capped product.
  3. Key the rate limit on `session.venueOwnerId` instead of IP.

**M3: fulfillment without confirmed payment.**
- **Problem:** the cart/booking path and the credit-bundle path act on `checkout.session.completed` without checking `payment_status`. `async_payment_succeeded` and `async_payment_failed` are not handled. No session sets its payment methods explicitly, so the Dashboard decides which ones appear.
- **Current exposure:** a read-only check of the test-mode config shows `acss_debit` is off (card, Link, Klarna, Affirm, wallets). Live mode was not checked.
- **Fix** (touches payments, so it needs your yes first):
  1. Add `payment_status` to `CheckoutSessionLike`.
  2. In both paths, fulfill only when `payment_status === "paid"`, or `"no_payment_required"` where that applies.
  3. Route `checkout.session.async_payment_succeeded` to the same fulfillment. The existing idempotency lookup makes this safe once L16 is fixed.
  4. On `checkout.session.async_payment_failed`, mark the bookings `expired`.
  5. Belt and braces: pass `excluded_payment_method_types: ["acss_debit"]` on all five `sessions.create` calls.

**M4: chat-term activation deletes rows it doesn't own.**
- **Problem:** the delete's `scope` is region plus `lower(term)` with no filter on `until` or venue. It deletes other venues' active rows and every soft-expired history row, even though the admin route deliberately preserves those for revenue.
- **Blind spots:**
  - `checkAvailability` never queries `chatTermSponsors`.
  - The admin cannot see which term a booking is for (`PendingBookingsPanel` never shows `chatTerm`).
  - The nightly `syncBookings` can evict a sponsor the admin sold by hand with no human involved.
- **Fix:**
  1. Replace the delete at :216 with a soft-expire (`set({ until: now })`) restricted to rows where `venueId = booking.venueId AND until > now`.
  2. If a live row for a different venue exists, skip activation and flag the booking (`conflictDetected = true`) instead of overwriting.
  3. Make `getOccupyingBookings`/`checkAvailability` also count live `chatTermSponsors` rows (`until > startDate`) toward the cap.
  4. Show `chatTerm` in `PendingBookingsPanel`.

**M5: category-sponsor activation overwrites hand-set sponsors.**
- **Problem:** activation deletes and re-inserts whenever the name, URL or coverage differs, so an admin-set sponsor is replaced on approval or by the nightly sync. `alreadyCovered(null)` returns false, so an open-ended manual grant gets truncated.
- **Fix:**
  1. Count live `categorySponsors` rows in availability.
  2. In `activateBooking`, if the existing live row has a different sponsor name or URL, do not delete it. Flag the booking and return.
  3. Treat `sponsorUntil === null` as covering all dates in `alreadyCovered`.
  4. Wrap delete and insert in `db.transaction` (see L18).

**M6: spoofable rate-limit key on public counters.**
- **Problem:** `clientIp` takes the leftmost X-Forwarded-For value, and a client can set that. The site sits behind Cloudflare, which appends to an existing X-Forwarded-For header instead of replacing it.
- **Impact:** by rotating the header, one user can inflate "N interested" and "Confirmed by N visitors" without limit.
- **Also:** `rate_limits` rows are never pruned, and the 30-day window is aligned to the epoch, not rolling.
- **Verification gap:** a live forged-header probe was blocked, so the behavior at Railway's edge is unconfirmed.
- **Fix:**
  1. In `lib/request-rate-limit.ts`, prefer `cf-connecting-ip`. Fall back to the rightmost X-Forwarded-For entry (the one added by the trusted proxy), never the leftmost. This affects all 17 rate-limited routes, which is intended.
  2. Confirm the Railway origin is not reachable except through Cloudflare. If it is, `cf-connecting-ip` can be forged too.
  3. Add a nightly `DELETE FROM rate_limits WHERE window_start < now() - interval '31 days'`.
  4. Optionally, add `ip_hash` to `deal_feedback` with a unique index on `(item_id, kind, feedback_type, ip_hash)` for interest and confirm rows.

**M7: duplicate weekly digests.**
- **Correction to the stated scenario:** the scheduled Railway cron has no `BREVO_API_KEY`, so its Monday sends fail silently.
- **Where the risk is:** local `npm run cron` runs load `.env.local` (production DB and a live Brevo key). Every one of them on a Monday, Pacific time, emails every opted-in owner on the platform, whatever `CRON_REGIONS` is set to. The one real batch so far (2026-09-28) came from exactly that kind of manual re-run.
- **Fix:**
  1. Add migration `venue_owners.last_digest_sent_at timestamptz`.
  2. In `sendWeeklyDigests`, skip owners where `last_digest_sent_at >= start of current ISO week (America/Vancouver)`, and set it after a successful send.
  3. Skip digests entirely when `CRON_REGIONS` is set.
  4. Decide deliberately whether the scheduled cron should send digests at all. Today it never does. This is customer-facing automation, so it needs your go-ahead.

**M8: advisory lock on a pooled connection.**
- **Problem:** postgres-js closes pooled connections after a random 30-60 minute lifetime. Nightly runs take 77-252 minutes, so the session-level lock is released partway through almost every night, silently.
- **Impact:** an overlapping manual run can then apply the same pending batch in parallel.
- **Fix:** in `cron/index.ts`, take the lock on a dedicated connection with `const lockConn = await client.reserve()`, run `pg_try_advisory_lock` and `pg_advisory_unlock` on `lockConn`, and call `lockConn.release()` in `finally`. Also construct the cron's client with `max_lifetime: null`, or export a separate cron client from `db/index.ts`.

**M9: revenue overstated.**
- **Problem:** `getRevenueInRange` counts every credit-paid booking at face value, including the 10 free-trial credits and bundle bonus credits. Separately, `isTipSession` treats any paid session without `metadata.bookingId` as a tip. That includes credit-bundle sessions and owner-cart sessions, which use `bookingIds` (plural).
- **Worked example:** $250 of real cash can show as $535.
- **Fix:**
  1. Change `isTipSession` to require an explicit tip marker (for example `metadata.type === "tip"`, set in `tip/checkout/route.ts`).
  2. In `getRevenueInRange`, select `creditsSpentCents` and exclude credit-paid rows from sponsorship revenue.
  3. Report credit-bundle cash as its own line, taken from the ledger's `purchase` rows.
  4. Write a failing test with the bundle, trial and card-cart example first.

**M10: renewal revenue missing.**
- **Problem:** `handleInvoicePaid` only moves `endDate` forward and never records the charge.
- **Fix:**
  1. Add a `booking_payments` table (bookingId, stripeInvoiceId unique, amountPaidCents, paidAt).
  2. Insert one row on the first payment in the webhook and one on each `invoice.paid` with `billing_reason = subscription_cycle`, using `invoice.amount_paid`.
  3. Change `getRevenueInRange` to sum `booking_payments` by `paidAt`, and card bookings only, instead of `bookings.priceCents` by `createdAt`.

**M11: nudge ignores unsubscribes.**
- **Fix:** add `isNull(venues.unsubscribedAt)` to the `where` at :57-70, alongside `inArray`. This is a one-line fix. Do it before the script runs again.

**M12: nudge has no send ledger.**
- **Problem:** the script writes no `outreach_sends` row. A re-run with overlapping `--ids` emails the same owners again, and bounces, opens and replies are never recorded.
- **Fix:** before each send, insert an `outreach_sends` row with `kind: "credit_nudge"` and skip venues that already have a `sent` row of that kind. Tag the send `send-${row.id}` and update the row to sent or failed afterwards. This is the same pattern as `lib/outreach-followup-email.ts:139-209`, which already covers the unsubscribe check, dedupe, row, tag and status updates. Remove the unused imports.

**M13: unlimited region-wide pushes.**
- **Problem:** repeating Post, End early, Post (two clicks in the shipped UI) sends a high-urgency push to every subscriber in the region each time. The live check and the insert are not atomic, so two concurrent POSTs can each send a push, and the second row can't be ended from the UI.
- **Status:** VAPID keys are set in production, and real pushes were confirmed on a device on 2026-09-26.
- **Fix:**
  1. Add a push cooldown per venue, for example a `venues.last_flash_push_at` column. Send the push only if the last one was more than 12-24h ago; the flash special itself can still be posted.
  2. Add `checkRateLimit` keyed on the owner, not IP.
  3. Wrap the check and insert in `db.transaction` with `pg_advisory_xact_lock(hashtext('flash:' || venueId))`.
  4. Pass `topic: "flash-" + regionId` to web-push and set `tag` in `sw.js` `showNotification`, so repeat pushes replace each other instead of stacking.

**M14: junk push subscriptions.**
- **Problem:** `keys.p256dh` and `keys.auth` only need to be non-empty. Malformed keys make web-push fail locally with no HTTP status. `push-send.ts` only prunes on 404/410, so those rows stay forever and are retried on every flash special. A `regionId` that doesn't exist hits the foreign key and returns 500 instead of 400.
- **Fix:**
  1. Validate `p256dh` as base64url that decodes to exactly 65 bytes with first byte `0x04`, and `auth` as base64url that decodes to 16 bytes.
  2. Add `.max(1024)` on the endpoint.
  3. Look up the region and return 400 if it's missing.
  4. In `push-send.ts`, also prune rows whose send fails with no `statusCode` from a key or encryption error.

**M15: push sending is fragile, and today's SSRF allowlist can be bypassed.**
- **Allowlist bypass (the security part):** `subscribe/route.ts` checks the host with `new URL().hostname`, but web-push connects using `url.parse().hostname`. An endpoint like `https://attacker.example;.fcm.googleapis.com/...` passes the check and is stored. When a flash special is posted, the server then makes an outbound POST to `attacker.example`.
- **Other problems:**
  - When VAPID config is missing or partial, sends do nothing and nothing is logged.
  - `setVapidDetails`, the select and the delete are unguarded. A DB error returns 500 after the special is already inserted, and the owner's retry then gets a 409.
  - No `timeout` is passed, so one slow endpoint stalls the owner's POST.
- **Fix:**
  1. In the subscribe schema, require `url.parse(endpoint).hostname === new URL(endpoint).hostname`, require that hostname to be on the allowlist, and reject endpoints containing `; { } \` ' "` or whitespace.
  2. In `push-send.ts`, add `console.warn` when config is missing, wrap the whole body in try/catch, and pass `{ urgency: "high", timeout: 10000 }`.
  3. In `flash-special/route.ts`, send the push after the response with `after()` from `next/server`.

**M16: expired flash specials on the map.**
- **Problem:** `getMapPinsInBounds` filters on `archivedAt` and day of week only. Flash rows have `dayOfWeek` null and are never archived by cron, so every expired flash special matches every day. The homepage counts at `app/page.tsx:58,76` have the same gap.
- **Fix:**
  1. Apply the existing `notExpiredFlash` condition in `lib/map-data.ts` and in `app/page.tsx`.
  2. Add a cron step that sets `archivedAt = now()` on rows where `flashExpiresAt < now() - interval '1 day' AND archivedAt IS NULL`. This also fixes L24.
  3. Then audit `sitemap.ts`, `sponsored-data.ts:135/179/454` and the verify pages, which use the same archived-only filter.

### LOW

| ID | Severity | File:Line | Issue | Confidence | Est. Fix Time |
|---|---|---|---|---|---|
| L1 | LOW | app/api/owner/cart-checkout/route.ts:218 | Items in the same cart aren't counted against each other, so caps can be oversold | High | 1h |
| L2 | LOW | app/api/owner/cart-checkout/route.ts:288 | Stripe customer lookup runs outside the cleanup try, so a failure strands holds | High | 30m |
| L3 | LOW | app/api/owner/cart-checkout/route.ts:263 | Paying with credits returns 500 when a price isn't a whole number of dollars | High | 30m |
| L4 | LOW | app/api/owner/cart-checkout/route.ts:34 | `category` isn't validated against the enum | High | 15m |
| L5 | LOW | app/api/webhooks/stripe/route.ts:126 | Webhook re-check omits `chatTerm`, causing false conflict flags | High | 15m |
| L6 | LOW | lib/revenue-data.ts:39 | Chat-term and map-pin revenue is labeled and totaled inconsistently | High | 1h |
| L7 | LOW | lib/bookings-data.ts:235 | `approveBooking` can race with `rejectBooking` (no lock, no status guard) | High | 45m |
| L8 | LOW | lib/bookings-data.ts:214 | Per-day price shrinks after each auto-renew | High | 30m |
| L9 | LOW | components/EventInterestButton.tsx:30 | Every non-2xx response is shown as success and saved permanently | High | 20m |
| L10 | LOW | app/api/push/subscribe/route.ts:68 | DELETE has no auth or rate limit; POST upsert overwrites keys | High | 30m |
| L11 | LOW | components/PushOptIn.tsx:42 | Unhandled promise rejection in `check()` | High | 10m |
| L12 | LOW | cron/index.ts:76 | Discovered cross-origin URLs are fetched with no private-IP or scheme guard (blind SSRF) | High | 2h |
| L13 | LOW | cron/index.ts:467 | A batch that resolves after a claim is approved overwrites the claimed venue | High | 1h |
| L14 | LOW | cron/index.ts:750 | A billed Anthropic batch is orphaned if the tracking insert fails | High | 1h |
| L15 | LOW | cron/index.ts:692 (also :87) | An empty `CRON_TOKEN_CEILING` becomes 0 and silently stops extraction | High | 15m |
| L16 | LOW | db/schema.ts:891 | Credit-purchase idempotency can race, so concurrent webhooks double-grant credits | High | 1h |
| L17 | LOW | lib/bookings-data.ts:125 | Paid boosts can point at archived specials or events | High | 1-2h |
| L18 | LOW | cron/booking-sync.ts:25 | One failing booking aborts the rest; delete and insert aren't transactional | High | 45m |
| L19 | LOW | scripts/send-credit-nudge.ts:77 | Email says "$10 unused" whatever the real balance is | High | 30m |
| L20 | LOW | scripts/send-credit-nudge.ts:17 | Owner and venue names go into email HTML unescaped | High | 15m |
| L21 | LOW | app/api/webhooks/brevo-events/[token]/route.ts:49 | Webhook token checked with `!==` instead of a constant-time compare, and sits in the URL | High | 20m |
| L22 | LOW | lib/outreach-email.ts:38 | Brevo fetch has no timeout (about 300s worst case) | High | 10m |
| L23 | LOW | scripts/find-venue-emails.ts:151 | The documented `--limit N` form is ignored, so every venue is crawled and written | High | 20m |
| L24 | LOW | app/api/specials/[id]/claim-flash/route.ts:28 | Claims still count after the owner ends a flash special early | High | 10m |
| L25 | LOW | app/api/report/route.ts:18 | No per-item dedupe on disputes (10/hr per IP against one item) | High | 20m |
| L26 | LOW | lib/flagged-data.ts:71 | Disputes on events with no venue never reach the admin queue | High | 20m |

**Explanation and fix for each LOW:**

- **L1 (in-cart oversell).**
  - **Problem:** each cart item is checked only against rows already in the DB, and then all items are inserted together. Credit-paid carts skip the webhook re-check entirely.
  - **Fix:** before the loop, group items by `(productType, category, categoryKind, lower(chatTerm), regionId)`. For each item, count overlapping items earlier in the same cart and require `occupied + inCartOverlap < capCount`. Reject exact duplicates with 400.
- **L2 (stranded holds).**
  - **Problem:** if `getOrCreateStripeCustomerId` throws, the route returns a bare 500 and the just-inserted rows keep blocking capped slots for 30 minutes.
  - **Fix:** move the call before the transaction, or inside the `try` that marks rows `expired` on failure. In `OwnerCart.tsx:218`, use `await res.json().catch(() => null)`.
- **L3 (credits 500).**
  - **Problem:** `centsToCredits` throws a plain Error unless the amount is a whole number of dollars, and the route rethrows it.
  - **Fix:** add `.refine(v => v % 100 === 0)` to `priceCentsPerDay` in `admin/settings/route.ts`. In cart-checkout, catch the non-`InsufficientCreditsError` case and return 400. Only validation changes here. The current prices stay as they are, and any price change needs your explicit yes.
- **L4 (unvalidated category).**
  - **Problem:** an off-enum or misspelled category lands in its own empty cap bucket, is always available, and creates a paid sponsorship that never displays.
  - **Fix:** use `category: z.union([z.enum(specialCategory), z.enum(eventType)]).nullable().default(null)`, the same as `check-availability`.
- **L5 (missing chatTerm).**
  - **Fix:** append `booking.chatTerm` as the 10th argument to `checkAvailability` at route.ts:126-136. Add a test with two different terms in one cart.
- **L6 (chat-term/map-pin revenue labels).**
  - **Fix:**
    1. Add `chat_term_sponsor` and `map_pin` to `BOOKING_PRODUCT_KEYS`.
    2. Correct the stale comment at revenue-data.ts:39-42.
    3. Add a `bookingId` column to `chatTermSponsors` and exclude booking-origin rows from the "Manual sales" figure so self-serve sales aren't counted twice.
- **L7 (approve/reject race; three reports merged).**
  - **Fix:**
    1. Run `approveBooking` in `db.transaction` with `.for("update")` on a select filtered by `status='pending_approval'`.
    2. Put `and(eq(id), eq(status,'pending_approval'))` in the UPDATE's where clause and check the row count.
    3. Make both admin routes return 409 when nothing changed.
- **L8 (per-day price drift).**
  - **Fix:** compute `priceCentsPerDay` from `settings.priceCentsPerDay`, or divide by 30 when `autoRenew` is set, instead of dividing by the extended range.
- **L9 (interest button false success).**
  - **Fix:** call `markInterested`/`setTapped` only when `res.ok || res.status === 429`. Show an error state for anything else, matching `EventRow.tsx:35`.
- **L10 (push DELETE/upsert).**
  - **Problem:** exploitability is low because push endpoints are unguessable and can't be listed.
  - **Fix:** add `checkRateLimit(req, "push-unsubscribe", 10, 60)`. Require the matching `auth` secret in the DELETE body and in the WHERE clause. In the POST upsert, update only when `auth` matches the stored value.
- **L11 (PushOptIn rejection).**
  - **Fix:** wrap the body of `check()` in try/catch and use `res.json().catch(() => null)`.
- **L12 (SSRF from discovered links).**
  - **Problem:** links found on venue homepages are stored with `requireSameOrigin=false` and later fetched by plain fetch or headless Chromium with no private-IP check. For browser-rendered venues this includes `file://` URLs.
  - **Fix:**
    1. In `discover.ts`, before storing a URL, require `http:`/`https:` and reject hosts that resolve (via `dns.lookup`) to private or reserved ranges, using the existing `isPrivateOrReservedIp`.
    2. Re-check at fetch time in `fetchAndExtractText`, using `redirect: "manual"` and re-validating each redirect hop.
    3. In Playwright, add `page.route("**", ...)` that aborts non-http(s) and private-IP requests.
- **L13 (claimed venue overwritten).**
  - **Fix:** at the start of `applyBatchItemResult`, re-read `venues.claimedAt` and `active`. If the venue is claimed, mark the item failed with the reason "venue claimed before apply" and return. In the claim-approval transaction, also fail that venue's pending batch items.
- **L14 (orphaned billed batch).**
  - **Problem:** this has already happened in production (the 2026-09-28 NUL-byte incident).
  - **Fix:** declare `anthropicBatchId` outside the `try`. If `createExtractionBatch` fails, log the id and call `anthropic.messages.batches.cancel(id)`. Or insert a `submitting` placeholder row first and update it with the id.
- **L15 (empty token ceiling; two reports merged).**
  - **Fix:** use `const raw = process.env.CRON_TOKEN_CEILING?.trim(); const parsed = raw ? Number(raw) : NaN; override = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined`. Update the comment at line 82 to say the override can only lower the ceiling.
- **L16 (double credit grant; two reports merged).**
  - **Fix:** add a migration with a unique partial index `ON credit_ledger (stripe_session_id) WHERE reason = 'purchase'`. Do the ledger insert inside the transaction first, with `onConflictDoNothing().returning()`, and grant the balance only if a row was returned. Needs your yes, since it touches the payment path.
- **L17 (boosts on archived rows).**
  - **Fix:** add `isNull(archivedAt)` to the specials and events lookups in cart-checkout at :125-126, the same as `verify-email`. In `cron/upsert.ts`, carry `boostedUntil` from the archived row to its re-inserted successor for the same venue.
- **L18 (booking sync).**
  - **Fix:** put a try/catch around each item in `syncBookings`. Wrap the sponsor delete and insert (bookings-data.ts:190-198 and 216-224) in `db.transaction`. Set `process.exitCode = 1` when booking sync fails so Railway alerts.
- **L19 (hardcoded "$10").**
  - **Fix:** render `row.creditBalance` in the subject and body. Restrict the audience to venues whose only ledger entry is the trial grant. Remove the false "re-checked right before sending" comment.
- **L20 (unescaped names).**
  - **Fix:** run `ownerFirstName` and `venueName` through an `escapeHtml` helper before interpolating them.
- **L21 (Brevo token compare).**
  - **Fix:** use `crypto.timingSafeEqual` (with a length check) in both `brevo-events` and `brevo-inbound`. Brevo's webhook config supports custom headers, so the secret could move out of the URL path. This is a candidate to accept as known risk (see section 5).
- **L22 (Brevo timeout).**
  - **Fix:** add `signal: AbortSignal.timeout(15000)` to the fetch, as `lib/brevo.ts:35` already does.
- **L23 (`--limit` flag).**
  - **Problem:** the documented space form is ignored, and `--limit=`, `--limit=abc` or `--limit=0` all mean "no limit". Without `--dry-run`, every run writes scraped addresses into `venues.contact_email`, which feeds cold outreach.
  - **Fix:** accept both `--limit N` and `--limit=N`. Exit with an error unless the value is a positive integer.
- **L24 (claims after End early).**
  - **Fix:** add `isNull(specials.archivedAt)` to the claim UPDATE's where clause. The M16 cron archival step also helps.
- **L25 (report dedupe).**
  - **Fix:** key the rate limit as `report-${kind}-${specialId}` with a limit of 1 per day, as the design spec requires. Keep the global `report` limit as a second layer. Optionally, count distinct `ip_hash` in `getFlaggedSpecials`.
- **L26 (venue-less event disputes).**
  - **Fix:** change the venues join in `getFlaggedEvents` to `leftJoin` and scope by `events.regionId`, which is not null. Apply the same change in `admin-counts.ts`.

## 4. What's Working Well

- **The core trust boundaries held.** No finding shows owner data leaking across venues, a claim bypassing admin approval, or extraction skipping the verbatim-quote rule. The owner special DELETE and flash routes scope to `session.venueIds` as intended.
- **The locking is solid where it was applied.** Cart checkout serializes capacity checks with `pg_advisory_xact_lock`, using per-term lock keys for chat terms. `spendCredits` uses `FOR UPDATE`. `rejectBooking` locks and refunds in a single transaction. The flash claim counter is one atomic `count + 1` with the expiry check in the same statement.
- **The anonymous booking flow is well hardened.** It requires an email-verified token, retires the buyer's own stale holds, and documents the hold-exhaustion attack it defends against. Most of the owner-cart findings amount to "bring the owner path up to this standard".
- **Secrets are mostly compared safely.** Unsubscribe tokens, venue verification, booking tokens, admin login and digest unsubscribe all use constant-time compares. The Brevo webhooks are the only exceptions.
- **The codebase already has the right patterns to copy.** `lib/tips-data.ts` checks `payment_status`, `lib/brevo.ts` uses a fetch timeout, `lib/outreach-followup-email.ts` has full dedupe and unsubscribe handling, and `isSafeImageUrl` guards against private IPs. Several fixes above are just "apply the existing pattern here".

## 5. Prioritized Fix Roadmap

Per your standing rules, each fix starts with a failing test that reproduces the bug. Any fix that touches payments (H2, M1, M2, M3, L3, L16) is proposed only and needs your explicit yes before it's applied.

**Fix now (no critical findings this run, so this covers the HIGH findings and high-confidence items that are live in production today):**
1. **H1:** isolate errors per batch item and validate dates/times semantically. A single bad extraction can take the nightly cron down for weeks.
2. **H2:** cancel the Stripe subscription on reject and surface the subscription id in the refund queue. This is real money billing customers after rejection. Needs your approval.
3. **M15, allowlist part:** close the `url.parse` bypass in the push endpoint allowlist, which is a gap in today's SSRF fix. Add the send timeout at the same time.
4. **M13:** push cooldown per venue and a lock around the flash check/insert. Pushes are live in production.
5. **M11:** one-line unsubscribe filter in the credit nudge, before the script runs again.

**Fix this sprint (remaining MEDIUMs):**
- **Payments (all need your approval):** M1 (`expires_at`), M3 (`payment_status` plus async events or excluding `acss_debit`), M2 (retire the owner's own holds and cap them).
- **Sponsor integrity:** M4 and M5 (stop hard deletes; count the manual sponsor tables in availability), plus L5 and L18 in the same pass.
- **Cron:** M8 (reserved lock connection), M7 (digest send-once marker; customer-facing automation, so confirm first).
- **Revenue reporting:** M9 and M10 (tip classification, credit-paid exclusion, a renewal payments table), plus L6.
- **Abuse and spam:** M6 (client IP source and `rate_limits` pruning), M12 (nudge send ledger), M14 (push key validation), M16 (expired flash filter plus archival cron).

**Backlog (LOW):**
- **Small bundles by file:** L1, L2, L4 and L17 (cart-checkout); L7 and L8 (bookings-data); L13, L14 and L15 (cron); L19 and L20 (nudge script); L24, L25 and L26 (reports and flash).
- **Higher-value LOWs to pull forward:** L12 (SSRF from discovered links, the most security-relevant) and L16 (double credit grant).
- **Quick, independent fixes:** L9, L10, L11, L22, L23.

**Accept as known risk (pending your decision):**
- `/api/owner/request-login` has no rate limit. This was already accepted, is pending approval, and was not re-flagged.
- L21, the Brevo webhook timing compare. Remote timing attacks are impractical, and the worst case is forged open/click flags. Moving the token to a header is optional hygiene.
- L10, push DELETE with no auth. Endpoints are unguessable bearer values that can't be enumerated. Adding the rate limit is cheap, but the risk is minimal.
- Flash claim counts can go past `flashClaimLimit` under concurrency. This is documented as intentional in `schema.ts:404-408`.

## 6. What's Not Verified

This was a static code review, backed by read-only DB queries, read-only test-mode Stripe config reads, and a few unauthenticated live GETs. None of the following was exercised end to end:

- **Real Stripe payment flows.** No live-mode checkout, subscription renewal, rejection or refund was run. The live-mode payment method configuration was never read. Only test mode was checked, and it has `acss_debit` off. M3's real exposure depends on the live Dashboard settings.
- **Real push and email delivery.** No push was sent to a real device, and no Brevo send was triggered in this review. The M15 allowlist bypass was confirmed against the installed libraries locally, not against production traffic.
- **Cron overlap under live load.** M8's lock loss is inferred from postgres-js source and `scrape_runs` timings. Two runs were not actually overlapped.
- **Rate-limit spoofing at the edge.** The live forged X-Forwarded-For probe for M6 was blocked, so how Cloudflare and Railway handle a client-supplied header in production is unconfirmed.
- **The frontend in a real browser.** No Playwright pass was run on OwnerCart, PushOptIn, EventInterestButton, MapView or the admin panels. The UI behavior described in the findings comes from reading the code.
- **Race conditions** (L1, L7, L16, M13) were reasoned from code and Postgres READ COMMITTED semantics, not reproduced with concurrent requests.

## 7. Token Summary

- **This pass:** synthesis only, with no tool calls. The findings came from the upstream phases.
- **Upstream usage:** per-phase token counts were not passed to this agent, so they are not reported here.
- **Consolidation:** 54 verified entries in, 10 duplicates merged, 44 unique findings out. The Devil's Advocate pass dismissed 4 false positives before this step.