I have everything needed.

# Kelowna Daily Specials

> A nightly-scraped, AI-extracted directory of happy hours, food/drink specials, and live events at Kelowna, BC venues — free to browse, no login, at kelownafooddeals.shop.

*Last updated by uber-review on 2026-09-05*

## What It Does

Kelowna Daily Specials answers one question for a local: "what's cheap and what's on tonight?" A nightly cron job fetches each tracked venue's website or menu page, hashes the text to detect changes, and — only when the content actually changed — sends it to Claude Haiku for structured extraction of specials and events. Every extracted item must carry a verbatim quote from the source page or it is discarded, so the listings are evidence-backed rather than model-invented.

The public site lists today's specials grouped by venue, a separate events page (venue events plus Castanet-sourced nightlife listings), per-venue detail pages, and a blog. Visitors can submit a special or a photo of a menu board, which is AI-reviewed and either auto-published (high confidence) or queued for admin review. Visitors can also report an incorrect listing (emails the operator) or leave a Stripe tip.

A password-protected admin area handles submission review, venue outreach email (Brevo), a two-way inbox for venue replies via a Brevo inbound webhook, and a first-party analytics dashboard.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.3.4 (App Router), React 19.2 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Database | PostgreSQL (schema `specials`), `postgres` driver |
| ORM / migrations | Drizzle ORM 0.45 + drizzle-kit 0.31 |
| AI extraction | Anthropic SDK, model `claude-haiku-4-5-20251001` |
| Validation | Zod v4 |
| Scraping | `fetch` + cheerio, `pdf-parse`, `robots-parser`; `playwright-core` + system Chromium for JS-rendered sites |
| Email | Brevo (transactional send + inbound parse webhook) |
| Payments | Stripe Checkout (tips only) |
| Images | `sharp` (build-time), base64 photos stored in Postgres |
| Runtime / deploy | Node 22 Alpine, Docker, Railway (web + cron services) |
| Scripts | `tsx` with `scripts/env.cjs` preloading `.env.local` |

## Architecture Overview

Two deployable units share one repo, one Dockerfile, and one database:

1. **Web service** — `npm start` (Next.js). Server components read directly from Postgres via `lib/*-data.ts` helpers; a small set of route handlers under `app/api/` handle writes (submissions, reports, tips, analytics, admin actions, the Brevo webhook).
2. **Cron service** — `npm run cron` (`cron/index.ts`), same image, different start command. Runs the nightly scrape, then the Castanet event scrape, then analytics pruning.

The scrape pipeline is: `getActiveVenues()` (ordered oldest-attempted-first) → fetch (plain HTTP, or headless Chromium when `venues.requires_browser`) → `normalizeText` + `hashText` → compare against the last non-null `scrape_runs.content_hash` → if unchanged, just bump `last_verified_at` and log a zero-token run; if changed, call `extractVenueContent()` and replace the venue's active rows. Every venue attempt writes a `scrape_runs` row (hash, changed flag, tokens, error), which is both the change-detection ledger and the run log.

Auth is deliberately split: `proxy.ts` (matcher `/admin/:path*`) redirects unauthenticated page requests to `/admin/login`, but that matcher does **not** cover `/api/admin/*`, so those route handlers call `isAdminAuthed()` themselves. Both compare the `kds_admin_session` cookie against `ADMIN_SESSION_SECRET`.

## Features

**Public site**
- Homepage: today's specials grouped by venue, with day/category filters
- Events page: recurring weekly and one-off dated events, including Castanet-sourced nightlife listings not tied to a tracked venue
- Venue detail pages (`/venues/[id]`): all current specials, events, menu items, photos, and archived "previous specials"
- Blog (`/blog`, `/blog/[slug]`), `robots.ts` and `sitemap.ts` for SEO
- Tip page with Stripe Checkout
- "Report incorrect" on any special or event

**Visitor submissions**
- Free-text and/or photo (JPEG/PNG/WebP, 4 MB pre-base64 cap) submission per venue
- AI review extracts specials, events, and menu items in one pass
- Items at confidence ≥ 0.85 publish immediately; the rest queue for admin review
- If AI review throws, the submission is still persisted as `needs_review` rather than dropped

**Nightly automation**
- Content-hash change detection to avoid re-extracting unchanged pages
- Per-run token ceiling of 50,000 with a non-zero exit code when hit
- Headless-Chromium fallback per venue via `requires_browser`
- Castanet event scraping and 400-day analytics retention pruning

**Admin**
- Password login issuing a 30-day httpOnly cookie
- Per-item approve/reject on submissions (not whole-submission)
- One-click outreach email to a venue's contact address
- Inbox of inbound venue replies, matched to venues by from-address, with reply + mark-read
- Analytics dashboard (pageviews, CTA clicks, UTM, country)

## API Reference

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/admin/login` | none (issues session) | Compare password to `ADMIN_PASSWORD`, set `kds_admin_session` cookie for 30 days |
| POST | `/api/admin/submissions/[id]` | **none enforced in-handler** | Approve or reject one extracted item (`special`/`event`/`menuItem` + index) from a submission |
| POST | `/api/admin/outreach/send` | admin cookie | Send the templated "does this look right?" outreach email to a venue's contact email and log an `outreach_sends` row |
| POST | `/api/admin/inbox/send` | admin cookie | Send a free-form reply to an inbox thread; archives an `outreach_sends` row only when a venue matched |
| POST | `/api/admin/inbox/mark-read` | admin cookie | Mark up to 200 inbound email ids as read |
| POST | `/api/submit` | none (public) | Accept a visitor special/photo submission, AI-review it, auto-publish high-confidence items, queue the rest |
| POST | `/api/report` | none (public) | Email the operator that a given special or event is wrong |
| POST | `/api/tip/checkout` | none (public) | Create a CAD Stripe Checkout session for a tip between $1 and $500 |
| POST | `/api/track` | none (public) | Record an analytics event; drops bots and `kds_dnt` opt-outs, always returns 200 |
| GET | `/api/track/exclude` | none (public) | Set (or with `?off=1` clear) the 10-year `kds_dnt` cookie so your own browser stops being counted |
| GET | `/api/venue-photos/[id]` | none (public) | Stream a stored base64 venue photo as its original image type, immutably cached for a year |
| POST | `/api/webhooks/brevo-inbound/[token]` | shared secret in path | Ingest Brevo inbound-parse items into `inbound_emails`, matching the sender to a venue by contact email |

## Database Schema

All tables live in the Postgres schema `specials`.

**`venues`** — the tracked places. `name` (unique index), `address`, optional `lat`/`lng`, `phone`, `website`, `menu_url`, `instagram_handle`, `contact_email`, `source_urls` (text array), `active` (cron only scrapes active), `requires_browser` (use headless Chromium instead of plain fetch).

**`specials`** — food/drink deals. `venue_id`, `title`, `description`, `price_cents`, `day_of_week` (0=Sun…6=Sat, null = every day), `is_monthly`, `start_time`/`end_time`, `category` (`happy_hour` | `food_special` | `wing_night` | `other`), `last_verified_at`, `source_url`, `confidence`, `extraction_notes` (carries the evidence quote), `archived_at` (null = currently active).

**`events`** — scheduled events. `venue_id` is **nullable** so a non-tracked location (a winery hosting a concert, a Castanet listing) can be represented via `location_name`/`location_address`. `event_type` (`live_music` | `trivia` | `karaoke` | `sports_night` | `other`), mutually exclusive `day_of_week` (recurring) vs `specific_date` (one-off), times, `cover_charge_cents`, plus the same verification/confidence/`archived_at` columns.

**`menu_items`** — regular (non-deal) menu prices per venue, same verification/confidence/`archived_at` columns.

**`submissions`** — visitor-supplied specials. `venue_id`, `raw_text`, base64 `photo_data` + `photo_mime_type`, `status` (`auto_approved` | `needs_review` | `approved` | `rejected`), `ai_extracted` JSONB holding `{ specials, events, menu_items }`, `ai_notes`, and `resolved_item_keys` (a text array of `"special:0"`-style keys tracking which proposed items an admin or the auto-approver has already dealt with). `submission_type` and `resulting_row_id` are legacy leftovers from when a submission produced exactly one row.

**`venue_photos`** — base64 images with `caption`, optionally linked back to the `submission_id` that produced them (`on delete set null`).

**`scrape_runs`** — one row per venue per cron attempt: `content_hash`, `changed`, `tokens_used`, `error`, `ran_at`. Doubles as the change-detection store and the scheduling order source.

**`outreach_sends`** — outbound venue email: `venue_id` (NOT NULL), `to_email`, `subject`, `html_body`, `status` (`queued` | `sent` | `failed` | `bounced` | `replied`), `brevo_message_id`, `error_message`, `sent_at`/`opened_at`/`clicked_at`.

**`inbound_emails`** — replies from venues: nullable `venue_id` (matched by lowercased from-address), `brevo_message_id`, `in_reply_to`, `from_email`/`from_name`, `subject`, text and HTML bodies, `read`.

**`analytics_events`** — first-party analytics: `event_type`, `event_label`, `page`, `session_id`, `visitor_id`, `referrer`, `country` (from Cloudflare's `CF-IPCountry`), UTM triple, `created_at`.

## Key Business Logic

**Extraction anti-hallucination gate.** The model must return an `evidence_quote` for every item — a verbatim substring of the source page. After the tool call, `cron/extract.ts` whitespace-collapses and lowercases both the page text and the quote and drops any item whose quote is not literally present. A special with `price_cents === null` must additionally have discount language in its quote (`$`, `%`, `½`, "off", "free", "half", "bogo", "buy one", "discount", "deal") or it is dropped — the `½` Unicode fraction is in that regex specifically because source pages write "½ Price Bottles of Wine" and its absence was silently killing valid rows. An event with neither `day_of_week` nor `specific_date` is dropped. The surviving quote is appended to `extraction_notes` as an audit trail.

**Day-range expansion.** An explicit range like "Mon-Fri" is never collapsed to `day_of_week: null` (which would falsely advertise the deal on Saturday and Sunday). The model emits one row per day in the range — five rows for Mon-Fri, two for "weekends" — each copying the *same* evidence quote. `day_of_week: null` means genuinely daily, and only that. Because this produces near-duplicate rows, `lib/group-days.ts` re-collapses rows that differ only by day into one card with a human label ("Mon-Fri", "Daily", or a comma list for non-contiguous days) on venue pages, which have no day filter.

**Confidence auto-approve threshold.** `AUTO_APPROVE_CONFIDENCE = 0.85` in `lib/submission-review.ts`. In `/api/submit`, any extracted item at or above it is inserted live immediately and its key pushed into `resolved_item_keys`; anything below waits for admin review. Events have an extra guard: they auto-approve only if a day or date is also set. Submission status is then derived — `rejected` if nothing qualified at all, `auto_approved` if everything published, otherwise `needs_review`. A submitted photo is only saved to `venue_photos` when at least one item was approved.

**Archived-vs-active pattern.** No row is ever deleted or updated in place on re-scrape. `replaceVenueSpecials` / `replaceVenueEvents` run in a transaction that stamps `archived_at = now()` on every row where `archived_at IS NULL` for that venue, then inserts the fresh extraction. So `archived_at IS NULL` is the definition of "current", and the archived rows become the venue page's "previous specials" history. Note the consequence: if a page changes and the new extraction yields zero items, the venue's listings all archive and it shows nothing until a later scrape finds something.

**Change detection and token budget.** Extraction is skipped entirely when the normalized page hash equals the last recorded hash — the run instead bumps `last_verified_at` on active rows (`markVenueStillCurrent`) so the site can still say "verified today". The run aborts once cumulative tokens reach `TOKEN_CEILING = 50_000` and exits non-zero. Venues are ordered by oldest last attempt (never-scraped first) precisely so a ceiling abort starves a different tail each night instead of permanently ignoring the same venues.

**Analytics hygiene.** `/api/track` returns `{ ok: true }` unconditionally — including for malformed payloads, bot user-agents, and opted-out browsers — so a scraper never learns it was filtered. Events older than `RETENTION_DAYS = 400` are pruned on each cron run.

**Auth split.** `proxy.ts`'s matcher covers only `/admin/:path*`, so `/api/admin/*` handlers are not protected by it and must call `isAdminAuthed()` themselves. The session cookie's value *is* `ADMIN_SESSION_SECRET` — it is a shared static token, not a signed per-user session.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (web + cron, and at build time) | Postgres connection string; `db/index.ts` throws at import if missing, which is why the Dockerfile declares it as an `ARG` |
| `ANTHROPIC_API_KEY` | yes (cron + web submissions) | Claude Haiku extraction and submission review |
| `ADMIN_PASSWORD` | yes (web) | Plaintext comparison at `/api/admin/login` |
| `ADMIN_SESSION_SECRET` | yes (web) | Value stored in the `kds_admin_session` cookie and compared on every admin request |
| `BREVO_API_KEY` | yes for email | Transactional send for outreach, inbox replies, and incorrect-listing reports |
| `BREVO_INBOUND_TOKEN` | yes for inbound | Shared secret in the webhook path; the route fails closed when unset |
| `REPORT_EMAIL_FROM` | yes for email | From address on report/outreach mail |
| `REPORT_EMAIL_TO` | yes for email | Operator inbox that receives "this listing is wrong" reports |
| `STRIPE_SECRET_KEY` | web only | Tip Checkout sessions; `lib/stripe.ts` lazy-inits so the cron service never needs it |
| `CHROMIUM_PATH` | cron only (set in Dockerfile to `/usr/bin/chromium-browser`) | System Chromium binary for `playwright-core`, since Playwright ships no Alpine browser build |

## Running Locally

```bash
npm install
# create .env.local with at least DATABASE_URL and ANTHROPIC_API_KEY
npm run db:generate     # generate migrations from db/schema.ts
npm run db:migrate      # apply them (schemaFilter: ["specials"])
npm run seed            # optional: seed venues via scripts/seed-venues.ts
npm run dev             # http://localhost:3000
```

Other scripts: `npm run cron` runs one full scrape pass locally, `npm run db:studio` opens Drizzle Studio, `npm run typecheck` runs `tsc --noEmit`, `npm run lint` runs ESLint. All `tsx` scripts preload `scripts/env.cjs`, which loads `.env.local`; `drizzle.config.ts` loads it too and throws if `DATABASE_URL` is absent. Visit `/api/track/exclude` once in your dev browser to keep your own traffic out of analytics.

## Deployment

Railway, one repo, one `Dockerfile`, two services against the same Postgres:

- **web** — default `CMD ["npm", "start"]`, serves Next.js on port 3000. Needs the full env set including `STRIPE_SECRET_KEY`, admin secrets, and Brevo keys.
- **cron** — same image, start command overridden to `npm run cron`, scheduled nightly. Needs `DATABASE_URL` and `ANTHROPIC_API_KEY`; has no Stripe key by design.

Build notes baked into the Dockerfile: it installs Alpine's `chromium` plus font/nss deps for the headless-fetch path; it runs a full `npm ci` (not `--production`) because `next build` needs devDependencies and the cron/seed scripts need `tsx` and `dotenv` at runtime; and it declares `ARG DATABASE_URL` because Docker builds on Railway do not get service env vars injected the way Railpack builds do, while `next build` imports every route module and therefore `db/index.ts`.

Domain: kelownafooddeals.shop, fronted by Cloudflare (the analytics `country` field reads `CF-IPCountry`).

## Known Limitations / Tech Debt

See REVIEW.md for current findings.