# TodaysTab emailer: improvement list (research, 2026-11-22)

Sources: a read-only audit of this repo, a web research pass on deliverability, CASL and Quebec rules, and a web research pass on premium inbox features. Each item says how well it is backed. "Verified" means I checked the code or a primary source myself. "Agent claim" means a research agent said it and I have not confirmed it. Nothing here has been built or changed. Anything that touches DNS, the live send path, or customers needs Mike's yes first.

## What is already good (verified in code)

- A timezone-aware first-contact sender exists: cron/timezoneOutreach.ts sends only inside a 9:15 to 10:15 local window per province, with a per-run cap of 400, a 400 ms pace, an advisory lock, and an "already sent" guard. The audit agent wrongly said no scheduling existed.
- Follow-up and weekend email templates exist (lib/outreach-followup-email.ts, lib/outreach-weekend-email.ts).
- Outbound mail carries one-click unsubscribe headers (List-Unsubscribe and List-Unsubscribe-Post) in all three send paths.
- Inbound dedupe by Brevo message id, case-insensitive sender matching, blocked-sender handling.

## A. Deliverability, compliance and reliability (do these before the next big send)

| # | Improvement | Effort | Evidence |
|---|---|---|---|
| A1 | Authenticate a sending subdomain (for example mail.todaystab.com) in Brevo and send from it. Today the real email arrived from element.mikem@11083160.brevosend.com, a shared Brevo domain, so all reputation is shared and nothing builds under todaystab.com. Needs DNS records (Cloudflare), so ask first. | S | Verified: sender seen in the real reply; lib/outreach-email.ts takes From from REPORT_EMAIL_FROM. Brevo and Google docs. |
| A2 | Publish DMARC (p=none with reports) on the sending subdomain and apex. | S | Google sender guidelines; Brevo domain setup guide. |
| A3 | Register the domain in Google Postmaster Tools and keep spam rate under 0.1 percent. | S | Google sender guidelines. |
| A4 | Handle complaints and soft bounces. The events webhook only handles hard_bounce (app/api/webhooks/brevo-events/[token]/route.ts:84). Complaints never suppress a venue, and soft bounces are ignored. Suppress on complaint, retry soft bounces 2 to 3 times then suppress. | M | Verified in code. |
| A5 | Detect auto-replies, out-of-office and bounce notices on inbound (Auto-Submitted, Precedence, X-Autoreply headers, DSN subjects) and keep them out of the inbox and the reply-rate numbers. | S to M | Verified: no detection in the inbound webhook. |
| A6 | Decide on click and open tracking. Mail goes out through shared sendibt2.com redirect links. Either send first-contact mail with no link wrapping, or move to a branded tracking subdomain. Trade-off: the Opened and Clicked badges in the inbox would go. Apple Mail Privacy Protection already makes opens unreliable. | S | Thin: no primary source on placement impact. Test it as an A/B. |
| A7 | Add In-Reply-To and References headers on replies sent from the admin inbox so the venue's mail client threads them. | S | Verified: not set in the send route. |
| A8 | Warm the new subdomain: 20 to 30 a day, rising over 2 to 4 weeks. Stay on Brevo shared IPs at this volume. | S | Brevo warm-up and IP guidance. |
| A9 | CASL record per recipient: where the address was found, date, no "no solicitation" notice, why the message is relevant. Exclude addresses that fail the conspicuous-publication test. Add the legal business name to the footer. | M | CASL text and secondary sources. Not legal advice. Whether the current sourcing meets this is NOT yet checked in code. |
| A10 | Quebec: confirm every Quebec region sends French subject, body and unsubscribe text. Consider French-first bilingual. | S | Secondary sources only; OQLF pages could not be read. Ask the OQLF or a Quebec lawyer if volume grows. |
| A11 | Tests for the webhooks, reply matching, outreach send and inbox data. None exist today (verified by file name; the new email-quote and email-display tests are the only inbox tests). | M | Verified. |
| A12 | Smaller audit items worth checking before acting: reply matching can fall back to "latest sent" and attach a reply to the wrong campaign; attachments over 4 MB are dropped with only a console error; a missing reply domain could produce a bad Reply-To. | S each | Agent claims, not verified. |

## B. Inbox features (from Superhuman, HEY, Missive, Shortwave, Help Scout, Front)

Ranked for a one-person admin who reads French replies and then edits venue records.

| # | Feature | Effort | Why |
|---|---|---|---|
| B1 | Language badge plus an Original / English toggle on each message | M | Removes the copy and paste into a translator. |
| B2 | Translate-and-reply: write in English, send in French | M | Rare in other products; fits the Quebec work. |
| B3 | "Apply to venue" chips: the reply is read for hours, specials, phone, then you accept or edit each chip. Writes only on click. | L | Replaces read, switch tab, edit. No mainstream inbox does this. |
| B4 | Venue side panel beside the thread: current specials, phone, photos, notes, outreach history | M | Compare the reply with what is stored. |
| B5 | Attachment lightbox with "Use as venue photo / logo" (and logo-friendly cropping, since logos get cut off in the hero banner) | M | Today this is download, then upload. |
| B6 | One-line English summary under each row | S | Triage without opening. |
| B7 | One status per thread: New, Interested, Waiting, Needs update, Done | S | Simpler than unread plus archive. |
| B8 | Snooze, and "remind me if no reply in N days" that cancels on reply | M | Outreach follow-up. |
| B9 | Snippets in English and French with variables | S | Same replies repeated. |
| B10 | Keyboard navigation (j, k, e, r, ?) and a Cmd+K palette with shortcut hints | S to M | Cheapest large speed gain. |
| B11 | Undo send (5 to 10 second delay) | S | Wrong venue or language. |
| B12 | AI draft reply in the thread's language, after the chips are applied. A suggestion only, never auto-send. | M | Needs a go-ahead before any customer-facing automation. |
| B13 | Search operators: from:, status:, has:attachment, lang:fr, venue: | S | Builds on existing search. |
| B14 | Premium feel: under 100 ms interactions, optimistic updates, one accent colour, 100 to 150 ms motion, calm empty states with a next action | S to M | Superhuman 100 ms rule (confirmed on its blog); the rest is judgement. |

Skip for one person: read receipts, team assignment, comments, a screener, multi-account.

## Suggested order

1. Batch 1 (safe, no customer impact): A4, A5, A7, A11, B1, B6, B9, B10. All inside the admin, covered by tests.
2. Batch 2 (needs Mike's yes): A1, A2, A3, A8 (DNS and sender change), then A6 as an A/B.
3. Batch 3: B3 and B4 together, then B5, B8, B2.

## Evidence gaps

- No primary source on how the shared Brevo tracking redirect affects inbox placement.
- Microsoft and Yahoo rules came from vendor summaries; the CRTC bulletin and OQLF pages could not be read.
- Spark, Fastmail and several Gmail details were not researched. Superhuman help pages returned 403, so some Superhuman details are second-hand.
- Reply-rate benchmarks are from cold-email vendors, mostly US software sales, not local venues.
