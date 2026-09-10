# Adding a new region

This is the exact, minimal procedure for adding a new city/region to
TodaysTab. It assumes the platform is already on the consolidated
path-based architecture (todaystab.com/{slug}) documented in
`docs/superpowers/specs/2026-09-07-multi-region-platform-design.md` and
`docs/superpowers/specs/2026-09-08-country-province-hierarchy-design.md`.

Read this whole file before starting. It is written so a Claude session with
no other context on this project can follow it mechanically.

## The one-line summary

A new region under an existing country/province needs **zero infrastructure
work and zero code changes**. It needs: one `regions` row, some `venues`
rows, and (optionally) a couple of DNS-free integrations. Everything else —
routing, sitemap, robots.txt, admin scope switcher, nightly scrape cron,
analytics — is already generic and picks up any `active` region automatically.

If you find yourself about to touch Cloudflare, Railway, or DNS for a new
region, stop — that almost certainly means you're doing something this
process doesn't require. The only reason to touch infra is a genuinely new
country/timezone/currency, covered in "Expanding outside BC, Canada" below.

## Step 1 — Confirm the province exists (skip if it does)

Regions hang off `provinces`, which hang off `countries`. For a new city in
an existing province (e.g. adding Vernon or Penticton-adjacent towns in BC),
this step is already done — check first:

```sql
select p.id, p.code, p.name, p.timezone, c.code as country
from specials.provinces p
join specials.countries c on c.id = p.country_id;
```

If the province is missing, insert it (see "Expanding outside BC, Canada"
below for the full country+province case). For BC specifically it already
exists.

## Step 2 — Insert the `regions` row

There is no admin UI or script for this yet — do it directly against
production via a one-off Node script (same `db` import pattern as
`scripts/seed-venues.ts`), or a direct SQL insert if you're comfortable with
that. Every column on `regions` (see `db/schema.ts`) that is `NOT NULL` must
be filled in:

| Column | What it is | Example |
|---|---|---|
| `slug` | URL path segment, lowercase, hyphenated | `"vernon"` |
| `domain` | **Leave `null`** for any region added after the todaystab.com migration — it lives entirely at `todaystab.com/{slug}` and needs no domain of its own | `null` |
| `brandName` | Shown in titles, emails, city-picker | `"Vernon Food Deals"` (or whatever fits — doesn't have to match "TodaysTab" branding) |
| `logoUrl` | Path under `/public` or a full URL | `"/icons/icon-192.png"` (reuse the shared one unless you have a real per-region logo) |
| `accentColor`, `accentDimColor`, `accentSoftColor`, `backgroundColor`, `foregroundColor`, `evergreenColor` | Theme CSS custom properties, hex strings | Copy Kelowna's or Penticton's values as a starting point, tweak later |
| `mailingAddress` | **Real physical address, required for CASL** (Canada's anti-spam law) — every outreach email includes this | A real mailing address you control |
| `contactEmail` | Reply-to / contact address for this region | `element.mikem@gmail.com` or a per-region address |
| `tokenCeiling` | Nightly Haiku extraction budget for this region alone, defaults to 50000 if omitted | `50000` to start |
| `active` | Must be `true` for the region to show up anywhere (city picker, cron, sitemap, admin scope) | `true` |
| `provinceId` | FK from Step 1 | the BC province's id |

**Do not skip `mailingAddress`.** It's a legal requirement (CASL), not a
nice-to-have, and `app/api/admin/outreach/send/route.ts` will fail outreach
sends for a region without one (the column is `NOT NULL` in the schema, so
you can't actually skip it, but don't put a placeholder).

Once inserted, `/{slug}` works immediately — the city picker
(`app/page.tsx`), sitemap/robots (`app/sitemap.ts`, `app/robots.ts`), the
`app/[region]/layout.tsx` metadata/theme injection, and the admin scope
switcher (`lib/admin-region.ts`) all query `regions` live and require no
code change to notice a new row.

## Step 3 — Seed venues

There's no generic "add venues for a region" tool. `scripts/seed-venues.ts`
is a one-off script hardcoded to Kelowna (`regions.slug === "kelowna"`) —
it's a **pattern to copy**, not a tool to reuse directly. For a new region:

1. Research real venues (name, address, website, menu URL) — verify via
   WebSearch/WebFetch, never guess. Check
   `feedback_docs_poison_reviews`-style care: wrong venue data poisons every
   downstream feature.
2. **Check for confirmed-closed venues first** if this region overlaps
   anything previously researched (unlikely for a brand-new city, but if
   you're re-adding a previously-deactivated region like the Vancouver
   Island venue, check `project_kelowna_specials_west_coast_grill_deactivated.md`
   in the brain memory first — some "wrong region" venues are parked, not
   gone, and reactivating them is different from re-seeding from scratch).
3. Write a short one-off script modeled on `scripts/seed-venues.ts`
   (`db` import, a `SEED_VENUES` array, upsert-by-name against the new
   region's id) and run it once. Don't try to make it generic — a per-region
   throwaway script is the established pattern here.
4. Each seeded venue needs `regionId` set to the new region's id,
   `active: true`, and a real `address` at minimum. `website`/`menuUrl` are
   what the nightly cron scrapes — a venue with neither is skipped every
   night (`cron/index.ts`'s `processVenue` logs "no website or menu_url
   configured" and moves on, harmlessly).

## Step 4 — Verify, don't assume

Before calling it done:

- Visit `todaystab.com/{slug}` — homepage, an events page, a venue detail
  page, `/submit`, `/advertise`. Confirm branding/colors/logo look right and
  no links 404.
- Confirm `/{slug}/submit`'s venue dropdown shows only this region's venues
  (it's filtered by `regionId` — if you see venues from another region, that
  filter broke).
- In `/admin`, confirm the new region appears in the country/province/region
  scope switcher and that switching to it correctly narrows every admin
  list (submissions, specials, events, outreach) to just this region's rows.
- `curl -I` a URL under the old flow isn't relevant here (no domain to
  redirect from) — skip that check for a domain-less region.
- Wait for (or manually trigger) one nightly cron run and confirm
  `cron/index.ts`'s log output shows `Starting scrape run for N active
  venue(s) in region {slug}` — this is your proof the cron picked the region
  up with zero code changes.

## What genuinely does NOT need touching

Confirmed by grep across the codebase at the time this doc was written — if
any of these turn out to have grown a hardcoded region reference since,
that's a regression, not something this doc got wrong:

- `proxy.ts` — resolves every region by slug or domain generically.
- `app/sitemap.ts`, `app/robots.ts` — loop over every `active` region.
- `app/[region]/layout.tsx` — validates any slug against the DB, 404s on an
  unknown one, theme-injects from whatever row it finds.
- `lib/admin-region.ts` — the admin scope switcher is fully data-driven off
  `regions`/`provinces`/`countries`.
- `cron/index.ts` — `runScrapeCycle()` loops `where(regions.active, true)`.
- Stripe checkout, booking, tip, outreach-email, unsubscribe, and
  venue-verify URL builders — all take a `regionSlug`/`region` param and
  build off `PATH_BASED_DOMAIN`, not a hardcoded domain.

## Optional integrations (skip unless you want them)

- **NowMedia event scraping** (`cron/scrapeNowMedia.ts`): a hardcoded array
  mapping `regionSlug` to a third-party local-events site
  (`kelownanow.com`, `pentictonnow.com`). Only add an entry if the new
  region has an equivalent local news/events site worth scraping — most
  regions won't, and it's fine to leave unset.
- **Reply-to inbox**: outreach emails for a domain-less region fall back to
  `process.env.REPORT_EMAIL_TO` (or `element.mikem@gmail.com`) as the
  reply-to address, since there's no `reply@reply.{domain}` Brevo webhook
  for a region with no domain of its own. This works fine — replies land in
  a real inbox — but if outreach volume for the new region grows, consider
  wiring a shared `reply.todaystab.com` inbound webhook in Brevo (same
  pattern as the existing per-domain ones) so replies route more precisely.

## Expanding outside BC, Canada

Everything above assumes a new city in an already-seeded province. If the
new region is in a different province or country:

1. Insert the `countries` row first if the country doesn't exist yet
   (`code`, `name`, `currency` — `mailingAddress` optional, it's just a
   default new regions can inherit).
2. Insert the `provinces`/`state` row (`countryId`, `code`, `name`, and
   `timezone` as a real IANA name like `"America/Denver"` — this is the
   level cron scheduling and any "today" logic reads for that region's
   local time, so get it right).
3. Then follow Steps 2-4 above as normal.

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
