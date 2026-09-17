# Adding a new region — speed-run playbook

This is the exact procedure for launching a brand-new city/region on
TodaysTab end-to-end: database setup, venues, getting real deals/events
live, admin review, SEO, and outreach emailing. It assumes the platform is
already on the consolidated path-based architecture (todaystab.com/{slug})
documented in `docs/superpowers/specs/2026-09-07-multi-region-platform-design.md`
and `docs/superpowers/specs/2026-09-08-country-province-hierarchy-design.md`.

Read this whole file before starting. It is written so a Claude session with
no other context on this project can follow it mechanically, phase by phase.

Test-run end-to-end on 2026-09-10 launching North Okanagan (Vernon, BC) as a
real region — took under an hour including venue research. One real gap was
found and fixed in this doc (Phase 4's original `npm run cron` advice was
too slow); everything else in the playbook worked as written.

Run again at much larger scale on 2026-09-13 launching all 17 Alberta
regions (Calgary/Edmonton split into sub-regions, plus 15 standalone
cities) — 288 seeded venues, full manual zero-listing recheck pass across
every region. Confirmed the platform genuinely needs zero code changes per
region at this scale too. Three real gaps found and fixed this time: Phase
4's `npm run cron` advice was still being skipped under time pressure even
though it was already documented (first fixed by building `CRON_REGIONS`/
`CRON_NEVER_SCRAPED_ONLY` directly into `cron/index.ts` instead of relying
on a human remembering a doc — then hardened further the same night into an
actual refusal: an unscoped run now throws immediately unless
`CRON_ALLOW_FULL_SWEEP` is set, which only the scheduled nightly cron's own
Railway service has); the manual recheck pass's actual methodology (browser
tool choice, confidence scoring, email capture, WebSearch-quota fallback)
wasn't written down anywhere, now captured in Phase 3 step 5; and a stray
background fork from earlier in the same session kept running for ~5 hours
unnoticed, now called out in Phase 3 step 5 too.

Run a third time on 2026-09-13 launching Ontario's first 11 regions (GTA +
major cities: Toronto Core/East/North/West, Mississauga, Brampton, York
Region, Durham Region, Halton Region, Hamilton, Ottawa) -- the first launch
into a genuinely new province. Confirmed `mailingAddress` does not need to
match the region's own province (every Ontario region reused the existing
Kelowna, BC address -- CASL requires a real, valid address, not a
geographically local one). Two real gaps found and fixed:

- **The Playwright MCP browser instance is shared globally across every
  concurrently-running fork in a session.** Dispatching all 11 regions'
  manual recheck pass in parallel (as the 17-region Alberta pass had done)
  caused forks to steal each other's tabs/navigations mid-read, and several
  forks wrote data attributed to the wrong venue before this was caught --
  one region ended up with ~30 duplicated menu items from a race, another
  wrote a fabricated event onto a venue in a completely unrelated region
  (Hamilton's The Village Restaurant got a "50th Anniversary Open House"
  event that doesn't exist, sourced from a different fork's page read). All
  contaminated rows were identified by timestamp/venue and deleted, then the
  same 11 regions were re-run **serially, one fork at a time, waiting for
  each to fully complete before starting the next** -- this produced clean,
  verifiable results with zero contamination. **The manual recheck pass
  must run one region at a time, never in parallel**, until/unless each
  fork can be given its own isolated browser context.
- **A platform-wide hardcoded `"Okanagan · verified"` badge** in
  `components/SiteHeader.tsx` (a leftover from before the platform went
  multi-region) was showing on every single region's page, including every
  BC and Alberta region already live -- just never noticed because it's a
  small badge and BC/Alberta both happen to be geographically plausible-ish.
  Launching Ontario made it obviously wrong. Fixed to just say `"verified"`
  (the badge doesn't need to name a place); deployed and confirmed live.
  Worth a periodic look at existing UI copy on a *new* region's page
  specifically -- a wrong-but-plausible-sounding hardcoded string survives
  in a same-province launch precisely because it doesn't look wrong.

## The one-line summary

A new region under an existing country/province needs **zero infrastructure
work and zero code changes**. It needs: one `regions` row, some `venues`
rows, one forced cron run to get content live, and a manual SEO/outreach
pass. Everything else — routing, sitemap, robots.txt, admin scope switcher,
nightly scrape cron, analytics, pricing/monetization — is already generic
and picks up any `active` region automatically.

If you find yourself about to touch Cloudflare, Railway DNS, a new Google
Search Console property, or a new Brevo sender for this region, stop — that
almost certainly means you're doing something this process doesn't require.
Everything under todaystab.com shares one verified domain, one Brevo sender,
and one deploy. The only reason to touch real infra is a genuinely new
country/timezone, covered in "Expanding outside BC, Canada" below.

---

## Phase 1 — Database: region + province

Regions hang off `provinces`, which hang off `countries`. For a new city in
an existing province (e.g. another BC town), this step is already done —
check first:

```sql
select p.id, p.code, p.name, p.timezone, c.code as country
from specials.provinces p
join specials.countries c on c.id = p.country_id;
```

If the province is missing, see "Expanding outside BC, Canada" below. For BC
specifically it already exists.

## Phase 2 — Database: the `regions` row

There is no admin UI or script for this — do it directly against production
via a one-off Node script (same `db` import pattern as
`scripts/seed-venues.ts`), or a direct SQL insert. Every `NOT NULL` column on
`regions` (see `db/schema.ts`) must be filled in:

| Column | What it is | Example |
|---|---|---|
| `slug` | URL path segment, lowercase, hyphenated | `"vernon"` |
| `domain` | **Leave `null`** for any region added after the todaystab.com migration — it lives entirely at `todaystab.com/{slug}` and needs no domain of its own | `null` |
| `brandName` | Shown in titles, emails, city-picker | `"Vernon Food Deals"` (doesn't have to match "TodaysTab" branding) |
| `logoUrl` | Path under `/public` or a full URL | `"/icons/icon-192.png"` (reuse the shared one unless you have a real per-region logo) |
| `accentColor`, `accentDimColor`, `accentSoftColor`, `backgroundColor`, `foregroundColor`, `evergreenColor` | Theme CSS custom properties, hex strings | Copy Kelowna's or Penticton's values as a starting point, tweak later |
| `mailingAddress` | **Real physical address, required for CASL** — every outreach email includes this | A real mailing address you control |
| `contactEmail` | Contact address for this region | `element.mikem@gmail.com` or a per-region address |
| `tokenCeiling` | Nightly Haiku extraction budget for this region alone | `50000` to start |
| `active` | Must be `true` for the region to show up anywhere | `true` |
| `provinceId` | FK from Phase 1 | the BC province's id |

**Do not skip `mailingAddress`** — it's a legal requirement (CASL), not a
nice-to-have.

Once inserted, `/{slug}` works immediately — city picker (`app/page.tsx`),
sitemap/robots, `app/[region]/layout.tsx`'s metadata/theme injection, and the
admin scope switcher (`lib/admin-region.ts`) all query `regions` live.

## Phase 3 — Seed venues

There's no generic "add venues" tool. `scripts/seed-venues.ts` is a one-off
script hardcoded to Kelowna — it's a **pattern to copy**, not a tool to
reuse directly.

1. Research real venues (name, address, website, menu URL, **contact
   email**) — verify, never guess. Wrong venue data poisons every downstream
   feature (extraction, SEO, outreach). For anything past a handful of
   venues, don't do this as one long serial WebSearch/WebFetch pass
   yourself — dispatch it as 3-5 parallel research agents (batches of
   ~8-10 venues each, split by sub-area/municipality within the region),
   each instructed to:
   - Verify every website actually resolves (a real fetch, not a guess from
     the domain name alone) before including a venue.
   - Note the venue's specific menu/happy-hour/specials page URL, not just
     the homepage, wherever findable — this is what actually determines
     whether Phase 4's scrape produces real content on day one.
   - **Capture a real contact email while you're already on the site** —
     a "Contact"/"Book"/footer email, not a guessed `info@domain`. This is
     the single biggest time cost in Phase 5's outreach step later, and the
     venue's page is already open during this research pass; going back to
     re-find each one's email one at a time afterward is pure repeated work.
     Set it as `venues.contactEmail` in the seed script alongside
     `website`/`menuUrl`. Missing is fine (leave null) — a guessed address
     that bounces is worse than no address.
   - Explicitly cover every municipality/sub-area named in the request (a
     region spanning several towns needs venues spread across all of them,
     not clustered in the biggest one) — see the North Shore/Victoria
     launches (2026-09-11/12) for the pattern: "cover Langford, not just
     downtown Victoria" type instructions given directly to the agent.
   - Flag (don't silently include) anything ambiguous: a chain location at
     the wrong address, a site that 404s, a business that review signals
     suggest has closed.
2. If this region overlaps anything previously researched (e.g. reactivating
   a parked venue for Vancouver Island), check brain memory for a
   deactivation note first — some "wrong region" venues are parked, not
   gone, and reactivating differs from re-seeding from scratch.
3. Write a short one-off script modeled on `scripts/seed-venues.ts` (`db`
   import, a `SEED_VENUES` array, upsert-by-name against the new region's
   id) and run it once. Don't make it generic — a per-region throwaway
   script is the established pattern.
4. Each seeded venue needs `regionId` set to the new region's id,
   `active: true`, a real `address`, and — critically for Phase 4 —
   `website` and/or `menuUrl` set. A venue with neither is silently skipped
   by the scraper every night (logged, not an error), so it will never get
   real specials/events without one.
5. After the initial scrape (Phase 4) runs, expect a real chunk of venues to
   come back with zero specials/events — some genuinely have nothing
   promotional on their site, but a real fraction turn out to have content
   hidden behind an image, a PDF, or a JS-rendered widget a plain fetch can't
   see. Worth a manual recheck pass (fetch again with a real browser,
   screenshot/read anything image-based) once the region has enough venues
   showing zero to be worth batching — see the 2026-09-11/12 audit that found
   real content missed on 11 of 38 flagged venues this way. `/admin/scrape-health`
   lists these for you (see "What genuinely does NOT need touching" below).
   Once you've manually confirmed a venue genuinely has nothing promotional
   (not just "couldn't access it" — a Facebook login wall or a missing
   website isn't a confirmed-empty result), use that page's "Nothing to
   find — don't recheck" button (added 2026-09-13) so it stops resurfacing
   in this list; it auto-reappears after 90 days in case the venue's site
   changes. Don't mark a venue this way just because a pass ran out of
   budget to check it — only when its actual site/menu was seen and is
   genuinely thin.

   **The manual recheck pass itself** (run this way across all 17 Alberta
   regions, 2026-09-13 — the pattern to repeat for Ontario):
   - Use Playwright MCP tools, not the Claude-in-Chrome extension (session
     preference — see `feedback_use_playwright_not_chrome_ext` memory).
   - Work one region at a time; for anything past a handful of venues,
     dispatch each region as its own fork/subagent rather than doing it all
     serially in one context — keeps the per-region tool noise out of the
     main session and lets regions run back-to-back without ballooning
     context.
   - **Dispatch region forks one at a time, waiting for each to fully
     complete before starting the next — never in parallel.** The Playwright
     MCP browser instance is shared globally across every concurrently-
     running fork in the session; running several region-recheck forks at
     once (as the 17-region Alberta pass did, seemingly successfully) causes
     them to steal each other's tabs/navigations mid-read, producing
     duplicated and cross-contaminated data (confirmed 2026-09-13 on the
     Ontario launch: ~30 duplicate rows on one venue, a fabricated event
     written onto an unrelated venue in a different region). This is
     invisible until you check the actual inserted rows — a fork will
     report a clean-sounding result even while reading another fork's page.
     If you ever do run forks in parallel and then suspect this, check for
     duplicate specials/events by `(venue_id, last_verified_at)` clustering
     and any venue outside the region(s) you dispatched, then delete and
     redo serially.
   - Query that region's current zero-listing venue list from the
     DB directly at the start of each fork rather than trusting a stale list
     handed to it.
   - Per venue: navigate to its website if on file and dig into
     Menu/Happy-Hour/Specials/Events/Contact subpages, not just the
     homepage. If no website is on file, search for one instead of skipping
     the venue outright.
   - **If the WebSearch tool's session quota runs out** (it will, partway
     through a large region sweep), don't stop searching — navigate
     Playwright itself to `https://www.google.com/search?q=<venue>+<city>`
     and read the results the same way. No quota, same result.
   - **Capture a contact email whenever you find one**, even for a venue
     that already has real data — update `venues.contactEmail` directly.
     This is the cheapest time to gather outreach emails, since the page is
     already open.
   - Skip low-signal pages fast rather than exhaustively digging: hotel-bar
     overview pages, JS-only tab widgets you can't read, Cloudflare-blocked
     sites, pure retail/production-only businesses, and small dive bars with
     no real website after one search — note "nothing found" and move on.
     Confirming genuine emptiness matters more than forcing a result out of
     every single venue.
   - Score whatever you do find using this project's confidence convention:
     `0.9` official site/PDF stating it explicitly, `0.85` official site but
     inferred, `0.7-0.8` an official directory or the venue's own social
     page, `0.5-0.6` a single third-party mention, `0.4` weak/unofficial.
   - Write ONE throwaway insert script per region (delete it when done) that
     inserts whatever specials/events were found with the right confidence
     and `dayOfWeek`, calls `mergeVenueSourceUrls` for every URL actually
     used, and updates `contactEmail`/`website` for anything found or fixed.
     Verify with a `SELECT` before deleting the script.
   - Note permanently-closed venues instead of fabricating data — set
     `active = false` once confirmed (e.g. a Google Business "Permanently
     closed" badge), don't just leave them at zero listings forever.
   - **Watch for a fork that doesn't actually stop.** One region's fork
     during the Alberta pass kept running autonomously in the background for
     ~5 hours after reporting completion, unnoticed while later regions were
     dispatched normally — it eventually resurfaced with a confusing report
     and had archived one real event by mistake. If a fork's final report
     references work/state that doesn't match what you already know to be
     true (a region you already finished, data that should already exist),
     treat that as a signal to stop and audit before trusting anything it
     says, not just move on.
   - **Critical: whatever URL the manual pass actually found the content on
   (a happy-hour PDF, a menu subpage, a tab-switched section) must be merged
   into that venue's `sourceUrls` array — not just recorded as the
   special/event row's own `sourceUrl`.** The nightly scraper reads
   `website`/`menuUrl`/`sourceUrls` (see `venueUrls()` in `cron/index.ts`), not
   `specials.sourceUrl`/`events.sourceUrl` — those are just the "where this
   came from" citation shown to admins/users. Skipping this means every future
   nightly run re-fetches the same blank homepage and finds nothing, even
   though a human already found the real page. Every manual-verification
   insert script should call `mergeVenueSourceUrls(venueId, [...urls])` from
   `cron/upsert.ts` (or run the equivalent update) for each venue it touches.
   (A one-time backfill merging every existing `specials.sourceUrl`/
   `events.sourceUrl` into `venues.sourceUrls` across the whole platform ran
   2026-09-13 — 332 venues picked up new URLs. This note exists so it doesn't
   regress on the next region.)

## Phase 3.5 — Check event source coverage

Beyond each venue's own site, three GLOBAL (not region-scoped) sources feed
events automatically — check whether the new region is already covered by
any of them before assuming events need per-venue scraping alone:

- **Castanet** (`cron/scrapeCastanet.ts`) — already fully automatic for any
  region: it builds its region-matching from every active region's own
  venues' city names (`cron/regionMatch.ts`), so a new region with
  city-tagged venues gets matched with zero code changes. It'll only
  actually surface events if Castanet (an Okanagan-focused news site)
  publishes anything for that geography — no action needed either way, just
  don't assume a lack of Castanet events for a non-Okanagan region is a bug.
- **604Now** (`cron/scrape604now.ts`) — same automatic city-matching, covers
  the Lower Mainland (Vancouver, Richmond, Surrey/Delta/White Rock, Fraser
  Valley, North Shore, New Westminster, Port Coquitlam, and more, matched by
  each event's own venue city, not a fixed list). Also nothing to do for a
  region already inside this footprint.
- **NowMedia** (`cron/scrapeNowMedia.ts`) — the one that's genuinely
  per-region and NOT automatic. Currently wired for Kelowna, Penticton,
  Kamloops, Victoria. For a new region, actually check whether an equivalent
  "___Now.com" site exists (WebSearch + verify live, same standard as venue
  research — don't guess from the domain pattern alone, e.g. `vancouvernow.com`
  turned out to be a dead parent-company landing page, not a real site). If
  one exists and its `/events/` page matches the platform's known URL shape
  (`/events/events/{Category}/{yy}/{mm}/{dd}/{id}/{slug}` — grep for it after
  a plain fetch), add one line to `SITES` in `cron/scrapeNowMedia.ts`.
- If none of the above cover the new region, that's a real gap worth a
  WebSearch for a local news/events aggregator equivalent to 604Now's model
  (a public REST API or stable listing markup beats scraping a JS-rendered
  page — check for a `/wp-json/tribe/events/v1/events` endpoint specifically,
  since "The Events Calendar" WordPress plugin turns up often and its API is
  clean, structured, and usually unblocked by robots.txt).

## Phase 4 — Get real deals/events live (don't wait for the nightly schedule)

Deals/events only reach the site through two paths, and there is **no admin
form to hand-type a special or event** — every row is written by one of these:

- **The nightly scrape cron** (`cron/index.ts` → `cron/upsert.ts`): reads
  each active venue's `website`/`menuUrl`, extracts specials/events/menu
  items via Haiku, and replaces that venue's active rows.
- **The public submission flow** (`/submit` → admin approval) — visitor- or
  operator-submitted, reviewed in `/admin/submissions`.

To speed-run a launch, don't wait for the schedule. **Bare `npm run cron`
now refuses to run at all** (as of 2026-09-13) unless you either scope it or
explicitly opt into a full sweep:

```
Fatal error in scrape run: Error: Refusing to run an unscoped full-platform cron.
  - To scope this run to specific regions: CRON_REGIONS=slug1,slug2 npm run cron
  - To deliberately run every active region (this is what the scheduled nightly
    cron does, via a var set only on Railway's "cron" service): CRON_ALLOW_FULL_SWEEP=1 npm run cron
```

This is a hard gate in `cron/index.ts` (`runScrapeCycle`'s very first check,
before any DB query or fetch), not just doc advice — the prior version of
this doc *documented* scoping but relied on whoever's running it remembering
to actually type it, which failed twice (North Okanagan, 2026-09-10, and the
17-region Alberta launch, 2026-09-13, which ran the full cron 3+ times and
burned well over the ~$2-4 a single new region's worth of first-time
extraction should ever cost) — the exact reason a bare unscoped run is now
structurally impossible to do by accident. `CRON_ALLOW_FULL_SWEEP` is set as
an environment variable on Railway's separate `cron` service only (not on
`web`, not in any local `.env`), which is what lets the scheduled nightly
job keep running every region unscoped — the legitimate use case — while any
manual invocation without it refuses.

**For a new region launch, scope it instead:**

```bash
CRON_REGIONS=your-new-region-slug CRON_NEVER_SCRAPED_ONLY=1 npm run cron
```

- `CRON_REGIONS` (comma-separated slugs, e.g. `calgary,edmonton`) restricts
  the run to just those regions — every other active region is skipped
  entirely, no content-hash re-checks against them at all.
- `CRON_NEVER_SCRAPED_ONLY=1` further restricts to venues with no
  `scrape_runs` row yet — the exact set a brand-new region actually needs on
  day one. Omit it (or set to anything else) for a normal full re-check of
  the scoped region(s), e.g. on a later night once the region already has
  some history.

Before running any variant of `npm run cron` **more than once in a
session**: check `select pid, granted from pg_locks where locktype =
'advisory'` for a stale lock, and confirm via `Get-CimInstance
Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine
-like '*cron*' }` (PowerShell) that exactly one process tree is running
before assuming a prior attempt actually stopped. A `run_in_background`
command that gets killed by the harness does not reliably kill the actual
OS process tree underneath it — this caused two full concurrent scrape runs
to race each other, undetected, during the Alberta launch.

Once scoped correctly, watch the
log for each venue's `changed, extracted N special(s)...` line. A venue that logs "no website
or menu_url configured" needs that field filled in (back to Phase 3) before
it will ever produce content. A venue whose fetch fails (e.g. "fetch
failed") is a real per-venue issue (bot protection, a slow/broken site) —
not a sign the platform or the launch process is broken; leave it and move
on, it'll just have no specials until fixed individually.

If you want faster/cleaner coverage than a generic homepage scrape, this is
also where you'd research and manually add each venue's specific
specials/happy-hour page URL to `sourceUrls` — the weekly link-discovery
pass (`runLinkDiscovery`, Sundays only) finds these automatically over time,
but a manual seed gets you there on day one.

## Phase 5 — Admin walkthrough for the new region

In `/admin`, use the country/province/region scope switcher
(`lib/admin-region.ts`) to select the new region — every list below then
narrows to just this region's rows automatically, no config needed:

- **`/admin/submissions`** — review/approve anything the cron or a visitor
  submitted. Region-scoped, correct out of the box.
- **`/admin/outreach`** — send the "hey, we've got you listed" email to
  each venue with a `contactEmail` on file. Region-scoped, correct out of
  the box. **Sending is strictly manual, one venue at a time** — there is
  no bulk-send button and no built-in pacing. If you're sending to many
  venues, pace them out yourself (send each at ~9:30am in the recipient's
  own local time — this is an operator discipline, not something the code
  enforces).
- **`/admin/revenue`**, **`/admin/sponsored`** — region-scoped, correct out
  of the box. No monetization setup is required for a new region:
  `monetizationSettings` is keyed globally by product type (not by region),
  so a new region automatically inherits the same tip/advertise pricing as
  every other region. Don't create a region-specific pricing row —
  it wouldn't be read anywhere, and changing actual prices needs Mike's
  explicit sign-off regardless (see CLAUDE.md pricing guardrail).
- **`/admin/flagged`** and **`/admin/tips`** — known limitation: these two
  pages are **not region-scoped**, they always show every region's rows
  combined. Not something to fix as part of a region launch; just be aware
  the counts there aren't filtered.

## Phase 6 — SEO

Because every region lives under the same already-verified `todaystab.com`
domain, a new region needs **no new Google Search Console property and no
new sitemap submission** — GSC verification is per-domain, and the existing
todaystab.com property already covers every path under it.

- `app/sitemap.ts` loops every `active` region and its active venues
  automatically (1-hour revalidate) — the new region's URLs appear in the
  existing sitemap within an hour of `active: true` being set. Nothing to
  submit by hand.
- `app/robots.ts` is domain-level and already correct.
- Per-page metadata (title/description/canonical/OG) is fully generic —
  `app/[region]/layout.tsx`'s `generateMetadata` and each venue page
  (`app/[region]/venues/[id]/page.tsx`) build canonical URLs and titles off
  `region.slug`/`region.brandName` automatically. Nothing to configure.
- The only real SEO work for a new region is content quality, same as any
  region: make sure seeded venues have real addresses/websites (thin/wrong
  data is a genuine on-page SEO problem, not just a data problem), and once
  live, spot-check a venue page's rendered title/canonical in the browser to
  confirm it reads correctly for the new brand name.

## Phase 7 — Outreach emailer setup

There is **one shared Brevo account and one shared sender** for the whole
platform (`BREVO_API_KEY`, `REPORT_EMAIL_FROM` env vars) — not per-region.
A new region needs no new Brevo setup, no new verified sender domain, and no
new API key. What matters per-region:

- `regions.mailingAddress` (Phase 2) is what actually appears in the CASL
  footer of every outreach email this region sends — get it right at
  insert time, not as an afterthought.
- Reply-to resolves per-region in `lib/outreach-send.ts`: a legacy region
  with its own domain uses `reply@reply.{domain}` (its own Brevo inbound
  webhook, e.g. `reply.kelownafooddeals.shop`); every other region shares
  `reply@reply.{PATH_BASED_DOMAIN}` (`reply.todaystab.com` by default) --
  also a real, registered Brevo inbound-parsing domain wired to the same
  `/api/webhooks/brevo-inbound/[token]` route, set up 2026-09-17. (An
  earlier version of this doc said domain-less regions fell back to
  `REPORT_EMAIL_TO`/a personal inbox -- that was never actually true in the
  code, which hardcoded a plain `admin@todaystab.com` string with no
  inbound webhook behind it at all; replies sent there were silently
  swallowed. Confirmed and fixed live.) No new setup needed per region --
  the shared `reply.todaystab.com` domain covers every non-legacy region
  automatically.
- Sends only happen from `/admin/outreach`, one venue at a time, with no
  automatic pacing (see Phase 5) — plan the actual send schedule yourself.

## Phase 8 — Verify, don't assume

Before calling it done:

- Visit `todaystab.com/{slug}` — homepage, an events page, a venue detail
  page, `/submit`, `/advertise`. Confirm branding/colors/logo look right and
  no links 404.
- Confirm `/{slug}/submit`'s venue dropdown shows only this region's venues.
- In `/admin`, confirm the new region appears in the scope switcher and
  narrows `/admin/submissions`, `/admin/outreach`, `/admin/revenue`,
  `/admin/sponsored` correctly (remember `/admin/flagged` and `/admin/tips`
  won't narrow — that's expected).
- After `npm run cron`, confirm at least one seeded venue has real
  specials/events showing on its live page — not just "no data yet".
- Check the rendered `<title>`/canonical on a venue page in-browser to
  confirm SEO metadata reads correctly for the new brand.

## What genuinely does NOT need touching

Confirmed by reading the code at the time this doc was written — if any of
these turn out to have grown a hardcoded region reference since, that's a
regression, not something this doc got wrong:

- `proxy.ts` — resolves every region by slug or domain generically.
- `app/sitemap.ts`, `app/robots.ts` — loop over every `active` region.
- `app/[region]/layout.tsx` — validates any slug against the DB, 404s on an
  unknown one, theme-injects from whatever row it finds.
- `lib/admin-region.ts` — the admin scope switcher is fully data-driven off
  `regions`/`provinces`/`countries`.
- `cron/index.ts` — `runScrapeCycle()` loops `where(regions.active, true)`.
- `cron/scrapeCastanet.ts`, `cron/scrape604now.ts` — see Phase 3.5, both
  auto-match by venue city via `cron/regionMatch.ts`.
- `/admin/scrape-health` — region-scoped like every other admin page via the
  existing scope switcher, lists venues with zero listings or recent
  extraction failures for whatever region(s) are selected.
- `monetizationSettings` — global by product type, not region — no new row
  needed.
- Stripe checkout, booking, tip, outreach-email, unsubscribe, and
  venue-verify URL builders — all take a `regionSlug`/`region` param and
  build off `PATH_BASED_DOMAIN`, not a hardcoded domain.
- Brevo/GSC — one shared account/property for the whole platform.

## Optional integrations (skip unless you want them)

- **NowMedia event scraping** — see Phase 3.5. Only add an entry if the new
  region has an equivalent local news/events site worth scraping.
- **Reply-to inbox** — see Phase 7. Not needed to launch.

## Expanding outside BC, Canada

Everything above assumes a new city in an already-seeded province. If the
new region is in a different province or country:

1. Insert the `countries` row first if it doesn't exist (`code`, `name`,
   `currency` — `mailingAddress` optional, just a default new regions can
   inherit).
2. Insert the `provinces`/`state` row (`countryId`, `code`, `name`, and
   `timezone` as a real IANA name like `"America/Denver"` — this is the
   level any "today" logic reads for that region's local time).
3. Then follow Phases 2-8 above as normal.

Currency (`countries.currency`) is stored but nothing reads it yet — don't
build currency-aware logic speculatively; that's a real future feature, not
a blocker for adding a region today.

### The nightly extraction prompt was English-only (found during the Quebec launch)

`cron/extract.ts`'s Haiku extraction system prompt and its `DISCOUNT_SIGNAL`
regex (the post-extraction check that decides whether a priceless special's
evidence_quote counts as "discount language") were both English-only —
hardcoded to a "Kelowna, BC venue" framing, and the regex only matched
`off`/`free`/`half`/`bogo`/`discount`/`deal`. A real French special with no
stated absolute price (e.g. "moitié prix sur les ailes") had its
evidence_quote silently dropped by `DISCOUNT_SIGNAL` even when Haiku
extracted it correctly — the exact same failure mode as the ½-vs-"half"
bug already documented in that file, just for a whole language instead of
one symbol. Fixed 2026-09-14: `DISCOUNT_SIGNAL` now also matches
`gratuit`/`rabais`/`réduit`/`réduction`/`moitié prix`/`aubaine`/`spécial`/
`promo(tion)`/`2 pour 1`, the system prompt no longer claims every venue is
in Kelowna, and the prompt's heading-name examples ("Happy Hour", "Daily
Specials") now also list the French equivalents ("5 à 7" — Quebec's own
term for happy hour, not a literal time range — "Spéciaux", "Rabais",
"Aubaines"). Deployed to the `cron` Railway service; existing Quebec venues
were re-run via the new `scripts/force-reextract.ts` region scoping (see
below) rather than waiting for the next nightly cron.

**If a future region launches in a language other than English or French**,
re-check this file for the same English-only assumption before assuming
extraction will "just work" — it won't, silently, the same way twice.

### `scripts/force-reextract.ts` needs the same region-scoping as the nightly cron

This maintenance script (forces fresh extraction for every active venue
regardless of whether the source page changed — used when an extraction-
logic bug like the one above needs to be re-applied to already-scraped
venues) had NO region scoping at all until 2026-09-14 — it looped every
active region on the whole platform unconditionally, which by this point
means 1000+ venues. That's exactly the kind of accidental full-platform run
`CRON_ALLOW_FULL_SWEEP` exists to prevent for the normal nightly cron, just
via a separate entry point that bypassed the guard entirely. It now refuses
to run without `FORCE_REEXTRACT_REGIONS=slug1,slug2` unless
`FORCE_REEXTRACT_ALLOW_ALL=1` is explicitly set, and `FORCE_REEXTRACT_TOKEN_CEILING`
overrides its default 200k-token stop (a one-time bug-fix pass across ~200
venues needs more than that — used `2000000` for the full Quebec re-run).

### Language

`regions.language` (added 2026-09-14, default `"en"`) drives every
user-facing string via `lib/i18n.ts`'s `t(lang)` dictionary plus the
per-file `content`/`copy` records in `app/[region]/advertise/page.tsx`,
`app/[region]/privacy/page.tsx`, `app/[region]/venues/[id]/page.tsx`,
`app/[region]/blog/page.tsx`, `app/[region]/blog/[slug]/page.tsx`, and
`app/[region]/archive/page.tsx`. Built for Quebec's French-language launch.
Only `"en"` and `"fr"` exist today — adding a third language means adding a
key to every one of those dictionaries, not just `lib/i18n.ts`.

Outreach email templates (`app/api/admin/outreach/send/route.ts`'s
`buildOutreachHtml`, both functions in `lib/sales-outreach-templates.ts`)
also take a `language` param and send a genuinely different (not
machine-translated-sounding) French version, including the CASL unsubscribe
footer.

`app/[region]/layout.tsx`'s `generateMetadata` sets `openGraph.locale`
(`en_CA`/`fr_CA`) per region. The root `app/layout.tsx`'s `<html lang>`
can't read `region.language` the normal way (`getCurrentRegion()` throws
outside a `/{region}` path, e.g. the country-wide picker page) — it uses
`getCurrentOrPrimaryRegion()` instead, a tolerant variant that falls back to
the primary region when there's no `x-region-id` header to resolve.

`app/page.tsx` (the pan-Canadian city picker) and `app/not-found.tsx`
(global 404, no region context) are deliberately English-only — neither has
a single region to be French for.

**Known gap, not yet built:** the privacy policy's French translation was
AI-generated and is flagged with a TODO comment in the source
(`app/[region]/privacy/page.tsx`) — get a native/legal French speaker to
verify it before treating a Quebec region as Bill 96 compliant. Sales
outreach email copy (`lib/sales-outreach-templates.ts`) is also
AI-translated, not human-reviewed, though it followed the project's own
cold-email conventions (specific numbers, one ask, no-pressure close) rather
than literal translation.

## A note on scope

This doc deliberately does not cover: changing pricing/advertise rates for
a new region (that's a real business decision, not mechanical — see the
pricing guardrail in CLAUDE.md), building region-specific design/branding
beyond the theme color columns, or setting up region-specific paid
advertising/marketing. Those are judgment calls for whoever's launching the
region, not steps a rulebook should automate.
