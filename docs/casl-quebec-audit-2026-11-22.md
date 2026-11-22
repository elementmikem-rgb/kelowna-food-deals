# CASL and Quebec audit of the outreach emailer (read-only, 2026-11-22)

Scope: how the code and the production data handle consent, identification, unsubscribe and French for Quebec. Nothing was changed. This is a technical audit, not legal advice; the law items are from the earlier research (CASL s.6 and s.10(9)(b), Quebec Charter of the French Language) and should be confirmed with a lawyer or the regulator if volume grows.

## What was checked and held up

| Item | Result | Evidence |
|---|---|---|
| Quebec emails are in French | Pass | 1,373 of 1,374 first-contact sends to Quebec regions have French subjects. The one exception (venue 7801, "Turbo Haus : vos heures de 5 a 7") is also French. |
| French footer and unsubscribe text | Pass | lib/outreach-send.ts buildFooter and buildFooterText switch on the region language. |
| Mailing address and sender name in every email | Pass | Footer carries regions.mailing_address; sender name is the region brand. |
| Unsubscribe link never expires | Pass | lib/unsubscribe.ts is a stateless HMAC with no expiry, so it works well past the 60 days CASL requires. |
| Unsubscribe takes effect immediately | Pass | app/api/unsubscribe/route.ts sets venues.unsubscribed_at on the request. |
| Unsubscribed venues are excluded | Pass for the venue itself | Checked in first-contact, follow-up and weekend sends and in the batch scripts. |
| One-click unsubscribe headers | Pass | List-Unsubscribe and List-Unsubscribe-Post on all three outreach kinds. |
| Replies asking to stop | No unactioned request found | A scan of owners' new text (not quoted history) is still advisable; the first scan only matched our own quoted footer. |

## Findings that need action

### 1. HIGH: unsubscribes are by venue, not by address (shared inboxes keep getting mail)
- info@craftbeermarket.ca unsubscribed on 2026-09-08 (venue 15, Kelowna). After that, 14 more emails went to the same address for other CRAFT locations (first contacts, follow-ups and weekend promos, 2026-09-15 to 2026-10-03).
- 9 venues across 3 addresses are still emailable although their address unsubscribed on a sibling venue.
- Cause: the unsubscribe flag lives on the venue row; the send paths check the sending venue only.
- Fix: suppress by address (lower-cased) in every send path, and treat a Brevo complaint or hard failure the same way. Only reduces sending.

### 2. HIGH: the unsubscribe link unsubscribes on a plain GET, so mail scanners unsubscribe people
- 20 of 72 unsubscribes happened within 30 seconds of our email arriving and 22 more within 5 minutes. That is 42 of 72, far faster than a person, and the pattern of corporate link scanners following every link. The Craft Beer Market unsubscribe came 7 seconds after delivery.
- Effect: real prospects are dropped, and unsubscribe counts are unreliable.
- Fix: GET shows a confirmation page with a button; only POST (the button, or a provider's one-click) unsubscribes. The confirmation page should use the venue's region brand and language (today it always says "Kelowna Food Deals" in English, including for Quebec recipients).
- Decision for Mike: whether to leave the ~42 likely-scanner unsubscribes as they are (the conservative choice, recommended) or contact those venues again. Re-adding them without a fresh opt-in is not recommended.

### 3. HIGH: no record of where each address came from
- venues.contact_email has no source field. Addresses come from the venue website (scripts/find-venue-emails.ts reads mailto links) and from a Claude web-search backfill (scripts/_backfill-existing-emails-websearch.ts), which the script's own comment says surfaces "third-party directory listings". The local backfill log shows 1,220 addresses found that way.
- CASL's conspicuous-publication route needs the address published by the recipient or their business, with no "do not contact" notice, and the message relevant to their role. A third-party directory is a weaker basis, and the sender carries the burden of proof.
- Fix: add a source column (website, web search, owner reply, manual) plus the source URL, backfill what can be inferred, and decide a rule (for example: only email addresses taken from the venue's own site or from the owner).

### 4. MEDIUM: 23 percent of first-contact recipients are free personal mailboxes
- 1,379 of 5,945 sends went to gmail, outlook, hotmail, yahoo, icloud and similar. Named-person local parts are 51 percent of sends (the rest are info@, contact@ and similar role addresses). Personal mailboxes are the riskiest category for the conspicuous-publication test.
- Fix: part of item 3's rule.

### 5. LOW to MEDIUM: some English-region venues got French emails
- 32 first-contact sends in Ontario and British Columbia regions had French subjects, for example Ottawa-region venues contacted under "Gatineau Bons Plans" and a Guelph venue under "Laval Bons Plans". The venues were probably in a Quebec region at send time and were re-assigned later. Not a legal problem for those provinces, but it is a mis-assignment worth a data check.

### 6. LOW: the unsubscribe confirmation message
- Plain text, always "Kelowna Food Deals", English only. Covered by item 2's fix.

### 7. LOW: one follow-up sent 1.5 seconds after an unsubscribe
- Nevados (venue 614), 2026-10-09: an ordering effect on the same click, not a pattern. No action.

## Not verified
- Whether the weekly owner digest (lib/weekly-digest.ts) has its own opt-out; it goes to claimed, opted-in owners rather than cold outreach.
- Quebec Charter requirements for one-to-one business email (the regulator's pages could not be read); French-first sending is the safe practice and the data shows it is followed.

## Suggested order
1. Address-level suppression (item 1). Small code change with tests, only reduces sending.
2. GET confirmation page and POST unsubscribe, localized (item 2).
3. Source column and a sending rule (items 3 and 4), which needs a migration and a decision from Mike.
4. Check the 32 re-assigned venues (item 5).
