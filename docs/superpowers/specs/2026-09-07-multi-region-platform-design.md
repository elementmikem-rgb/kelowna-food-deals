# Multi-Region Platform Design

## Goal

Turn Kelowna Food Deals from a single-tenant site into a shared platform that can host many independently-branded regional sites (each with its own domain, name, logo, colors, and venue data) on one codebase, one deployment, and one database. Kelowna Food Deals keeps its existing name, domain, and data as-is and becomes the first "tenant" of this platform.

This spec covers the platform architecture only. Launching any specific new region (finding its venues, buying its domain, running its outreach) is a separate, repeatable operational playbook (Section 6) that uses this platform once built — it is not itself part of this spec's implementation plan.

## Background

`db/schema.ts` already has a `region` text column (defaulting to the literal string `"central-okanagan"`) on `venues`, `specials`, and `events`, with a comment anticipating this expansion. No `regions` table exists, and nothing else in the codebase — routing, branding, admin, cron — is aware of region at all. Every brand string ("Kelowna Food Deals"), every color in `app/globals.css`, every domain reference (`NEXT_PUBLIC_SITE_URL`, hardcoded fallbacks to `https://kelownafooddeals.shop`), and the single shared `ADMIN_PASSWORD` currently assume exactly one tenant.

## Region roadmap (reference, not part of this build)

Each entry below will eventually become one row in the `regions` table, added one at a time as each region actually launches. Order reflects current planning, not a commitment to timing.

**BC:** Kelowna *(live)* → South Okanagan → North Okanagan → Kamloops → Lower Mainland → Vancouver Island → Prince George

**Alberta:** Calgary → Edmonton → Red Deer → Lethbridge → Banff/Canmore → Fort McMurray → Grande Prairie → Medicine Hat

**Rest of Canada:** open, to be planned when Alberta is underway.

## Global Constraints

- Kelowna Food Deals' existing domain, brand name, and data must be preserved exactly through migration — this is a live site with real traffic, real bookings, and real outreach already sent referencing it.
- One shared Stripe account across all regions (all Canadian, all CAD) — charges carry a region identifier in metadata rather than each region getting its own Stripe account.
- One shared admin login (existing `ADMIN_PASSWORD`) across all regions — no per-region admin accounts in this phase.
- Every region needs its own CASL-compliant mailing address before any outreach email can be sent from it (this was already a hard requirement for Kelowna's own outreach and applies identically per region).

## Section 1: The `regions` table

```
regions
  id            serial primary key
  slug          text unique not null        -- "kelowna", "south-okanagan"
  domain        text unique not null        -- "kelownafooddeals.shop"
  brandName     text not null               -- "Kelowna Food Deals"
  logoUrl       text not null
  accentColor       text not null           -- hex, replaces the hardcoded --accent
  accentDimColor    text not null
  accentSoftColor   text not null
  backgroundColor   text not null
  foregroundColor   text not null
  evergreenColor    text not null
  mailingAddress    text not null           -- CASL requirement, per region
  contactEmail      text not null           -- Brevo sender identity for this region
  tokenCeiling      integer not null default 50000  -- this region's nightly scrape budget
  active            boolean not null default true
  createdAt         timestamp not null default now()
```

`venues.region`, `specials.region`, and `events.region` change from a free-text column defaulting to a literal string into `regionId integer not null references regions.id`. A migration backfills every existing row to the `kelowna` region created from the current site's real values (domain, brand name, current CSS colors, current `OUTREACH_MAILING_ADDRESS`, current `REPORT_EMAIL_FROM`).

**Open decision, flagged rather than assumed:** `monetization_settings` (sponsorship pricing) is currently global, one row per product type. This spec keeps pricing global across all regions for now (YAGNI — no region has launched to prove different markets need different prices) but the table should gain a nullable `regionId` so per-region pricing is a data change, not a schema change, whenever that's actually needed.

## Section 2: Domain routing & theming

Next.js middleware reads `request.headers.get("host")` on every request, looks up the matching `regions` row, and attaches it to the request (via a header passed to Server Components, since middleware can't directly share JS objects with the render). Region lookups are cached in memory with a short TTL rather than hitting Postgres on every request — a region's config changes rarely.

A `getCurrentRegion()` helper (server-only) becomes the single place every page/component reads brand name, colors, and domain from, replacing hardcoded "Kelowna Food Deals" strings and the hardcoded `NEXT_PUBLIC_SITE_URL` fallback throughout the codebase (outreach emails, sitemap, unsubscribe links, Stripe success/cancel URLs, the `SiteHeader` logo/wordmark, `app/layout.tsx` metadata).

Theming: `app/globals.css`'s hardcoded hex values (`--accent: #c14a1f` etc.) become the *fallback* only. The root layout injects a small inline `<style>` block per request setting those same custom properties from the current region's config. Every existing component already reads colors via `var(--accent)` etc., so no component-level changes are needed — only where those values come from changes.

All region domains point at the same Railway deployment (custom domain added in Railway's dashboard, DNS pointed at it) — there is no separate deployment per region. Onboarding a new region's routing is: buy domain → add DNS → add the domain to Railway → insert the `regions` row. No code deploy required for a new region to go live once the platform itself ships.

## Section 3: Admin dashboard

A region switcher is added to `AdminNav` (a dropdown next to the existing nav pills). Every existing admin page (Submissions, Outreach, Inbox, Sponsored, Revenue, Analytics) scopes its queries to the selected region via the same `regionId` filter added to the underlying tables. The selection persists in a cookie so switching regions doesn't need to be repeated on every navigation.

Revenue gets one addition beyond per-region scoping: an "All regions" view (a distinct option in the region switcher, not a new page) that sums totals across every region — useful for a business-wide view without switching through each one individually. Per-region breakdowns still work as already built; this is additive.

## Section 4: Cron scraping across regions

The nightly cron job currently processes one flat list of "active venues" against one shared `TOKEN_CEILING`. It changes to loop over each active region, running the existing `processVenue` logic against that region's venues only, against *that region's own* `tokenCeiling` from the `regions` table. One region hitting its budget stops only that region's scraping for the night — it can't crowd out another region's share, and a region's budget is a data change (not a code or env var change) as it proves out needing more or less.

Castanet event scraping, analytics pruning, monthly-special archival, and booking sync (the other nightly steps) stay global/shared since none of them are meaningfully region-scoped work.

## Section 5: Data migration

One migration, run once, before any of the above ships:

1. Insert one `regions` row for `kelowna`, populated from the site's actual current values (domain, brand name, current CSS hex colors, current `OUTREACH_MAILING_ADDRESS` env var, current `REPORT_EMAIL_FROM`, `TOKEN_CEILING`).
2. Add `regionId` columns to `venues`, `specials`, `events` (and the nullable one to `monetization_settings` per Section 1), backfilled to that new row's id.
3. Drop the old free-text `region` column and `DEFAULT_REGION` constant once backfilled.

No other existing table needs a direct `regionId` — `bookings`, `analytics_events`, `submissions`, `outreach_sends`, `inbound_emails`, `category_sponsors`, `venue_photos`, `scrape_runs` all reach a region indirectly through the `venueId` they already carry, so an admin page scoped to a region joins through `venues` rather than needing its own column.

## Section 6: Launching a new region (operational playbook, not code)

Once the platform above ships, adding a region is:

1. Buy the domain, point DNS at Railway, add the custom domain in Railway's dashboard.
2. Insert its `regions` row (brand name, logo, colors, mailing address, contact email, starting token budget).
3. Seed its initial venues — the one genuinely manual step per region, scaled to how many venues you want live at launch.
4. Run the same outreach playbook already proven on Kelowna (find venue emails, send the branded-per-region template, admin approval flow — all of which already work per-region once Sections 1-4 ship).

## Deferred: per-domain static rendering (decided 2026-09-07, after the initial build)

The initial implementation resolved "which region" via the request's Host header, read in `app/layout.tsx` and `components/SiteHeader.tsx` via `getCurrentRegion()`. This works correctly but has a real cost: reading the request (a Next.js "Dynamic API") anywhere in a page's render tree forces that whole route to render live on every request, with no static caching or ISR. Since the root layout and site header sit in every public page's render tree, this took the entire public site from static + hourly ISR caching to a full database query per visit — a real latency/DB-load regression on a live site, discovered by the final whole-branch review, not something the original spec anticipated.

Decision: fixed the immediate regression cheaply (see below) rather than doing the full correct fix now, since no second region is imminent.

- **Immediate fix (shipped):** added `getPrimaryRegion()` to `lib/regions.ts` — an ordinary database lookup (no `headers()`) keyed by a `PRIMARY_REGION_DOMAIN` env var (default `kelownafooddeals.shop`). `app/layout.tsx`, `components/SiteHeader.tsx`, `app/sitemap.ts`, and `app/robots.ts` now use this instead of `getCurrentRegion()`, restoring static/ISR rendering. `getCurrentRegion()` (the header-based one) is untouched and still used correctly by API routes (checkout, outreach, submit) and the admin dashboard, which are inherently per-request anyway and lose nothing by staying header-based.
- **Real limitation this leaves:** as written, every domain would render the SAME static content (whatever `PRIMARY_REGION_DOMAIN` points to) — there's no way for two different domains to get genuinely different cached pages with this approach. That's fine today (only one region/domain exists) but does not extend to a second region without more work.
- **The full fix, deferred until a second region is actually close to launching:** make the domain part of Next.js's routing itself (a URL rewrite in `proxy.ts` that maps each domain to its own route segment, e.g. via `generateStaticParams()` enumerating known domains), so each domain gets pre-rendered and cached separately, with correct per-domain `<title>`/meta description/Open Graph tags baked into the actual server response (not just client-injected, which doesn't help SEO crawlers or social-share unfurls). This touches essentially every public page/layout file (~10-15 files) and needs careful URL-parity verification against production, since this project has no staging environment. Scope this as its own spec + plan when a second region is scheduled to launch, not as a quick add-on.

## Out of scope for this spec

- Automating venue discovery for a new region (still manual/semi-manual research per region).
- Per-region admin logins (one shared login covers all regions in this phase).
- Per-region Stripe accounts (one shared account, region-tagged metadata).
- Any specific region's actual launch (South Okanagan or otherwise) — that's Section 6's playbook applied later, not part of this implementation plan.
