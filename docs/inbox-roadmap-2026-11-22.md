# Admin inbox roadmap: scope for all 16 features (2026-11-22)

Status: SCOPE ONLY. Nothing here is built. Estimates are S (under an hour), M (1 to 3 hours), L (half a day or more), in the same working style as the last few sessions.

## Rules that apply to every item
- Tests first, then code. Each item ships on its own so a problem can be rolled back alone.
- Built and checked locally with screenshots, then pushed outside 13:00 to 16:00 UTC (the nightly scrape window), then checked live.
- Any database change is shown to Mike as exact SQL and run only after a yes, then recorded as a re-runnable migration.
- Anything that writes to a public listing or sends an email in Mike's name happens only on a click, with a confirmation that spells out what will change and who gets the email.
- No paid APIs. Any language-model work runs through `claude -p` on Mike's PC (Max plan, no tools, text in and JSON out), with the same validation as the proposals feature.
- Venue replies are untrusted text. Nothing they say is ever executed; everything read from them is validated.

## Phase 1: stop information, revenue and legal gaps from slipping through

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| 1 | Assign an unmatched reply to a venue | "Assign to venue" on a thread from an unknown sender: search venues, pick one, move that sender's messages onto the venue. Remember the address so future mail from it matches automatically. The special and phone buttons then work on it. | New table `sender_aliases` (email, venue_id). | M |
| 2 | Spot stop requests | A pure detector (English and French: "remove me", "unsubscribe", "ne plus recevoir", "retirez-moi" and similar) runs on the owner's new text only, never on quoted history. A banner on the thread offers one-click unsubscribe (suppression is already by address) and a drafted polite confirmation. Also a `has:stop` search operator and a count in the sidebar. | None (computed when shown). | M |
| 3 | Flag sales leads | A detector for advertising, sponsoring, pricing, claiming the listing, "how much" (English and French). A "Lead" chip in the list and thread, an `is:lead` operator, and a Leads count. Mike can dismiss a false positive. | None for detection. One small column or table only if dismissals must persist. | S |
| 4 | Link and sender warnings | Mark links to domains that are not the venue's own site or well-known, and show a warning when a reply comes from an address different from the one on file. | None. | S |

Phase 1 exit check: replay the 113 real replied threads through the detectors and look at the matches by hand before anything is shown, to catch false positives.

## Phase 1B: revenue, built on what already exists (runs right after Phase 1, ahead of Phase 2)

Facts behind it (read-only, 2026-11-22): no live payments on record; 37 claimed venues each hold exactly 10 free credits and none has been spent; nobody is Featured now; the owner "unspent credit" email and the weekly stats email exist in code and have never been sent; 7 of the 120 venues that wrote to us went on to claim (about 6%, against about 0.4% of all venues); 322 venues sit in 42 groups of three or more sharing a chain or contact address. What the 10 credits buy and what any product costs have NOT been checked, and no price is changed anywhere in this plan.

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| R1 | Get claimed owners to spend their free credit | Review the existing credit-reminder email (scripts/send-credit-nudge.ts) and its wording, show Mike the exact recipient list and a preview, and send only after his yes, in small batches. Add the owner's credit balance, last login and active Boost to the venue panel so a conversation shows where they are in the funnel. | None. | S |
| R2 | Turn replies into claims (DONE 2026-11-22: unclaimed-only English and French thank-you with the free claim link) | After a special is applied, the drafted thank-you offers the free claim (their listing, editing, and the credit) with the claim link, in the venue's language. Track which claims came from a reply. | None (reuses the claim flow). | S |
| R3 | Photo and poster upsell at the right moment | The photo or poster add-on already exists (priced per day on top of a Boost). This adds the moment and the link: when an owner emails a photo, the drafted reply thanks them, says it is on their listing, and offers the add-on that puts a poster behind a specific Boosted special, with the link. The venue panel shows whether the venue has a photo, a Boost, and credit. No new product and no price change. | None. | S to M |

Rules for all three: they go only to claimed owners and to venues whose address is proven by an owner reply (lib/email-basis.ts), each message is approved by Mike before it goes, and every link is tagged so purchases can be tied back to the email (feeds item 16).

Verified for R3 (2026-11-22, code and production data):
- A bought poster is saved on the special itself (specials.photo_data, and events.photo_data for events) when the booking is fulfilled (lib/bookings-data.ts).
- It is served at /api/specials/{id}/photo and /api/events/{id}/photo ONLY while the special or event is actively boosted, so it lapses with the Boost.
- It is displayed: SpecialCard shows it as a full-width image (up to 15rem tall) on a boosted special that has one, and EventCard and EventRow do the same for events.
- BUT no special or event has ever been boosted and none has a poster, and no live payment exists. The purchase, fulfilment and display chain has never run in production.
- Therefore the reply must only promise what is verified: "a poster on that special's card while the Boost runs". And before R3 sends anything, run one full test purchase in a safe environment (Stripe test mode with test keys and a test database, never the live site) to prove the chain. The first real sale will otherwise be the first test.

TESTED 2026-11-22 (Mike approved; hidden test venue, rows removed afterwards, production data confirmed unchanged: 37 venues x 10 credits, 0 bookings, 0 boosts):
- Unit tests added: lib/bookings-poster.test.ts (8) and app/api/specials/[id]/photo/route.test.ts (6). Not committed yet.
- Real run, credit-paid path (no Stripe): the real /api/owner/cart-checkout accepted a 1-day Boost plus poster ($2 + $1 = 300 cents = 3 credits, balance 10 to 7) and created a pending_approval booking; the real approveBooking() approved it; the special got boosted_until (end of the Pacific day) and the poster; /api/specials/{id}/photo returned 200 image/png; after the Boost was expired it returned 404.
- NOT proven: the Stripe card path and webhook (only a test-mode key exists locally; nothing was paid by card), and how the card looks on the live board (the test venue was hidden by design).
- Fact for the reply wording: a paid Boost still waits for admin approval before it goes live.
- Prices as configured: Boost $2/day, photo add-on $1/day, a bundle discount of 10% at 3 venues and 20% at 5 venues exists in checkout (the backlog line below that says bundle pricing is missing is out of date).

Added to Phase 1B after the poster test:

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| R4 | Tell Mike when a paid booking is waiting for approval | CORRECTED 2026-11-22: the admin nav already shows a count badge on the Sponsored tab for bookings pending approval (components/AdminNav.tsx, lib/admin-counts.ts). Only the push side is missing: include the count in the daily summary (item 15). Never auto-approve. | None. | S (folded into item 15) |
| R5 | Test the card payment path | Prove the Stripe checkout and webhook with Stripe TEST mode (test keys and Stripe's published test cards) against a hidden test venue, with the same cleanup as the credit test. Production keeps its live key; nothing is charged. | None. | M |

## Phase 5: smaller ideas (scoped lightly, build after Phases 1 to 4 unless a change in priorities)

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| 17 | Chain context in the venue panel (BUILT 2026-11-22; real data: 4 of 115 venues that wrote to us have another location sharing their address, and all 4 look like possible DUPLICATE listings of one business: Siam Thai ids 1646, Tipsy Fox 4392, Cafe de la Brulerie 1293, Couleur Cafe 8507; needs Mike's review, nothing changed) | Show "N locations share this address or chain" with links; feeds item 13 and chain bundle offers (a 10% discount at 3 venues and 20% at 5 already exists in checkout). | None. | S |
| 18 | Auto-advance | After archiving or sending, open the next conversation. | None. | S |
| 19 | Duplicate-reply guard | Warn when a reply to this thread was sent in the last few minutes. | None. | S |
| 20 | Per-venue to-do notes | A short private note and a done tick on each venue, shown in the panel. | New column or table. | S to M |
| 21 | Export replies to a spreadsheet | CSV of replies (date, venue, status, language) from the current filter. | None. | S |
| 22 | Owner referral credit | Credit for bringing in a venue. Costs nothing until used, but touches credits, so needs a design and Mike's yes first. | Likely. | M |
| 23 | Self-serve checkout for non-venue sponsors | A purchase path for breweries, tourism boards and similar, replacing the manual contact form. Touches payments, so needs a design and Mike's yes first. | Likely. | L |
| 24 | Turn on the weekly owner stats email | Already built and off. Needs cron-service variables (a production change, needs Mike's yes). | None. | S |
| 25 | Booking and ticket commission | The big revenue swing from the earlier notes. A separate project, not an inbox feature. | Yes. | XL |

## Open operational items (not features; each needs Mike)
- Schedule the reply-suggestion task: Mike runs one `schtasks` command.
- Relabel 59 sent replies filed under the wrong kind (SQL shown first, needs a yes).
- One real click-through of "Apply selected" on a suggestion card.
- Decide whether to test removing click tracking (customer-facing).
- Tighten DMARC to p=quarantine after 2 to 4 weeks of clean Cloudflare reports.
- Re-check The Longhorn venue after 2026-12-03.

## Phase 2: day-to-day workflow

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| 5 | "Needs follow-up" folder | DONE 2026-11-22. Threads where the venue replied, our newest message was a human answer that asked them something, and 7 or more days have passed with no reply; excludes unsubscribed venues. Real data: 2 threads. A gentle follow-up canned reply exists in English and French. | None. | S |
| 6 | Out-of-office dates | SKIPPED 2026-11-22: only 2 of 138 real replies mention being away or back, neither with a date, and auto-replies are archived on arrival by design, so there is nothing to snooze from. Revisit if dated away-notices ever show up. Original idea: parse "back on Dec 3" and "de retour le 3 décembre" from auto-replies and offer to snooze the thread until then. | None (uses existing snooze). | S |
| 7 | Autosave drafts | DONE 2026-11-22. An unsent reply is saved in the browser per conversation (after a short pause in typing), restored when the conversation opens, and cleared on send or an explicit Discard. Drafts older than 30 days are dropped. Blocked or full storage just means no autosave. | None (browser storage). | S |
| 8 | Editable canned replies and `status:` search | Edit, add and delete canned replies in the interface instead of code; `status:interested` and similar operators. | New table `inbox_snippets`, seeded from today's twelve. | M |
| 9 | Narrow-screen layout and compose popup | CHECKED 2026-11-22 at a 390 px wide frame on the live inbox and a thread: no horizontal overflow, the folder chips scroll sideways, rows are readable, and the venue panel already stacks below the thread. Nothing to build. The Gmail-style compose popup is skipped (polish only; the Compose page works). Revisit if Mike wants it. | None. | none |
| 10 | Suggestions queue and "Approve all high confidence" | A Suggestions folder listing every pending proposal with a one-line summary. "Approve all" applies only high-confidence ones, never a phone change, shows each recipient and what will change, and is capped per click. Built only after a few weeks of accurate suggestions. | None. | M |

## Phase 3: safer and wider changes from replies

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| 11 | Venue change history with Undo | Every inbox write (special added, phone changed, photo added, address verified, region moved) is logged with the old value, so it can be undone from the venue panel. Built BEFORE items 12 and 13 widen what can be written. | New table `venue_change_log`. | M to L |
| 12 | Read more from replies | Extend suggestions to events, opening hours, website and Instagram links, "permanently closed" (always a confirm before deactivating, never automatic), and menu photos or PDFs (the one place the model would get a read-only file tool, limited to a single temporary file, with the output validated the same way). | None for most; a closure flag uses the existing `active` column. | L |
| 13 | One reply, several venues | When venues share a chain or contact address, tick which locations a special applies to and apply them in one confirmed step. | None (uses `chain_id` and the shared address). | M |

## Phase 4: scheduling, awareness and measurement

| # | Feature | How | Database | Effort |
|---|---|---|---|---|
| 14 | Send at 9:30 their time | Use Brevo's own scheduled-send option (it accepts a send time up to 72 hours ahead), so nothing has to run on Mike's PC. The scheduled message appears in the thread as "scheduled" and can be cancelled. To be verified against the live API before building. | Possibly a `scheduled` send status. | M |
| 15 | Notifications | A once-a-day summary email to Mike (new replies, pending suggestions, leads, stop requests), sent by the same scheduled task that reads replies. Alternative: a Windows pop-up. Needs Mike's choice. | None. | S to M |
| 16 | Reply analytics (BUILT 2026-11-22 at /admin/reply-stats, linked from the inbox sidebar; first real numbers: 5,746 venues emailed, 120 replied = 2.1%; plain emails 4.0% vs branded 1.4%) | A read-only admin page: reply rate by region, language and email style (branded versus plain), time to first reply, and how fast Mike answers. Opens are shown with a warning that they are unreliable. | None. | M |

## Totals
- 4 new tables (`sender_aliases`, `inbox_snippets`, `venue_change_log`, and a small status addition for scheduled sends if needed), each shown as exact SQL first and each additive.
- Phase 1B now has R1 to R5. Items 1 to 4 are the first ship. Items 5 to 10 can follow in any order. Item 11 must come before 12 and 13.
- Nothing here needs a paid service or a change to production environment variables. The weekly digest, the cron service variables and the scheduled task from earlier remain separate decisions.

## Decisions needed from Mike
1. **Leads:** is the keyword list in item 3 right, and should a lead be able to alert you (item 15) the same day?
2. **Approve all (item 10):** high confidence only, never phone changes, at most 10 per click: OK?
3. **Closures (item 12):** always a confirm before deactivating a venue: OK?
4. **Notifications (item 15):** a daily summary email to element.mikem@gmail.com, or a Windows pop-up?
5. **Scheduling (item 14):** OK to rely on Brevo's scheduled send, if the live API supports it as documented?
