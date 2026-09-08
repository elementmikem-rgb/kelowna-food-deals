# Country/Province Hierarchy Design

## Goal

Extend the multi-region platform (`docs/superpowers/specs/2026-09-07-multi-region-platform-design.md`) with the two levels of geography above a region — country and province/state — so that timezone, currency, and legal defaults resolve correctly for a region outside BC, and so the admin dashboard can filter by country and province instead of only by a single flat region list. This is schema and resolution-logic work; it does not launch any new country, province, or region.

## Background

Two regions are live today (Kelowna, Penticton), both in BC, Canada. The multi-region spec's own "Deferred" section flagged that its `getPrimaryRegion()` static-rendering workaround "does not extend to a second region without more work" — that work happened in a separate session (confirmed live: `getAllSpecialsWithVenue()` and friends had no region filter at all, mixing both regions' venues on one page; fixed by switching every public page to `getCurrentRegion()` and adding `regionId` filters throughout `lib/data.ts`/`lib/events-data.ts`).

That fix exposed the next gap directly: `lib/time.ts`'s `pacificTodayISODate()` hardcodes `"America/Vancouver"`, and every "what day is it / is this event today" check in the app calls it. A region outside the Pacific timezone would show the wrong "today" — not a hypothetical, but the next real bug waiting for region #3 if it lands in a different timezone. The user's stated growth path is Brand → Country → Province → Region, with the admin dashboard eventually needing to filter the same way ("log in to admin, select country, then region, to see analytics, inbox, etc.").

Separately, exploration for this spec found that admin **Inbox** and **Analytics** currently have *no* region scoping at all — not even today's single-level picker applies to them (only Outreach, Revenue, Sponsored, and Submissions use `getSelectedAdminRegionId()`). Per the brainstorming conversation, fixing that is bundled into this same effort rather than deferred.

## Global Constraints

- No `brands` table — brand is singular and global by the user's own framing ("1 global brand"); it stays a couple of top-level constants, not a new entity.
- This is a fixed 3-level tree (country → province → region), not a generic self-referencing parent chain. Nothing here should introduce arbitrary-depth hierarchy machinery for a shape that's known to be exactly 3 levels.
- Nothing below `region` changes: `venues.regionId`, `specials.regionId`, `events.regionId`, and every region-scoped query fixed in the prior session keep their exact current shape and behavior.
- No per-user admin roles/permissions in this phase — one shared admin login, same as the existing multi-region spec's constraint. The country/province/region picker is a convenience filter for that one admin, not access control.
- Domain-per-region stays as-is (buy a domain, wire it up by hand). A wildcard-subdomain alternative is written down as a documented future option (Section 5) — not built now.

## Section 1: The `countries` and `provinces` tables

```
countries
  id            serial primary key
  code          text unique not null        -- "CA", "US" (ISO 3166-1 alpha-2)
  name          text not null                -- "Canada"
  currency      text not null                -- "CAD" -- ISO 4217, for future Stripe/pricing use
  mailingAddress    text                     -- CASL-style default; nullable since a region can
                                              -- always set its own and today's two regions already do
  createdAt     timestamp not null default now()

provinces
  id            serial primary key
  countryId     integer not null references countries.id
  code          text not null                -- "BC", "AB", "WA"
  name          text not null                -- "British Columbia"
  timezone      text not null                -- IANA name, e.g. "America/Vancouver"
  createdAt     timestamp not null default now()
  unique(countryId, code)
```

`regions` gains one column: `provinceId integer not null references provinces.id`. Every other existing `regions` column (slug, domain, brandName, colors, mailingAddress, contactEmail, tokenCeiling, active) is unchanged — a region is still exactly what it is today, one row per launched market with its own domain, now with a parent to hang timezone/currency/legal defaults off of.

**Timezone lives on `provinces`, not `countries`:** a country like Canada or the US genuinely spans multiple timezones (BC is Pacific, Ontario is Eastern) — a single "country default" timezone would be actively wrong for most provinces in exactly the countries this hierarchy exists to support. Province is the right level where timezone is actually a stable, well-defined fact. No region-level override column is added: no real case has come up where a single city needs a different timezone than its own province, so this stays YAGNI rather than adding a nullable column with no current use.

**Why country-level `mailingAddress` is nullable:** every region already has to set its own real CASL mailing address today (a hard constraint from the original multi-region spec, and true independent of this hierarchy), so a country-level default is a convenience, not a requirement — a country can exist with no default and every region under it still works as long as each region sets its own. Currency, by contrast, is required at the country level since it's the entire point of storing it (no region-level override — YAGNI, same reasoning as mailingAddress but landing the other way since no region has ever needed its own currency distinct from its country's).

## Section 2: Resolution — `getRegionContext()`

`proxy.ts`'s domain → region lookup is unchanged: still an exact match on `regions.domain`, still sets `x-region-id`. `getCurrentRegion()` and `getPrimaryRegion()` keep their exact current signatures — no caller of either needs to change.

A new function in `lib/regions.ts`:

```typescript
interface RegionContext {
  region: Region;
  province: Province;
  country: Country;
  timezone: string;   // province.timezone -- the only place it's stored (see Section 1)
  currency: string;   // country.currency -- the only place it's stored
}

export async function getRegionContext(region: Region): Promise<RegionContext>
```

Callers that already have a `Region` (from `getCurrentRegion()`/`getPrimaryRegion()`) pass it in rather than this function re-resolving it, avoiding a redundant region lookup. It resolves the region's `province` and that province's `country` (two more cached lookups, same 60-second in-memory cache pattern `lib/regions.ts` already uses for regions — extended with two more small maps, not a new caching strategy).

`lib/time.ts` changes shape: `pacificTodayISODate()` and its hardcoded `"America/Vancouver"` literal are replaced by `regionTodayISODate(timezone: string)`, taking the timezone string from `getRegionContext()` instead of assuming Pacific. Every call site that currently calls `pacificTodayISODate()` with no arguments (day-of-week filtering on the homepage, "is this event today" checks, the cron's day-boundary logic) is updated to resolve the current region's context first and pass its timezone through. This is the one change in this spec with real behavioral consequence today, even with both existing regions in the same timezone — it's the fix that makes the *next* region safe to launch outside Pacific without silently showing the wrong day.

**Trade-off flagged, not solved:** resolving country/province adds a DB round-trip (cached, so usually free after the first hit) on top of the region lookup already happening per request. At today's traffic this is noise. If it ever shows up in a slow-query log, the fix is combining region+province+country into one joined query rather than three sequential ones — not a redesign, just an optimization deferred until there's a real number to justify it.

## Section 3: Admin — Country → Province → Region picker

Extends the existing `RegionSwitcher` component and `kds_admin_region` cookie pattern (`lib/admin-region.ts`, `components/AdminNav.tsx`) rather than replacing it.

**Selection state:** the current single cookie (`number | "all"`) becomes three independent cookies (or one JSON-encoded cookie — an implementation-plan detail, not a design one): `kds_admin_country` (`number | "all"`), `kds_admin_province` (`number | "all"`), `kds_admin_region` (`number | "all"`), each defaulting to `"all"` exactly like today's single cookie does.

**Cascading UX:** picking a country populates the province dropdown with only that country's provinces (querying `provinces` by `countryId`); picking a province populates the region dropdown with only that province's regions. Selecting "All countries" collapses province and region back to "All" — a province can't be selected without its country, and a region can't be selected without its province. This is a standard cascading-select pattern; no novel interaction design needed.

**`getSelectedAdminScope()`** replaces `getSelectedAdminRegionId()`. Its return shape changes from `number | "all"` to something that resolves to a concrete filter set:

```typescript
interface AdminScope {
  regionIds: number[] | "all";  // "all" = no filter; otherwise the exact list of region ids
                                  // the current country/province/region selection resolves to
}
```

If a single region is picked, `regionIds` is `[thatRegionId]` — behaviorally identical to today. If a country is picked with no province/region drill-down, `regionIds` is every region id under every province under that country (a real join, resolved once per request and cached the same way region lookups already are) — this is the one place with genuinely new logic, since today's picker only ever produces a single id or `"all"`, never an intermediate multi-id set.

**Every admin data-fetching function that currently takes `regionId: number`** (in `app/admin/outreach/page.tsx`, `app/admin/revenue/page.tsx`, `app/admin/sponsored/page.tsx`, `app/admin/submissions/page.tsx`, and the underlying `lib/*` functions they call) changes to accept `regionIds: number[] | "all"` and filter with `inArray(table.regionId, regionIds)` instead of `eq(table.regionId, regionId)` — mechanical, but touches every one of those call sites, so it's sized as its own implementation task rather than folded into the schema migration task.

**Inbox and Analytics** currently have zero region scoping (confirmed during this spec's exploration — `getAdminNavCounts()`, the inbox thread list, and the analytics queries filter nothing). Per the brainstorming conversation, this spec brings both into the same `AdminScope`-based filtering as the other four admin sections, rather than leaving them as a known gap. `inboundEmails` and `outreachSends` reach a region only indirectly (through `venues.regionId`, when `venueId` is set — an unmatched-sender thread has no venue and therefore no region at all); the plan needs a decision on how an unmatched/venueless inbox thread behaves under a country or province filter (recommendation: it shows only when scope is `"all"`, since it has no region to belong to — flagged here for the plan to make explicit rather than leaving implicit).

## Section 4: Data migration

One migration, run once:

1. Create `countries` and `provinces` tables.
2. Insert one `countries` row: Canada (`CA`, `CAD`).
3. Insert one `provinces` row: British Columbia (`BC`, `America/Vancouver`, countryId → Canada).
4. Add `regions.provinceId`, backfill both existing region rows (Kelowna, Penticton) to BC's id.
5. Make `regions.provinceId` `NOT NULL` once backfilled — no region can exist outside the hierarchy going forward, the same discipline `venues.regionId` already enforces one level down.

No other existing table needs a direct `countryId`/`provinceId` column — anything that needs to know a venue's/special's/event's country or province reaches it by walking `region → province → country`, the same indirection pattern the original multi-region spec already established for tables that reach a region through `venueId`.

## Section 5: Domain strategy (documented, not built)

Today's model — one purchased apex domain per region, DNS/Cloudflare/Brevo wired up by hand (as just done for Penticton) — does not change as part of this spec. It does not scale past a handful of regions: each new region is a real, manual, multi-service setup cost (domain registrar, Cloudflare zone + DNS records, Brevo domain authentication + inbound-parsing webhook, Railway custom domain).

**Documented future alternative, not adopted now:** a wildcard-subdomain model (e.g. `penticton.branddomain.com` under one Cloudflare zone and one Brevo-authenticated domain) would remove nearly all of that per-region manual setup — a new region becomes a DNS wildcard match plus a `regions` row insert, no new domain purchase or per-domain service configuration. The cost is a less "premium" per-city domain than a dedicated `.shop` domain, which the user has explicitly preferred so far. This tradeoff is recorded here so it's available to revisit once manual per-region setup is actually the bottleneck (e.g. launching regions 4-5 back to back), not decided speculatively now.

## Out of scope for this spec

- Any specific new country, province, or region actually launching — this spec only builds the hierarchy and resolution logic underneath the two regions that already exist.
- Per-user admin roles/permissions scoped to a country or province (explicitly deferred per this spec's Global Constraints — the picker is a filter, not access control).
- Currency conversion, multi-currency Stripe, or any actual pricing change — `countries.currency` is stored for future use, nothing reads or acts on it yet.
- Language/locale/i18n of any kind.
- Wildcard-subdomain implementation (Section 5 is a record of the tradeoff, not a build).
- Automating region launch (buying the domain, wiring DNS/Cloudflare/Brevo, seeding venues) — still the manual playbook the original multi-region spec's Section 6 already describes, unchanged by this spec.
