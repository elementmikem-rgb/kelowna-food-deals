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

1. Research real venues (name, address, website, menu URL) via
   WebSearch/WebFetch — verify, never guess. Wrong venue data poisons every
   downstream feature (extraction, SEO, outreach).
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

## Phase 4 — Get real deals/events live (don't wait for the nightly schedule)

Deals/events only reach the site through two paths, and there is **no admin
form to hand-type a special or event** — every row is written by one of these:

- **The nightly scrape cron** (`cron/index.ts` → `cron/upsert.ts`): reads
  each active venue's `website`/`menuUrl`, extracts specials/events/menu
  items via Haiku, and replaces that venue's active rows.
- **The public submission flow** (`/submit` → admin approval) — visitor- or
  operator-submitted, reviewed in `/admin/submissions`.

To speed-run a launch, don't wait for the schedule. **Do not just run
`npm run cron`** — confirmed by testing this playbook end-to-end (see the
North Okanagan launch, 2026-09-10): that command runs `runScrapeCycle()`
across **every** active region in the platform, oldest first, and it does
not skip a region just because it has no changes — it still has to walk
every one of that region's existing venues to check their content hash
before moving on. With Kelowna alone at 80+ active venues, this means
waiting through the entire existing platform's queue before the brand-new
region's venues are even reached — many minutes, for zero benefit.

Instead, write a tiny one-off script (same "throwaway per-launch tool"
pattern as the venue seed script in Phase 3) that scrapes only the new
region:

```ts
import { db, regions } from "@/db";
import { eq } from "drizzle-orm";
import { processVenue } from "../cron/index";
import { getActiveVenues } from "../cron/upsert";

const [region] = await db.select().from(regions).where(eq(regions.slug, "SLUG_HERE")).limit(1);
const venueList = await getActiveVenues(region!.id);
for (const venue of venueList) {
  await processVenue(venue, region!.id);
}
```

Run it once with `npx tsx --require ./scripts/env.cjs <path>.ts`, watch the
log for each venue's `changed, extracted N special(s)...` line, then delete
the script — it isn't meant to be committed. A venue that logs "no website
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
- Reply-to resolves per-region in `app/api/admin/outreach/send/route.ts`: a
  legacy region with its own domain uses `reply@reply.{domain}` (a real
  Brevo inbound webhook, only wired up for the original two regions); a
  domain-less region (i.e. every new one) falls back to
  `REPORT_EMAIL_TO`/`element.mikem@gmail.com`. This works today — replies
  land in a real inbox — no setup required to launch. Only worth revisiting
  (wiring a shared `reply.todaystab.com` inbound webhook in Brevo) if
  outreach volume for the new region grows enough that routing precision
  starts to matter.
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
- `monetizationSettings` — global by product type, not region — no new row
  needed.
- Stripe checkout, booking, tip, outreach-email, unsubscribe, and
  venue-verify URL builders — all take a `regionSlug`/`region` param and
  build off `PATH_BASED_DOMAIN`, not a hardcoded domain.
- Brevo/GSC — one shared account/property for the whole platform.

## Optional integrations (skip unless you want them)

- **NowMedia event scraping** (`cron/scrapeNowMedia.ts`): a hardcoded array
  mapping `regionSlug` to a third-party local-events site
  (`kelownanow.com`, `pentictonnow.com`). Only add an entry if the new
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

## A note on scope

This doc deliberately does not cover: changing pricing/advertise rates for
a new region (that's a real business decision, not mechanical — see the
pricing guardrail in CLAUDE.md), building region-specific design/branding
beyond the theme color columns, or setting up region-specific paid
advertising/marketing. Those are judgment calls for whoever's launching the
region, not steps a rulebook should automate.
