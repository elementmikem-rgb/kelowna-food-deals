# UBER-REVIEW — Kelowna Daily Specials (kelownafooddeals.shop)

**Repo root:** `C:\kelowna-specials`
**Run:** First uber-review for this project — no prior baseline, no cached findings, full-scope audit.
**Stack:** Next.js 16.3.4 (App Router) · TypeScript · Drizzle + Postgres · Tailwind v4 · Anthropic SDK · Stripe · Brevo · Railway (web + cron)

---

## 1. EXECUTIVE SUMMARY

One unauthenticated admin route (`app/api/admin/submissions/[id]/route.ts`) lets anyone on the internet publish arbitrary content to real Kelowna businesses' listings, and the public `/api/submit` and `/api/report` endpoints have no rate limiting at all — making unbounded Anthropic spend and Brevo quota exhaustion trivially reachable. Beyond security, the review found a consistent theme that cuts at the product's core promise ("verified, not guessed"): the nightly cron records a content hash on extraction failure and then stamps stale rows as "verified today" forever, `getVenueEvents` shows expired events indefinitely, the Castanet refresh deletes before it knows it has replacements, and the homepage JSON-LD advertises every special as in-stock on every day of the week. The architecture itself is sound — the transaction pattern, robots.txt honoring, evidence-quote verification, and fail-closed env guards already exist in the codebase; the defects are almost all cases where an established good pattern was not applied to a second code path.

---

## 2. FINDING COUNT

| Severity | Count |
|---|---|
| CRITICAL | 2 |
| HIGH | 16 |
| MEDIUM | 29 |
| LOW | 22 |
| **Total confirmed** | **69** |

Duplicates across review phases were merged (the missing-auth finding was independently raised four times; `getVenueEvents`, the Castanet delete, and the analytics window each three times). Two Phase-1 claims were **rejected on verification** and are excluded from the count: the `JSON.stringify` XSS-in-JSON-LD claim (already mitigated by `.replace(/</g, "\\u003c")` at `app/page.tsx:28`) and the venue-photo IDOR framing (the real defect is the missing `venues.active` join, retained as LOW-53).

---

## 3. FINDINGS TABLE

### CRITICAL

| Severity | File:Line | Issue | Confidence | Est. Fix |
|---|---|---|---|---|
| CRITICAL | `app/api/admin/submissions/[id]/route.ts:14` | Only `/api/admin/*` route with no `isAdminAuthed()` — full unauthenticated publish-to-live-site | Confirmed (live prod) | 10 min |
| CRITICAL | `app/api/submit/route.ts:47` | Public unauthenticated Claude vision call, no rate limit, no spend cap | Confirmed | 2–4 h |

**C-1 — Unauthenticated admin submission approve/reject.**
`proxy.ts:20` has `matcher: ["/admin/:path*"]`, which does not match `/api/admin/*`, and `proxy.ts:7` early-returns for anything not starting with `/admin`. `lib/admin-auth.ts:5-7` documents this exact hazard in a comment. The other three admin routes (`inbox/send:16`, `inbox/mark-read:10`, `outreach/send:26`) all guard; this one never even imports the helper. Live confirmation: unauthenticated `POST /api/admin/submissions/999999999` returns `400 {"error":"invalid action"}` while the control `POST /api/admin/outreach/send` returns `401 {"error":"unauthorized"}`.

Full self-serve chain, no secret guessing: POST `/api/submit` with text crafted to score below 0.85 so it parks at `needs_review` (`route.ts:118`) → POST `/api/admin/submissions/<id>` with `{"action":"approve","itemType":"special","itemIndex":0}` → row inserted into `specials` with `archivedAt` null → live on the homepage via `lib/data.ts:41-49`. `submissions.id` is a `serial`, so enumeration is trivial, and the 404/409/400 responses are a free state oracle. The same route lets an attacker `reject` every genuine pending submission (silently, since the admin never sees them again) and publishes attacker-supplied photo bytes via `savePhotoOnApproval` at `:102-114`.

**Fix:** add as the first statement of `POST`:
```ts
import { isAdminAuthed } from "@/lib/admin-auth";
if (!isAdminAuthed(req)) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
```
Then close the class of bug: export a single `ADMIN_COOKIE` constant, and either extend `proxy.ts` `matcher` to `["/admin/:path*", "/api/admin/:path*"]` with a login exemption, or introduce a `withAdmin(handler)` wrapper so omitting the guard becomes structurally impossible rather than a thing to remember (see LOW-52).

**C-2 — Unmetered AI spend on a public endpoint.**
`app/api/submit/route.ts:47` calls `reviewSubmission(text, photoBase64, photoMimeType)` with only `safeParse`, a MIME check, a 4MB size check, and a venue-existence lookup ahead of it. Every request is a Haiku vision call with `max_tokens: 8192` (`lib/submission-review.ts:107`) and up to a 4MB image. Repo-wide grep for `ratelimit|throttle|upstash|captcha|turnstile|recaptcha` across `app/ lib/ cron/ db/ components/ scripts/ proxy.ts next.config.ts` returns only `cron/rateLimit.ts` and its `cron/fetch.ts` call sites — an outbound scrape-pacing delay that never touches an inbound route. `next.config.ts` is an empty object; the Dockerfile runs `next start` with no proxy or WAF. Each request also writes a permanent `submissions` row storing the full base64 blob in Postgres (`db/schema.ts:152` — `photoData` is a `text` column, no object store).

**Fix:** per-IP rate limit on `/api/submit` (and `/api/report`, `/api/track`) — Upstash Redis or a Postgres counter table keyed on IP+hour is enough at this scale. Add a daily global Anthropic call ceiling that hard-fails the endpoint, mirroring `TOKEN_CEILING` in `cron/index.ts:15`. Move photo bytes out of Postgres to object storage.

---

### HIGH

| Severity | File:Line | Issue | Confidence | Est. Fix |
|---|---|---|---|---|
| HIGH | `app/api/admin/login/route.ts:8` | Zero brute-force protection on the entire auth system | Confirmed | 1–2 h |
| HIGH | `lib/submission-review.ts:96` | No `evidence_quote` verification on the public path; raw user text interpolated into prompt, auto-published at ≥0.85 | Confirmed | 3–4 h |
| HIGH | `app/api/submit/route.ts:139` | Visitor photo published to a real business's public gallery with zero image moderation | Confirmed | 2 h |
| HIGH | `app/api/report/route.ts:41` | Unauthenticated unbounded Brevo send; row lookup result never checked | Confirmed | 1 h |
| HIGH | `lib/outreach-email.ts:31` | CASL violation: no unsubscribe, no mailing address, no suppression list | Confirmed | 4–6 h |
| HIGH | `cron/index.ts:86` | Extraction failure records the NEW content hash → venue permanently frozen, falsely "verified today" | Confirmed | 15 min |
| HIGH | `cron/scrapeCastanet.ts:180` | DELETE runs before the empty-result guard, outside a transaction → wipes the whole events feed | Confirmed | 30 min |
| HIGH | `lib/group-days.ts:35` | Grouping key omits `venueId` → one venue's special published under another venue's name | Confirmed | 15 min |
| HIGH | `app/sitemap.ts:9` | Sitemap prerendered at build time, `lastModified` frozen to build timestamp | Confirmed (build output) | 1 h |
| HIGH | `lib/seo.ts:8` | Homepage JSON-LD marks all 121 specials `InStock` regardless of day-of-week | Confirmed (build output) | 1 h |
| HIGH | `lib/venues-data.ts:150` | `getVenueEvents` has no `specificDate` filter → expired events render as current forever | Confirmed | 20 min |
| HIGH | `app/api/submit/route.ts:154` | Non-transactional multi-insert + missing date/time regexes → partial publish, orphaned rows | Confirmed | 2 h |
| HIGH | `app/api/admin/submissions/[id]/route.ts:117` | Lost update on `resolvedItemKeys` (read-modify-write, no lock) | Confirmed | 45 min |
| HIGH | `cron/index.ts:54` | No run-level lock; check-then-act on content hash → two active special sets live simultaneously | High | 1 h |
| HIGH | `cron/extract.ts:123` | UTC date labeled to the model as the Kelowna date → one-off event dates off by one after 5pm PT | Confirmed | 15 min |
| HIGH | `lib/submission-review.ts:6` | Anthropic client with no `timeout`/`maxRetries` → 30-min hung connection, 3× silent billing | Confirmed (SDK source) | 10 min |

**H-3 — No brute-force protection.** `app/api/admin/login/route.ts` is the entire authentication system: one shared password, no username, no second factor, no rate limit, no lockout, no backoff, no CAPTCHA, no delay. The endpoint is publicly discoverable (`app/admin/login/page.tsx` posts to it). Whatever entropy `ADMIN_PASSWORD` has is the only barrier to sending Brevo email as the site.
**Fix:** per-IP + global attempt counters with exponential backoff and a lockout after ~10 failures; log every attempt (see LOW-50). Consider moving to a per-admin credential with a signed session (see MEDIUM-19).

**H-4 — Submission path publishes with weaker verification than the scraper it feeds.** `cron/extract.ts:241` enforces `if (!haystack.includes(quote)) continue;` plus a `DISCOUNT_SIGNAL` check — the verbatim anti-hallucination gate the blog copy explicitly promises (`lib/blog-data.ts:30`: *"the system extracting the special has to quote the exact words that prove it… If it can't find that verbatim text, the item gets dropped."*). None of the three schemas in `lib/submission-review.ts:10-48` has an `evidence_quote` field, and no verification pass exists in the file. `lib/submission-review.ts:96` interpolates `User-submitted description: "${text}"` straight into the user content block. `venueId` is validated only for existence (`route.ts:41`) — there is no ownership concept. So attacker prose is simultaneously the claim and its own evidence, and `route.ts:54` publishes it under a named real business with `extractionNotes: "Submitted by a visitor, AI-verified."`
**Fix:** add `evidence_quote` to all three schemas, port the `haystack.includes(quote)` + `DISCOUNT_SIGNAL` checks from `cron/extract.ts` into `lib/submission-review.ts`, and move the submitted text into a clearly delimited untrusted block rather than inline interpolation.

**H-5 — Unmoderated photo publication.** `route.ts:139` gates on `photoBase64 && photoMimeType && autoApprovedCount > 0`. `autoApprovedCount` counts *text extraction* items ≥0.85; `SYSTEM_PROMPT` (`lib/submission-review.ts:55-79`) contains no instruction to judge image appropriateness — `:75` defines confidence purely as certainty the *extraction* is accurate. From there it is live with no further review: `lib/venue-photos.ts:15` inserts, `lib/venues-data.ts:103` returns it with no approval filter (`venue_photos` has no approval column, `db/schema.ts:182-194`), `app/venues/[id]/page.tsx:184-192` renders it under "Submitted by visitors", `:76-79` injects it as the schema.org `FoodEstablishment` image, and `app/api/venue-photos/[id]/route.ts:26` serves it with `Cache-Control: public, max-age=31536000, immutable`. There is no photo-deletion endpoint anywhere in `app/api`, and `app/api/report/route.ts:10` only accepts `kind: "special" | "event"` — photos cannot even be reported. One text submission scoring 0.85 attaches any 4MB image to any Kelowna business's listing, with no account and no way for the business to contest it.
**Fix:** route all photos through admin review regardless of text confidence (add `approved boolean default false` to `venue_photos` and filter on it in `getVenuePhotos` + the serving route), add a photo-removal admin action, and add `kind: "photo"` to the report endpoint.

**H-6 — Report endpoint sends on nonexistent rows.** `route.ts:41` does `const row = rows[0]` and never checks for undefined; `:43` and `:50` coalesce to `"unknown"` and `:46` sends anyway. So `{"specialId":1}` in a loop is unlimited mail to `REPORT_EMAIL_TO` with zero reconnaissance. Consequence chain: founder's inbox floods, the shared `BREVO_API_KEY` quota burns, and that also kills `lib/outreach-email.ts` — venue outreach and inbox replies, the actual BD channel, go down as collateral. Sustained abuse risks the sending domain being throttled or the Brevo account suspended.
**Fix:** `if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 400 });` before the send, plus per-IP rate limiting and dedupe on `(kind, id, day)`.

**H-7 — CASL exposure on cold outreach.** `lib/outreach-email.ts:31-37` sends `{sender, to, replyTo, subject, htmlContent}` with **no `headers` key** — no `List-Unsubscribe`, no `List-Unsubscribe-Post`. `app/api/admin/outreach/send/route.ts:21` ends the body at `<p>Thanks,<br>Mike</p>` with no unsubscribe link and no physical mailing address. Canada's CASL requires both for every commercial electronic message, valid 60 days, and B2B email to a published business address is **not** exempt in Canada (unlike CAN-SPAM). There is also no suppression list — nothing in `db/schema.ts` records opt-out, so a venue that replies "stop" leaves no state and `components/AdminOutreachRow.tsx:54` still shows a live "Send again" button (client state only, reset by reload; `route.ts:49-61` inserts then sends with no prior-send lookup). Compounding it, prospecting mail goes through Brevo's *transactional* endpoint `/v3/smtp/email`, which bypasses Brevo's own unsubscribe handling and violates its AUP separation — complaints land on the same sender identity used for `/api/report` alerts.
**Fix:** add an `unsubscribed_at` column to `venues`, an unsubscribe token route, the `List-Unsubscribe` + `List-Unsubscribe-Post` headers, a footer with the link and a mailing address, a server-side already-sent check, and move outreach to Brevo's marketing/campaign path. This is the one finding with regulatory rather than technical downside — treat it as blocking further outreach sends.

**H-8 — Extraction failure permanently freezes a venue and lies about freshness.** `cron/index.ts:86-92` logs `contentHash: hash` on the extraction-failure path (contrast the *correct* fetch-failure path at `:41-47`, which uses `contentHash: null`). `cron/upsert.ts:126` filters only `isNotNull(scrapeRuns.contentHash)` with no `error` predicate, so the next night `previousHash === hash` at `:56` and the run short-circuits to `markVenueStillCurrent`, which sets `lastVerifiedAt = now` on every non-archived special and event for the venue (`cron/upsert.ts:5-15`). Extraction is never retried until the source page text happens to change again, while `lib/time.ts:43` returns "verified today" and `components/VerifiedBadge.tsx:16` renders `✓ checked verified today` — for data that was never re-verified. `scrape_runs.error` is read by nothing in the repo (`lib/status.ts:6-8` reads only `ranAt`), so the failure is invisible. One transient Anthropic 429 does this permanently.
**Fix (one line):** change `contentHash: hash` to `contentHash: null` in the catch block. Belt-and-braces: add `isNull(scrapeRuns.error)` to `getLastContentHash`. Then surface `scrape_runs.error` on the admin status page.

**H-9 — Castanet refresh deletes before it knows it has replacements.** `scrapeCastanet.ts:180` hard-deletes every Castanet-sourced event; the guard `if (parsed.length === 0) return { inserted: 0 };` is on `:182` — one line too late. `fetchAndParse` swallows every failure into `[]`: non-2xx returns `[]` at `:103-105` (console.error only), a markup change dropping the `#event_list` selector returns `[]` at `:110`. Both pages come from the same origin and are fetched together, so one outage or one selector rename empties the entire "One-Off & Upcoming" column of `/events`. The caller cannot tell: `cron/index.ts:120-121` logs `Castanet events: refreshed 0 nightlife-adjacent event(s)` as a success, and the try/catch at `:122` never fires because nothing threw. The delete and insert are also not wrapped in a transaction, so one unparseable time in the insert leaves the same empty state.
**Fix:** move the empty check above the delete, wrap delete+insert in `db.transaction` (the pattern already exists at `cron/upsert.ts:25` and `:57`), and make `fetchAndParse` throw rather than return `[]` on HTTP failure so the caller can distinguish "quiet night" from "outage".

**H-10 — Cross-venue special misattribution on the homepage.** `lib/group-days.ts:35` builds the key from `title|description|priceCents|category|startTime|endTime` with no `venueId`, and `:50` does `result.push({ ...group[0], dayLabel })`, discarding every other member. On `app/venues/[id]/page.tsx:200` this is safe (single-venue input); `components/PreviousSpecials.tsx:9` is the broken call site — it is mounted at `app/page.tsx:39` with `getPreviousSpecials()`, which joins across *all* active venues (`lib/data.ts:63-73`). Concretely: Baxter's "Half Price Wings" (Wed) and Train Station Pub's "Half Price Wings" (Wed) collapse into one card reading "Baxter's Bar & Grill — Half Price Wings", and `dayRangeLabel` merges both venues' days into a fabricated range. The file's own header comment scopes it to "a venue's detail page."
**Fix:** include `venueId` in the key.

**H-11 — Sitemap frozen at build time.** `/sitemap.xml` has no `export const revalidate` and uses no request-time API, so Next 16 statically prerenders it — `.next/prerender-manifest.json` records `{"compute":"static","initialRevalidateSeconds":false}` and `.next/server/app/sitemap.xml.body` is a baked 67-URL file inside the image (the Dockerfile passes `ARG DATABASE_URL` at `:33-34` specifically so the query can run during `npm run build`). Three live consequences: venues added by the nightly cron never appear until a redeploy; `lastModified: new Date()` at `:16` froze to one string — 62 of the 67 URLs share the identical `2026-09-05T15:46:54.740Z`, so the homepage claims `changefreq hourly` while advertising a lastmod that will never change, a worse signal than omitting it; and a venue later set `active=false` stays in the baked sitemap while the page calls `notFound()`, producing "Submitted URL not found (404)" in Search Console.
**Fix:** `export const revalidate = 3600` to match the pages, and derive `lastModified` from `max(specials.lastVerifiedAt)` per venue — note `venues` has **no** `updatedAt` column (`db/schema.ts:19-41`), so the obvious `venue.updatedAt` does not exist.

**H-12 — Structured data contradicts the page.** `lib/seo.ts:8` maps the unfiltered `getAllSpecialsWithVenue()` result (`lib/data.ts:46` filters only on `venues.active` and `isNull(archivedAt)`), while `components/SpecialsBoard.tsx:27-28` shows only today's. Measured on `.next/server/app/index.html`: 121 Offer items, 121/121 `InStock`, and `validFrom`/`validThrough`/`availabilityStarts`/`eligibleDuration` present **zero** times. Of 88 unique JSON-LD titles, 47 do not appear in the rendered DOM — 59 of 121 offers advertise a special the prerendered page does not display. (Two nuances that soften the framing but not the defect: those 47 are reachable via day tabs and present in the RSC flight payload, which Google treats as tabbed on-page content; and the monthly clause is vacuous in this build — `MonthlySpecials` is a separate visible section and currently renders zero items.) Separately, `lib/seo.ts:17` also ignores `s.lastVerifiedAt` entirely, so a special the UI itself greys out as stale (`lib/time.ts:37`, `STALE_DAYS = 60`, acted on at `SpecialCard.tsx:21` and `VerifiedBadge.tsx:4`) is still published to crawlers as `InStock`.
**Fix:** filter the JSON-LD to today's specials, emit `availabilityStarts`/`eligibleDuration` or per-day `Offer` variants, and gate on `isStale(s.lastVerifiedAt)` — omit those or downgrade to `LimitedAvailability`.

**H-13 — Expired events on venue pages.** `lib/venues-data.ts:150` filters only `and(eq(events.venueId, venueId), isNull(events.archivedAt))`. Contrast `lib/events-data.ts:98-103`, which applies `gte(events.specificDate, today)` and `lte(events.specificDate, untilStr)`. Nothing in the repo archives an event once its date passes: the only events-archiving write is `cron/upsert.ts:60`, reached only on the changed-hash branch. Worse, `markVenueStillCurrent` bumps `lastVerifiedAt` on those past-dated rows nightly, so `isStale()` never fires and `VerifiedBadge` renders `✓ checked today` next to a concert from six months ago. `lib/format.ts:25` omits the year, so "Sat, Mar 8" reads as upcoming.
**Fix:** add `or(isNull(events.specificDate), gte(events.specificDate, today))` to `getVenueEvents`, and add a nightly job that archives one-off events past their date.

**H-14 — Partial publish with no record.** `app/api/submit/route.ts:52-114` runs three sequential insert loops with no `db.transaction` wrapper; the `submissions` bookkeeping row is written only afterwards at `:120`. `lib/submission-review.ts:16-17,28` declares `start_time`/`end_time`/`specific_date` as bare `z.string().nullable()` — no regex — while `cron/extract.ts:17-24,36-39` applies `/^\d{2}:\d{2}(:\d{2})?$/` and `/^\d{4}-\d{2}-\d{2}$/`, and `db/schema.ts:96-97,123` uses real `time()`/`date()` columns. A model returning "next Friday" or "3pm" throws mid-loop: items 1–2 are already committed and live, item 3+ are lost, and control jumps to the catch at `:154` which inserts a *second* `submissions` row with `aiExtracted: null` and no `resolvedItemKeys` — so nothing links the published rows to the submission, and the admin can double-publish them.
**Fix:** wrap `:52-137` in `db.transaction`, and copy the two regexes from `cron/extract.ts` into `lib/submission-review.ts`.

**H-15 — Lost update on `resolvedItemKeys`.** The array is read at `:29-33`, checked at `:40`, and rewritten wholesale at `:117` (`[...submission.resolvedItemKeys, itemKey]`) with an unconditional update at `:122-129` — no transaction, no row lock. `AdminSubmissionRow.tsx:42` keeps per-card state, so approving two cards quickly is the normal path to this race, and the two writes are `SELECT` snapshots taken before either wrote.
**Fix:** move the read+write into one `db.transaction` with `SELECT … FOR UPDATE`, or use a Postgres array append (`array_append`) in a single statement.

**H-16 — No cron run lock.** `cron/index.ts:54` reads the previous hash, `:56` compares, `:70-79` extracts and replaces, and logs the hash *last*. Two overlapping invocations both conclude the venue changed and each archive-then-insert, leaving two full sets of active specials/events on the site. Grep for `pg_try_advisory|for update|SKIP LOCKED` across `app/ lib/ cron/ db` returns no hits.
**Fix:** wrap the whole run in `pg_try_advisory_lock` and bail if not acquired.

**H-17 — Wrong date given to the extraction model.** `cron/extract.ts:123` sends `Today's date is ${new Date().toISOString().slice(0,10)} (Kelowna, BC)` while `:86` instructs the model to "resolve the year yourself using the current date given below." The Dockerfile sets no `ENV TZ` and the base is `node:22-alpine` (UTC), so from 5pm Pacific onward the model receives tomorrow's date labeled as today's Kelowna date. Every other date path in the repo is correctly pinned — `lib/events-data.ts:42` and `cron/scrapeCastanet.ts:64-67` both use `America/Vancouver`. This is the only `toISOString()` date-to-model path.
**Fix:** use the existing `pacificTodayISODate()` helper.

**H-18 — Anthropic client defaults on a public path.** `lib/submission-review.ts:6` constructs `new Anthropic({ apiKey })` with no `timeout` and no `maxRetries`. SDK defaults apply: `DEFAULT_TIMEOUT = 600000` (10 min) and `maxRetries = 2`, retrying on 408/409/429/≥500 (`node_modules/@anthropic-ai/sdk/client.js:104,113,731-740`). A single public request can therefore hold a Next.js server connection for ~30 minutes and be billed up to 3×. `SubmitForm` sends no `AbortController`; the Dockerfile runs `next start` (self-hosted, no platform function timeout); `maxDuration` appears nowhere in `app/`.
**Fix:** `new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 })` and add `export const maxDuration` to the route.

---

### MEDIUM

| Severity | File:Line | Issue | Confidence | Est. Fix |
|---|---|---|---|---|
| MEDIUM | `app/api/admin/login/route.ts:24` | Session cookie value *is* `ADMIN_SESSION_SECRET` — no HMAC, no nonce, unrevocable | Confirmed | 2 h |
| MEDIUM | `app/api/admin/login/route.ts:29` | 30-day maxAge and no logout route anywhere | Confirmed | 30 min |
| MEDIUM | `cron/extract.ts:241` | Evidence check never validates the claimed price; discount gate skipped when price non-null | Confirmed | 1 h |
| MEDIUM | `cron/extract.ts:113` | Silent 20k truncation + archive-then-insert = deletes already-published specials | Confirmed | 1 h |
| MEDIUM | `cron/upsert.ts:29` | Archive predicate ignores provenance → visitor submissions destroyed nightly | Confirmed | 45 min |
| MEDIUM | `lib/data.ts:68` | "Previously Featured" fills with currently-running specials | High | 1 h |
| MEDIUM | `app/api/admin/submissions/[id]/route.ts:126` | Rejecting every item marks the submission "approved"; no audit trail | Confirmed | 45 min |
| MEDIUM | `app/api/admin/submissions/[id]/route.ts:122` | Approve path non-transactional; duplicate guard is a read-then-write race | Confirmed | 1 h |
| MEDIUM | `app/api/admin/submissions/[id]/route.ts:72` | Admin approve skips the event day/date gate the auto path enforces | Confirmed | 15 min |
| MEDIUM | `app/api/submit/route.ts:157` | AI-failure submissions are permanently unresolvable and clog the queue | Confirmed | 1 h |
| MEDIUM | `app/submit/page.tsx:13` | No `revalidate`/`dynamic` → venue dropdown frozen at build time | Confirmed (manifest) | 5 min |
| MEDIUM | `components/SpecialsBoard.tsx:19` | "Today" frozen in ISR HTML + at mount → wrong day's specials, hydration flip | Confirmed | 2 h |
| MEDIUM | `app/events/page.tsx:9` | Server-side date cutoff frozen by ISR; calendar and list disagree | Confirmed | 2 h |
| MEDIUM | `app/admin/outreach/page.tsx:12` | Outreach + compose lists include inactive venues; email links to a 404 | Confirmed | 20 min |
| MEDIUM | `components/EventCard.tsx:73` | `null` cover ("not stated") renders as an affirmative "Free" | Confirmed | 30 min |
| MEDIUM | `cron/scrapeCastanet.ts:46` | Cover-charge regex misses "Tickets $25", "$20 at the door", "$12.5" | Confirmed (executed) | 30 min |
| MEDIUM | `cron/scrapeCastanet.ts:157` | Castanet scraper bypasses `rateLimit()` and `isAllowedByRobots()` entirely | Confirmed | 30 min |
| MEDIUM | `cron/scrapeCastanet.ts:174` | Venue-name match includes inactive venues → event silently disappears | Confirmed | 10 min |
| MEDIUM | `lib/seo.ts:23` | `addressLocality` hardcoded "Kelowna" for all 121 offers; 13 venues are not in Kelowna | Confirmed (build output) | 1–2 h |
| MEDIUM | `lib/analytics.ts:61` | `buildWindow` does no day alignment despite its comment; trend buckets by Pacific day | Confirmed | 1 h |
| MEDIUM | `components/MonthlySpecials.tsx:13` | Server-side `new Date().getMonth()` = UTC month, not Pacific | Confirmed | 10 min |
| MEDIUM | `lib/inbox-data.ts:93` | Thread preview reads `textBody` only → blank rows for HTML-only replies, invisible to search | Confirmed | 30 min |
| MEDIUM | `lib/inbox-data.ts:84` | Thread identity keyed on case-sensitive exact `contactEmail`; `inReplyTo` never used | Confirmed | 2–3 h |
| MEDIUM | `lib/outreach-email.ts:32` | From name "Kelowna Daily Specials" vs body "I run Kelowna Food Deals" — reads as phishing | Confirmed | 15 min |
| MEDIUM | `lib/brevo.ts:15` | No `AbortSignal` timeout and no retry on either Brevo call | Confirmed | 45 min |
| MEDIUM | `app/api/webhooks/brevo-inbound/[token]/route.ts:42` | No idempotency on `MessageId`, no unique constraint → duplicated inbound on retry | Confirmed | 30 min |
| MEDIUM | `app/api/admin/submissions/[id]/route.ts:102` | Photo existence-check → unguarded insert; no unique index on `submission_id` | Confirmed | 20 min |
| MEDIUM | `components/SubmitForm.tsx:53` | No client-side size check or downscale before base64 → real phone photos silently fail | Confirmed | 1 h |
| MEDIUM | `app/api/webhooks/brevo-inbound/[token]/route.ts:23` | Shared secret carried in the URL path → lands in access logs | Confirmed | 1 h |
| MEDIUM | `cron/index.ts:90` | Tokens burned by post-call failures logged as 0 → `TOKEN_CEILING` under-counts | Confirmed | 20 min |

**M-19/M-20 — Session design.** `login/route.ts:24` sets the cookie value to `process.env.ADMIN_SESSION_SECRET` verbatim; both consumers (`proxy.ts:11`, `lib/admin-auth.ts:10`) do a bare equality check against the same variable. No `crypto`, `sign`, or `jwt` import exists anywhere in `lib/`. Two consequences beyond "a leak is bad": the cookie is identical on every device and every login so it can never be individually revoked (the only revocation is editing the Railway var and redeploying, logging out every browser), and anything that surfaces the env var — a build log, an error dump, `railway variables`, a screenshot — *is* a working session cookie. Compounding it, `maxAge` is 30 days and `grep -rniE "logout|sign.?out" app/ lib/ components/` returns zero hits — there is no way to end a session from inside the product.
**Fix:** issue an HMAC-signed cookie carrying a random session id and an expiry (so the secret can rotate without ever being in the cookie), shorten `maxAge`, and add `POST /api/admin/logout` setting the cookie with `maxAge: 0` — the precedent already exists at `app/api/track/exclude/route.ts:16-20`.

**M-21 — The evidence check validates the wrong field.** `cron/extract.ts:28` declares `evidence_quote: z.string().min(1)` — a single character passes. `:108-110` lowercases and collapses whitespace, so the `:241` `haystack.includes(quote)` test is case- and whitespace-insensitive and any trivial fragment on the page satisfies it. Critically, `:247` reads `if (s.price_cents === null && !DISCOUNT_SIGNAL.test(s.evidence_quote))` — the short-circuit means the discount-language check is **skipped for every priced special**. Nothing in the file compares `s.price_cents` against the quote or the haystack; the price flows straight to `cron/upsert.ts:36`. So a fabricated `price_cents: 500` on a page that never says $5 publishes as long as the model quotes any real substring like "wings." This is the site's single load-bearing accuracy control.
**Fix:** require a meaningful minimum quote length (~20 chars), and when `price_cents` is non-null, assert the formatted price string appears inside `evidence_quote`.

**M-22 — Truncation deletes published data.** `cron/extract.ts:113` does `pageText.slice(0, 20000)` with no length check and no log. `cron/hash.ts:3-9` collapses the entire page to one line first, so 20k characters is only ~3,000–3,500 words — a fairly small full menu. Because `replaceVenueSpecials` (`cron/upsert.ts:29`) archives every active special *before* inserting whatever came back, and the `if (extracted.length === 0) return;` guard comes *after* the archive, every special living past the cutoff is archived out of the live site and reappears under "Previously Featured" as though the venue cancelled it.
**Fix:** log when truncation occurs (with the dropped byte count) and chunk long pages across multiple extraction calls rather than dropping the tail.

**M-23 — Cron destroys visitor submissions.** `cron/upsert.ts:26-29` archives on `venueId + isNull(archivedAt)` with no provenance filter, and `:58-61` does the same for events. Visitor rows are written with `sourceUrl: null` and `extractionNotes: "Submitted by a visitor, AI-verified."` (`app/api/submit/route.ts:66-68`) — the marker exists and is simply never consulted. So the first time a venue's own website changes, every visitor contribution for it is stamped `archivedAt` and republished by `PreviousSpecials.tsx:36` as "· replaced N days ago" — a special a visitor correctly reported yesterday, presented today as expired. The inverse is equally wrong: `markVenueStillCurrent` bumps `lastVerifiedAt` on those same photo-sourced rows every quiet night, so they read "verified today" forever and can never trip `isStale`.
**Fix:** add `isNotNull(specials.sourceUrl)` to both the archive and the `markVenueStillCurrent` predicates, so cron only touches rows cron owns.

**M-24 — "Previously Featured" shows current specials.** `lib/data.ts:63-73` selects any archived row with no anti-join against currently-active identical rows and no per-venue cap. Since `replaceVenueSpecials` re-archives and re-inserts the venue's *entire* set on every hash change, and `cron/hash.ts` only lowercases and collapses whitespace (no stripping of dates, counters, or rotating banners), a venue page with a cache-buster flips the hash nightly and the same live special is re-archived every night — shown under "What used to be running before venues changed it up" while simultaneously current on the board above.
**Fix:** anti-join against active rows on the same grouping key, add a per-venue cap, and make `normalizeText` strip obvious volatile content.

**M-25 — Reject is recorded as approve.** `route.ts:117-129` runs unconditionally after the approve-only block closes at `:115`, with `status: fullyResolved ? "approved" : "needs_review"` keyed only on whether all item keys are resolved, never on the action taken. The string `"rejected"` is never written by this handler (`grep '"rejected"'` → only `app/api/submit/route.ts:118`, `components/SubmitForm.tsx:8`, `db/schema.ts:141`), and `resolvedItemKeys` records only `${itemType}:${itemIndex}` with no verdict. A submission where every item was rejected is byte-identical to one where every item was approved: no audit trail, no way to identify abusive submitters, no way to measure the false-positive rate of the 0.85 gate, and any future reprocessing of "approved" submissions would republish explicitly rejected content.
**Fix:** store `{key, action, at}` objects instead of bare key strings, and add a `"rejected"` terminal status.

**M-30/M-31 — ISR vs. "today."** `components/SpecialsBoard.tsx:19-20` computes `today` in a `useMemo(…, [])` and seeds `useState(today)` — both initial-only — and `app/page.tsx:12` sets `revalidate = 3600` with stale-while-revalidate. On a low-traffic hyperlocal site the first visitor after any idle gap gets the previous generation, routinely the previous evening's: wrong day tab selected, wrong specials, "Wednesday (today)" on a Thursday, and a visible hydration flip when the client recomputes. The events page is worse because it filters on the *server*: `lib/events-data.ts:68` computes `today` at render time and `:100` filters `gte(events.specificDate, today)`, so a cache entry generated yesterday lists yesterday's concerts while `EventsBoard.tsx:33` computes `todayKey` live in the browser — calendar and list disagree. `EventsCalendar.tsx:30-32` also seeds `viewYear`/`viewMonth` from that frozen key. Separately, `lib/events-data.ts` builds the `until` bound with server-local arithmetic then formats it in Pacific, so on a UTC server the window is 20 days, not the declared 21, for most of the Pacific evening.
**Fix:** make the day-dependent shell dynamic (or drop revalidate to a few minutes), recompute `today` on an interval and on `visibilitychange`, and compute the `until` bound in Pacific.

**M-36 — Wrong city in structured data.** `lib/seo.ts:23` and `app/venues/[id]/page.tsx:69` both hardcode `addressLocality: "Kelowna"` — repo-wide grep for `addressLocality|parseCity|extractCity` returns only those two lines, no guard. But `app/layout.tsx:28` describes the site as covering "Kelowna, West Kelowna, Lake Country, and Peachland, BC", `cron/scrapeCastanet.ts:20` matches all four, and `scripts/seed-venues.ts` seeds 13 venues outside Kelowna (e.g. `:373` "5866B Beach Ave, Peachland, BC"). Build output: 121 × `addressLocality":"Kelowna"`, 0 × anything else. On the venue page it is self-contradictory — `streetAddress: venue.address` already contains "…Peachland, BC" while the sibling field says Kelowna. This pollutes exactly the local-pack signals for the secondary towns `app/layout.tsx:43-46` targets as keywords ("West Kelowna happy hour", "Lake Country BC restaurants", "Peachland restaurants").
**Fix:** parse the city out of `venues.address` at seed time into a dedicated `city` column and use it in both JSON-LD sites; stop restating city/province/postal in `streetAddress`.

**M-33/M-34 — Ticketed events advertised as Free.** `cron/scrapeCastanet.ts:46` requires the amount to immediately precede `cover|ticket|admission|door`. Executed against the real regex: `"$12.5 cover"` → null, `"Tickets $25"` → null, `"$20 at the door"` → null, `"Cover $10"` → null, `"tickets are $30"` → null. And `"$20 advance / $25 door"` → 2500 — it silently picks the door price over advance. `db/schema.ts:126` documents the two collapsed meanings in its own comment (`// null = free / not stated`), and both renderers resolve the ambiguity affirmatively: `EventCard.tsx:73` and `EventRow.tsx:55` are byte-identical `{event.coverChargeCents ? \`${cover} cover\` : "Free"}` with no third state. `ALLOWED_CATEGORIES` (`:12-18`) explicitly admits "concerts" and "comedy" — the two most commonly ticketed categories.
**Fix:** render `null` as "Cover not listed" and reserve "Free" for an explicit `0`; broaden the regex to handle keyword-before-amount and prefer the lowest price when a range is present.

**M-35 — Castanet scraper is the one path with no crawl controls.** `grep -n "rateLimit|isAllowedByRobots|await fetch" cron/scrapeCastanet.ts` returns exactly one line — the bare `fetch` at `:102`. Neither helper is even imported. `scrapeCastanetEvents()` fires both requests concurrently via `Promise.all` at `:157-160`, so castanet.net (a third-party news outlet, not a partner venue) takes two simultaneous hits nightly from a bot that never reads their robots.txt — while every venue site gets the polite serialized, robots-checked treatment in `cron/fetch.ts:46-57`. Live `castanet.net/robots.txt` disallows `/events_dev/` but not `/events/`, and has no `Crawl-delay` — so the current behavior is not *violating* their file, but it is the single most likely path to an IP block, and the one path with no guard.
**Fix:** route both fetches through `fetchAndExtractText`/`rateLimit()` like every other request.

**M-40 — Replies land in orphan threads.** `lib/inbox-data.ts:84` keys threads on `venueId`, which the webhook sets only by exact match on the from-address (`eq(venues.contactEmail, fromEmail)` at `route.ts:37`). The webhook lowercases the sender (`:31`) but nothing ever normalizes `venues.contactEmail` — no code path in the repo writes that column, and migration `0007_black_spectrum.sql:30` adds it as plain `text` with no index and no `lower()`. So a venue recorded as `Info@Venue.com` will never match its own reply. And the most common real pattern — you email `info@venue.com`, the owner replies from her personal address — produces `venueId` NULL and files the reply as an orphan `u{email}` thread with no link to the outreach that provoked it. `inboundEmails.inReplyTo` and `outreachSends.brevoMessageId` are both captured and stored but appear only in write positions, never in a where clause — the stitching join simply is not made.
**Fix:** normalize `contactEmail` on write and compare with `lower()`, and add a fallback join on `inReplyTo → brevoMessageId`.

**M-47 — Token accounting misses failed-after-call spend.** `cron/extract.ts:220` computes `tokensUsed` *before* the throws at `:224` and `:229`, but `cron/index.ts:84-95` logs `tokensUsed: 0` and returns `{ tokensUsed: 0 }` on the catch path. A systematic post-call failure (schema mismatch, a throw inside `replaceVenueSpecials` at `index.ts:71-72`, which sits in the same try) burns full input+output tokens on every one of ~60 venues while `TOKEN_CEILING = 50_000` never advances and never aborts the run. The `tokensUsed` column is also written (`cron/upsert.ts:90`) and read nowhere.
**Fix:** thread the real token count out of the failure path, and surface cumulative spend on the admin status page.

---

### LOW

| Severity | File:Line | Issue | Confidence | Est. Fix |
|---|---|---|---|---|
| LOW | `app/api/admin/login/route.ts:19` | Non-constant-time password compare (also `admin-auth.ts:10`, `proxy.ts:11`) | Confirmed | 10 min |
| LOW | `app/api/admin/login/route.ts:6` | `z.string().min(1)` with no `.max()`; body buffered before Zod → memory DoS | Confirmed | 20 min |
| LOW | `app/api/admin/login/route.ts:8` | No logging on either the success or failure branch | Confirmed | 30 min |
| LOW | `proxy.ts:8` | Unreachable `/api/admin/login` clause that misleads readers into thinking `/api/admin/*` is gated | Confirmed | 5 min |
| LOW | `lib/admin-auth.ts:10` | Auth logic duplicated across 3 files; enforcement is opt-in per route | Confirmed | 1 h |
| LOW | `lib/venues-data.ts:96` | Photos served for deactivated venues, `max-age=31536000, immutable` | Confirmed | 20 min |
| LOW | `app/api/admin/inbox/send/route.ts:26` | No HTML entity escaping → `<`, `>`, `&` mangled in real venue emails | Confirmed | 15 min |
| LOW | `app/api/admin/outreach/send/route.ts:15` | `venueName` interpolated unescaped into persisted HTML rendered via `dangerouslySetInnerHTML` | Confirmed | 15 min |
| LOW | `app/api/track/route.ts:20` | No rate limit on the analytics write endpoint; every branch returns 200 | Confirmed | 30 min |
| LOW | `app/api/track/exclude/route.ts:16` | `kds_dnt` set without `httpOnly`/`secure` (intentional, but scriptable) | Confirmed | 10 min |
| LOW | `app/api/tip/checkout/route.ts:22` | `Origin` header flows unvalidated into Stripe `success_url`/`cancel_url` | Confirmed | 10 min |
| LOW | `app/blog/[slug]/page.tsx:70` | Two `<h1>`s per post; brand outranks the topic. Blog index also passes `active="specials"` | Confirmed | 20 min |
| LOW | `app/tip/success/page.tsx:3` | Indexable payment confirmation page; `robots.ts` has a blanket `allow: "/"` with no disallows | Confirmed | 15 min |
| LOW | `app/venues/[id]/page.tsx:29` | `generateMetadata` lacks the `Number.isInteger` guard the page body has → 500 instead of 404 | Confirmed | 10 min |
| LOW | `cron/fetch.ts:6` | User-Agent advertises `kelownaspecials.com` — NXDOMAIN, not this project | Confirmed (DNS) | 5 min |
| LOW | `lib/seo.ts:8` | Unbounded `ItemList`: 47.5KB of a 235KB homepage (20% raw, 17% gzipped) | Confirmed (measured) | 15 min |
| LOW | `lib/inbox-data.ts:187` | Two unbounded reads on a `force-dynamic` page, incl. every `html_body` ever sent | Confirmed | 1 h |
| LOW | `lib/inbox-data.ts:186` | Double `decodeURIComponent` on a Next-decoded param → unhandled `URIError` 500 | Confirmed (traced) | 20 min |
| LOW | `components/AdminSubmissionRow.tsx:123` | Inlines full base64 photos (~5.5MB each) into admin HTML on a `force-dynamic` page | Confirmed | 30 min |
| LOW | `components/AdminSubmissionRow.tsx:100` | `jsonb` cast to a typed shape with no runtime parse, though `reviewResultSchema` exists | Confirmed | 15 min |
| LOW | `lib/venue-photos.ts:23` | Insert / select-all / delete-slice trim outside a transaction | Confirmed | 20 min |
| LOW | `.env.example:1` | Omits 4 required vars: `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `BREVO_INBOUND_TOKEN` | Confirmed | 5 min |

**L-48 — deliberately downgraded.** The comparison at `login/route.ts:19` is a plain `!==` rather than `crypto.timingSafeEqual`, and should be fixed — it is a one-line change. But CRITICAL overstates it: V8 compares string lengths first and bails, the timing delta is nanoseconds, and it is measured across Railway's edge, TLS termination and Node's event loop where jitter is milliseconds. The genuinely exploitable weakness on that line is the missing rate limit (H-3), which lets an attacker guess directly with no side channel. Same pattern at `lib/admin-auth.ts:10` and `proxy.ts:11`.

**L-51 — dead code that caused the CRITICAL.** `proxy.ts:8` special-cases `pathname === "/api/admin/login"`, but `:20`'s matcher is `["/admin/:path*"]` and `:7` early-returns for anything not starting with `/admin` — so the clause is doubly unreachable. It is not merely dead; it reads as evidence that `/api/admin/*` passes through this gate, and that misreading is precisely what left the submissions route unguarded while the developer of the other three routes evidently knew better. Delete the clause, and make the real contract structural rather than a comment in `lib/admin-auth.ts`.

**L-54 — recharacterized from Phase 1.** Phase 1 called `inbox/send:26` an XSS at MEDIUM. That reading is wrong: `body` is admin-typed and the render target is admin-only (`InboxThread.tsx:89`), so the script-tag scenario is self-XSS by the sole admin. The real defect is outbound correctness — with only newline replacement and no entity escaping, quoting an address as `<owner@venue.com>` or writing "fish & chips <$10" silently mangles the message a real business receives, and the admin sees the same mangling so it is invisible until the venue replies confused.

**L-55 — no untrusted path today.** `venues` is written from exactly one place in the repo (`scripts/seed-venues.ts:394`) — no admin UI, no public insert. Worth escaping as defense-in-depth precisely because the seed data is scraped from venue websites and any future venue-claim or self-serve-listing feature turns this into live stored XSS against the admin session.

**L-58 — real but weak.** The open redirect is genuine, but the attacker must forge the origin on their *own* request, take the returned `session.url`, distribute it, and the victim must complete a real card payment before the redirect fires. That is a poor phishing primitive — the victim has already paid by the time they land. Pin to a `NEXT_PUBLIC_SITE_URL` constant; the domain is fixed and known.

**L-69 — all failure modes are fail-closed but silent.** Missing `ADMIN_SESSION_SECRET`/`ADMIN_PASSWORD` → `proxy.ts:11` redirects every `/admin` request to login and `login/route.ts:9-11` returns a 500 "admin login not configured"; missing `STRIPE_SECRET_KEY` → `lib/stripe.ts:13-15` throws on the first tip, surfacing as an unhandled 500 from `tip/checkout/route.ts:24` (that call has no try/catch); missing `BREVO_INBOUND_TOKEN` → all inbound mail rejected with 401 and venue replies dropped with no local signal. Confirmed: the local `.env.local` defines the first three but **not** `BREVO_INBOUND_TOKEN`. Corroborating context that env config is an already-realized footgun here: `Dockerfile:23-34` carries an explicit `ARG DATABASE_URL` because a missing build-time value broke `next build`.

---

## 4. WHAT'S WORKING WELL

1. **The anti-hallucination design in the cron path is genuinely good, and rare.** `cron/extract.ts:240-249` requires the model to emit a verbatim `evidence_quote` that must literally appear in the fetched page text after whitespace normalization, and drops the item if it does not — plus a `DISCOUNT_SIGNAL` check for unpriced claims. Most AI-extraction pipelines trust the model's self-reported confidence and stop there. This one does not, and `cron/extract.ts:275-278` additionally drops events with neither a day nor a date. Nearly every accuracy finding above is "this control exists and was not applied to the second code path" — which is a far better starting position than "no control exists."

2. **The crawler is a well-behaved citizen by default.** `cron/fetch.ts:46-57` checks `isAllowedByRobots()` before every request and serializes through `rateLimit()` with a 1-second minimum interval, and the UA string is honest and identifiable. Very few small scrapers bother with robots.txt at all. The Castanet path (M-35) is the one place this discipline was not applied, and it is a 30-minute fix rather than an architectural change.

3. **Transactions, ISR, and Pacific-time handling all have a correct reference implementation in-repo.** `cron/upsert.ts:25` and `:57` show the right archive+insert transaction shape; `lib/events-data.ts:42` and `cron/scrapeCastanet.ts:64-67` show correct `America/Vancouver` handling; `app/api/track/exclude/route.ts:16-20` shows the correct cookie-clearing pattern for the missing logout route. Every one of the transaction, timezone, and session findings has a working template ten files away — fixes are copy-and-apply, not design work.

4. **Fail-closed is the consistent default for missing configuration.** `proxy.ts:11` redirects rather than allowing; `lib/admin-auth.ts:10` returns false; `login/route.ts:9-11` returns 500 rather than accepting any password; the Brevo webhook 401s on a missing token; `lib/brevo.ts:11` guards on env presence. Nothing degrades open. The `.env.example` gap (L-69) is a documentation problem sitting on top of correct behavior.

5. **The performance-conscious choices show real judgment.** `lib/venues-data.ts:94-95` carries an explicit comment about serving photo bytes from `/api/venue-photos/[id]` "so the page HTML doesn't inline base64 blobs" — someone thought about payload size and acted on it. `lib/analytics.ts:45` has a retention pruner. `db/index.ts` caps the connection pool. `app/page.tsx:28` already applies `.replace(/</g, "\\u003c")` to serialized JSON-LD, which is why the Phase-1 XSS claim there was rejected — that mitigation was deliberate.

---

## 5. PRIORITIZED FIX ROADMAP

### Fix now — before anything else ships
Highest impact per minute of work. Items 1–4 are one-line or near-one-line changes with outsized consequences.

| # | Finding | File | Why now |
|---|---|---|---|
| 1 | **C-1** Add `isAdminAuthed(req)` guard | `app/api/admin/submissions/[id]/route.ts:14` | Live unauthenticated write to production. Confirmed against prod. 10 minutes. |
| 2 | **H-8** `contentHash: hash` → `contentHash: null` | `cron/index.ts:86` | One-line fix stopping permanent data freeze + false "verified today" |
| 3 | **H-9** Move empty-guard above the delete; wrap in transaction | `cron/scrapeCastanet.ts:180` | One upstream hiccup empties the whole events feed, silently |
| 4 | **H-10** Add `venueId` to the grouping key | `lib/group-days.ts:35` | Currently publishing one venue's special under another's name |
| 5 | **H-17** Use `pacificTodayISODate()` | `cron/extract.ts:123` | Every evening's extraction gets tomorrow's date |
| 6 | **H-18** Set `timeout` + `maxRetries` on the Anthropic client | `lib/submission-review.ts:6` | 30-min hung connections and 3× billing from a public endpoint |
| 7 | **C-2 / H-6** Rate-limit `/api/submit` and `/api/report`; 400 on empty report lookup | `app/api/submit/route.ts:47`, `app/api/report/route.ts:41` | Unbounded Anthropic + Brevo spend on a project with no revenue |
| 8 | **H-3** Rate-limit + lockout on admin login | `app/api/admin/login/route.ts:8` | The whole admin surface is one unlimited-guess password |
| 9 | **H-7** Pause outreach sends until unsubscribe + address are in place | `lib/outreach-email.ts:31` | Regulatory (CASL), not technical — stop sending first, fix second |
| 10 | **L-51** Delete the dead `/api/admin/login` clause | `proxy.ts:8` | It is what caused #1; 5 minutes |

### Fix this sprint
- **H-4** Port `evidence_quote` + verbatim check into `lib/submission-review.ts` — closes the gap between what the blog promises and what the submit path does.
- **H-5** Gate photo publication behind admin review; add an `approved` column and a removal action.
- **H-11 / H-12** `revalidate` on the sitemap with real `lastModified`; day-filter and stale-filter the homepage JSON-LD. These two are the whole SEO story.
- **H-13 / M-23 / M-24** The data-lifecycle cluster: date-filter `getVenueEvents`, exclude visitor rows from the cron archive, anti-join "Previously Featured" against active rows. All three are the site telling visitors something false about a real business.
- **H-14 / H-15 / M-26** Wrap the three multi-insert paths in `db.transaction` and lock the `resolvedItemKeys` read-modify-write.
- **M-21** Make the evidence check validate the price it is supposed to prove.
- **M-30 / M-31** Fix the ISR/"today" mismatch — this is the homepage's core promise breaking at the exact hour bar-goers check.
- **M-33 / M-34** Stop advertising ticketed events as Free.
- **M-19 / M-20** Signed session cookie with expiry, plus a logout route.
- **M-36** Real per-venue city in structured data.
- **M-35** Route the Castanet fetches through the existing rate limiter and robots check.
- **M-45** Client-side size check and downscale in `SubmitForm` — currently killing a large share of genuine phone-photo submissions.

### Backlog
All LOW findings, plus the operational-polish MEDIUMs: inbox thread keying and preview fallback (M-39, M-40), Brevo timeouts and retries (M-42), webhook idempotency (M-43), brand-name consistency (M-41), analytics window alignment (M-37), UTC month heading (M-38), the AI-failure submission dead end (M-28), the admin event-gate mismatch (M-27), the reject-marked-approved audit gap (M-25), token accounting (M-47), and `.env.example` (L-69 — 5 minutes, do it opportunistically).

Group the cheap ones into a single cleanup pass: L-48, L-51, L-62, L-64, L-69, M-38, M-27 are each under 15 minutes and touch unrelated files.

### Accept as known risk
- **L-48** (non-constant-time compare) — fix it, but do not treat it as a security priority; remote timing recovery across Railway's edge is not practical, and H-3 makes the side channel moot.
- **L-57** (`kds_dnt` not `httpOnly`) — architecturally required, since `public/js/track.js:27-34` must read it client-side. The only real cost is that clearing it re-enrolls the founder's browser into his own stats.
- **L-58** (Stripe open redirect) — genuine but a poor phishing primitive; fix opportunistically.
- **L-55** (unescaped `venueName`) — no untrusted write path to `venues` exists today. Revisit the moment a venue-claim or self-serve-listing feature is planned.
- **M-46** (webhook secret in the URL path) — a secret URL is Brevo's documented pattern for inbound parse and there is no HMAC header to verify. Moving it to a header is the right fix but is a coordinated change on Brevo's side; accept until the outreach path is being touched anyway.

---

## 6. WHAT'S NOT VERIFIED

Stated explicitly so nothing here is mistaken for tested behavior:

- **No test suite exists in this repository.** There is no `__tests__`, no `*.test.ts`, no `*.spec.ts`, no vitest/jest/playwright config. **Nothing in this report was verified by an automated test**, and no regression test was written for any finding. Per the project's own quality rule, each fix above should begin with a failing test that reproduces the defect — but there is currently no harness to put that test in. Standing up a minimal vitest setup is a prerequisite for fixing anything on this list safely.
- **No real Stripe charge was made.** The tip flow (`app/api/tip/checkout/route.ts`) was read statically only. The open-redirect finding (L-58) is reasoned from the code path; no Checkout session was created and no payment was completed. Stripe key validity, product configuration, and the actual post-payment redirect behavior are unverified.
- **No cron run was triggered.** `cron/index.ts`, `cron/extract.ts`, `cron/fetch.ts`, `cron/upsert.ts` and `cron/scrapeCastanet.ts` were read, and the Castanet cover-charge regex was executed standalone under Node against representative strings — but the pipeline itself was never run. No Anthropic extraction call was made, no venue was scraped, no database write occurred. The content-hash freeze (H-8), the duplicate-set race (H-16), and the token-accounting gap (M-47) are all reasoned from code and are not reproduced.
- **The frontend was read statically, never exercised in a browser.** No Playwright run, no page loads, no clicking through day tabs, no hydration observed. The ISR/"today" findings (M-30, M-31), the hydration mismatch, the calendar/list disagreement, and the submit-form size failure (M-45) are inferred from source plus the committed `.next` build output — not observed. **No screenshot evidence exists for any UI finding.**
- **Production was touched read-only, once.** Two unauthenticated POSTs were made to confirm C-1: `/api/admin/submissions/999999999` (returned 400 — nonexistent id, no state change) and `/api/admin/outreach/send` with an empty body (returned 401 — the control). No submission was created, approved, or rejected; no email was sent; no live customer or venue row was mutated.
- **Database state was never inspected.** No `SELECT` was run against the production or local Postgres. Row counts, actual archived-special volume, inbox size, and whether any of the data-corruption findings have *already* occurred in production are all unknown. Several findings (M-24 "Previously Featured" duplication, M-23 destroyed visitor submissions, H-8 frozen venues) would be immediately confirmable or refutable with a single query each — worth doing before estimating fix urgency.
- **Third-party behavior is assumed from documentation, not observed.** Brevo's inbound-parse `RawTextBody` semantics (M-39), Brevo retry behavior (M-43), Anthropic SDK retry defaults (verified from `node_modules` source, not from a live 429), and Google's treatment of tabbed content (H-12) are all secondhand.
- **CASL analysis (H-7) is not legal advice.** It reflects a reading of the statute's unsubscribe and sender-identification requirements against the code. Confirm with counsel before resuming outreach.

---

## 7. TOKEN SUMMARY

**First run for this project — no cache, no prior baseline, no findings ledger to diff against.** Every file was read cold; nothing could be skipped as unchanged-since-last-review.

**Scope:** full audit, no directory or file-type exclusions. Coverage spanned `app/` (all 12 API route handlers, all page and layout components, `robots.ts`, `sitemap.ts`), `lib/` (all 15 modules), `components/` (all rendering and admin components), `cron/` (all 6 modules), `db/` (schema plus migrations `0003` and `0007`), `scripts/`, `proxy.ts`, `next.config.ts`, `Dockerfile`, `.env.example`, `.env.local` (names only, values redacted), `package.json`, and — unusually — the committed `.next` build output, which supplied hard measurements rather than inferences for four findings.

**Where tokens bought verification rather than reading:** the build artifacts (`.next/prerender-manifest.json`, `.next/server/app/index.html`, `.next/server/app/sitemap.xml.body`) were parsed and measured, producing the 121/121 `InStock` count, the 47-of-88 title mismatch, the 62-URL identical-lastmod count, and the 47.5KB/235KB payload figures. `node_modules/@anthropic-ai/sdk/client.js` and `node_modules/next/dist/shared/lib/router/utils/route-matcher.js` were read to confirm SDK retry defaults and Next's param decoding. The Castanet cover-charge regex was executed under Node. Live DNS and HTTP checks confirmed `kelownaspecials.com` is NXDOMAIN and that `castanet.net/robots.txt` does not disallow `/events/`. Two unauthenticated production requests confirmed the CRITICAL.

**Synthesis load:** roughly 100 raw findings arrived from the earlier phases, carrying heavy duplication — the missing-auth CRITICAL was independently raised four times, and `getVenueEvents`, the Castanet delete-before-guard, the analytics window, the `MonthlySpecials` UTC month, the AI-failure queue dead end, and the admin event-gate mismatch three times each. Merging to 69 unique findings, reconciling three severity disagreements (the timing-attack claim downgraded CRITICAL→LOW, the inbox-XSS claim recharacterized MEDIUM→LOW, the Stripe redirect MEDIUM→LOW), and discarding two claims that failed verification is where the synthesis budget went.

**For the next run:** this report is the baseline. A subsequent review should diff against these 69 rather than re-derive them, and should be able to skip the build-output measurement entirely unless `lib/seo.ts`, `app/sitemap.ts`, or `lib/data.ts` changed. Expect a substantially cheaper second pass. The highest-value additions to make before then are a test harness (so findings can be reproduced rather than argued) and a handful of production `SELECT`s (so the data-corruption findings can be confirmed as actual rather than potential).