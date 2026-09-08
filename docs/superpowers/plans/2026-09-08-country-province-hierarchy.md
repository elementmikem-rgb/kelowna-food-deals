# Country/Province Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a country → province → region hierarchy above the existing `regions` table so timezone resolves correctly per region (not hardcoded Pacific), and extend the admin dashboard's region picker and every admin data query to filter by that hierarchy — including Inbox and Analytics, which currently have no region filtering at all.

**Architecture:** Two new tables (`countries`, `provinces`) sit above the existing `regions` table via a new `regions.provinceId` FK; nothing below `region` (venues/specials/events) changes. A new `getRegionContext()` resolver in `lib/regions.ts` walks region → province → country to produce a timezone, used by a timezone-parameterized rewrite of `lib/time.ts`'s "what day is it" functions. The admin side extends today's single-cookie region picker (`lib/admin-region.ts`, `components/AdminNav.tsx`) to three cascading cookies (country/province/region) resolving to a `regionIds: number[] | "all"` scope, which every admin query — including two (Inbox, Analytics) that currently have zero scoping — is converted to accept.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, Postgres, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-country-province-hierarchy-design.md`

## Global Constraints

- No `brands` table — brand stays implicit/global, not a new entity (spec Global Constraints).
- Fixed 3-level tree (country → province → region), not a generic self-referencing parent chain.
- Nothing below `region` changes: `venues.regionId`, `specials.regionId`, `events.regionId`, and every region-scoped public query from the prior session keep their exact current shape.
- No per-user admin roles/permissions — the picker is a convenience filter for the one shared admin login, not access control.
- Domain-per-region model is unchanged; wildcard subdomains are a documented future option only (spec Section 5), not built here.
- Out of scope (spec's own list): any actual new country/province/region launch, currency conversion or multi-currency Stripe, language/locale/i18n, wildcard-subdomain implementation, automating region launch itself.

---

### Task 1: `countries` and `provinces` tables + `regions.provinceId` migration

**Files:**
- Modify: `db/schema.ts` (add `countries`, `provinces` tables before the existing `regions` table; add `provinceId` to `regions`)
- Create: `db/migrations/00XX_<generated_name>.sql` (via `drizzle-kit generate` — do not hand-write)
- Create: `scripts/.dev-seed-country-province.ts` (throwaway, deleted at the end of this task — seeds Canada/BC and backfills both existing regions)
- Test: manual verification via direct DB query (this project's established pattern — no migration test harness exists; see `db/migrations/` for prior examples, none have dedicated tests)

**Interfaces:**
- Produces: `countries` table (`id`, `code`, `name`, `currency`, `mailingAddress`, `createdAt`), exported as `export const countries = ...` with `export type Country = typeof countries.$inferSelect;`
- Produces: `provinces` table (`id`, `countryId`, `code`, `name`, `timezone`, `createdAt`), exported as `export const provinces = ...` with `export type Province = typeof provinces.$inferSelect;`
- Produces: `regions.provinceId: integer not null references provinces.id` (new column on the existing table)
- Consumes: nothing from other tasks (this is the foundation task)

- [ ] **Step 1: Add the two new tables to `db/schema.ts`, before the `regions` table**

Insert this immediately above `export const regions = specialsSchema.table("regions", {` (db/schema.ts:19):

```typescript
export const countries = specialsSchema.table("countries", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // "CA", "US" (ISO 3166-1 alpha-2)
  name: text("name").notNull(), // "Canada"
  currency: text("currency").notNull(), // "CAD" (ISO 4217) -- stored for future use, nothing reads it yet
  // CASL-style default a region can inherit -- nullable because every region already
  // has to set its own real mailing address today (a hard multi-region-spec
  // requirement independent of this hierarchy), so a country-level default is a
  // convenience, not a requirement.
  mailingAddress: text("mailing_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Country = typeof countries.$inferSelect;

export const provinces = specialsSchema.table(
  "provinces",
  {
    id: serial("id").primaryKey(),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id),
    code: text("code").notNull(), // "BC", "AB", "WA"
    name: text("name").notNull(), // "British Columbia"
    // A country can span multiple timezones (BC is Pacific, Ontario is Eastern) --
    // province is the level where timezone is actually a stable, well-defined fact.
    // No region-level override: no real case has needed a city to differ from its
    // own province's timezone.
    timezone: text("timezone").notNull(), // IANA name, e.g. "America/Vancouver"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("provinces_country_code_idx").on(table.countryId, table.code)]
);
export type Province = typeof provinces.$inferSelect;
```

- [ ] **Step 2: Add `provinceId` to the existing `regions` table**

In the `regions` table definition (db/schema.ts:19-40), add this field. Add it as nullable first (Step 2), backfill (Step 4), then tighten to `notNull` in a second migration (Step 6) — a single-migration `not null` on a table with existing rows fails without a default, and there is no sensible universal default.

```typescript
export const regions = specialsSchema.table("regions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").notNull().unique(),
  brandName: text("brand_name").notNull(),
  logoUrl: text("logo_url").notNull(),
  accentColor: text("accent_color").notNull(),
  accentDimColor: text("accent_dim_color").notNull(),
  accentSoftColor: text("accent_soft_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  foregroundColor: text("foreground_color").notNull(),
  evergreenColor: text("evergreen_color").notNull(),
  mailingAddress: text("mailing_address").notNull(),
  contactEmail: text("contact_email").notNull(),
  tokenCeiling: integer("token_ceiling").notNull().default(50000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  provinceId: integer("province_id").references(() => provinces.id), // nullable until Step 6
});
```

- [ ] **Step 3: Generate and apply the migration**

Run: `npx drizzle-kit generate` (this project's established pattern — never hand-write migration SQL; see `db/migrations/0026_harsh_stark_industries.sql` for the most recent example of this exact flow)
Run: `npx drizzle-kit migrate` (applies against production `DATABASE_URL` from `.env.local` — this project's established direct-to-production migration pattern, confirmed safe by every prior migration this session)
Expected: both commands succeed with no errors; `npx drizzle-kit migrate` reports the new migration applied.

- [ ] **Step 4: Seed Canada/BC and backfill both existing regions**

Create `scripts/.dev-seed-country-province.ts`:

```typescript
import { db, countries, provinces, regions } from "@/db";
import { isNull } from "drizzle-orm";

async function main() {
  const [canada] = await db
    .insert(countries)
    .values({ code: "CA", name: "Canada", currency: "CAD" })
    .returning({ id: countries.id });

  const [bc] = await db
    .insert(provinces)
    .values({ countryId: canada.id, code: "BC", name: "British Columbia", timezone: "America/Vancouver" })
    .returning({ id: provinces.id });

  const updated = await db
    .update(regions)
    .set({ provinceId: bc.id })
    .where(isNull(regions.provinceId)) // all rows currently have provinceId null
    .returning({ id: regions.id, slug: regions.slug });

  console.log("Canada id:", canada.id);
  console.log("BC id:", bc.id);
  console.log("Backfilled regions:", updated);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run: `npx tsx --require ./scripts/env.cjs scripts/.dev-seed-country-province.ts`
Expected output: `Backfilled regions:` lists both `kelowna` and `penticton` (or their current slugs) with non-null ids — confirms both existing regions now point at BC.

- [ ] **Step 5: Verify the backfill directly against the database**

Run this against `.env.local`'s `DATABASE_URL` (same throwaway-Node-script pattern used throughout this project for direct verification):

```typescript
import { db, regions, provinces, countries } from "@/db";
import { eq } from "drizzle-orm";

const rows = await db
  .select({ slug: regions.slug, province: provinces.name, country: countries.name, timezone: provinces.timezone })
  .from(regions)
  .innerJoin(provinces, eq(regions.provinceId, provinces.id))
  .innerJoin(countries, eq(provinces.countryId, countries.id));
console.log(rows);
```

Expected: two rows, both showing `province: "British Columbia"`, `country: "Canada"`, `timezone: "America/Vancouver"`.

- [ ] **Step 6: Tighten `regions.provinceId` to `NOT NULL`**

In `db/schema.ts`, change the field added in Step 2:

```typescript
  provinceId: integer("province_id").notNull().references(() => provinces.id),
```

Run: `npx drizzle-kit generate` then `npx drizzle-kit migrate`
Expected: migration succeeds (safe now that Step 4 backfilled every existing row — a `NOT NULL` migration on a column with any remaining null values would fail, which is the intended safety check that Step 4 must run first).

- [ ] **Step 7: Delete the throwaway seed script and commit**

```bash
rm scripts/.dev-seed-country-province.ts
git add db/schema.ts db/migrations/
git commit -m "Add countries and provinces tables, backfill regions.provinceId"
```

---

### Task 2: `getRegionContext()` resolver

**Files:**
- Modify: `lib/regions.ts`

**Interfaces:**
- Consumes: `countries`, `provinces` tables and `Country`, `Province` types from Task 1; existing `Region` type and `getRegionByDomain`/`getRegionById` caching pattern (unchanged)
- Produces: `export interface RegionContext { region: Region; province: Province; country: Country; timezone: string; currency: string }` and `export async function getRegionContext(region: Region): Promise<RegionContext>` — Task 3 and Task 6 both consume this exact shape and function name

- [ ] **Step 1: Add province/country lookup helpers with the same cache pattern as `getRegionByDomain`/`getRegionById`**

In `lib/regions.ts`, alongside the existing `byDomain`/`byId` maps (lib/regions.ts:9-10):

```typescript
import { db, regions, provinces, countries } from "@/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { Region, Province, Country } from "@/db/schema";

const CACHE_TTL_MS = 60_000;
const byDomain = new Map<string, { region: Region | null; expiresAt: number }>();
const byId = new Map<number, { region: Region | null; expiresAt: number }>();
const provinceById = new Map<number, { province: Province | null; expiresAt: number }>();
const countryById = new Map<number, { country: Country | null; expiresAt: number }>();

async function getProvinceById(id: number): Promise<Province | null> {
  const cached = provinceById.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.province;
  const [row] = await db.select().from(provinces).where(eq(provinces.id, id)).limit(1);
  const province = row ?? null;
  provinceById.set(id, { province, expiresAt: Date.now() + CACHE_TTL_MS });
  return province;
}

async function getCountryById(id: number): Promise<Country | null> {
  const cached = countryById.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.country;
  const [row] = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  const country = row ?? null;
  countryById.set(id, { country, expiresAt: Date.now() + CACHE_TTL_MS });
  return country;
}
```

- [ ] **Step 2: Add `getRegionContext()`**

Directly below the helpers from Step 1, still in `lib/regions.ts`:

```typescript
export interface RegionContext {
  region: Region;
  province: Province;
  country: Country;
  timezone: string; // province.timezone -- the only place it's stored (see Task 1)
  currency: string; // country.currency -- the only place it's stored
}

export async function getRegionContext(region: Region): Promise<RegionContext> {
  const province = await getProvinceById(region.provinceId);
  if (!province) {
    throw new Error(`getRegionContext: region ${region.id} points at province ${region.provinceId}, which does not exist`);
  }
  const country = await getCountryById(province.countryId);
  if (!country) {
    throw new Error(`getRegionContext: province ${province.id} points at country ${province.countryId}, which does not exist`);
  }
  return { region, province, country, timezone: province.timezone, currency: country.currency };
}
```

- [ ] **Step 3: Write a throwaway verification script (this project's established no-test-harness pattern for `lib/regions.ts` — it has no existing test file)**

```typescript
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
// getCurrentRegion() needs a request context (headers()), so verify via getRegionById directly instead:
import { db, regions } from "@/db";
import { eq } from "drizzle-orm";

const [region] = await db.select().from(regions).where(eq(regions.slug, "kelowna")).limit(1);
const ctx = await getRegionContext(region);
console.log(ctx.timezone, ctx.currency, ctx.province.name, ctx.country.name);
```

Run and expect: `America/Vancouver CAD British Columbia Canada`.

- [ ] **Step 4: Commit**

```bash
git add lib/regions.ts
git commit -m "Add getRegionContext() resolving region -> province -> country"
```

---

### Task 3: Timezone-aware "what day is it" functions

**Files:**
- Modify: `lib/time.ts`
- Modify: `app/page.tsx`, `app/monthly/page.tsx`, `app/events/page.tsx` (each already calls `getCurrentRegion()` per the prior session's region-scoping fix — this task threads the resolved timezone through)
- Modify: `components/SpecialsBoard.tsx`, `components/MonthlySpecials.tsx` (if applicable — verify exact usage before editing)
- Test: `lib/time.test.ts` (existing file — extend with timezone-parameterized cases)

**Interfaces:**
- Consumes: `getRegionContext()` from Task 2
- Produces: `regionTodayISODate(timezone: string, now?: Date): string`, `todayDowInRegion(timezone: string, now?: Date): number`, `regionMonthIndex(timezone: string, now?: Date): number` — replacing `pacificTodayISODate`, `todayDowPacific`, `pacificMonthIndex` respectively. No other function in `lib/time.ts` changes in this task (see "Explicitly out of scope" note below).

**Explicitly out of scope for this task:** `endOfDayPacific`, `startOfDayPacific`, and `formatCheckedAt` stay Pacific-only. They're used for admin revenue date-range math and admin-facing timestamp display (`app/admin/revenue/page.tsx`, `lib/bookings-data.ts`, submission/special "verified X ago" labels) — not the public "what day are we showing specials for" logic this task fixes, and converting them has no bug to point to today. Converting them without a real second-timezone region to prove the need against would be speculative work the spec's Global Constraints already caution against (YAGNI). Revisit only when an actual region outside Pacific launches.

- [ ] **Step 1: Read the current `lib/time.ts` in full before editing**

This file has ~10 functions; only three change. Confirm the exact current signatures of `pacificTodayISODate`, `todayDowPacific`, and `pacificMonthIndex` match what Step 2 below assumes before editing (they were last read in full during this plan's own research — re-read now in case anything changed since).

- [ ] **Step 2: Rename and parameterize the three functions**

Replace:

```typescript
export function pacificTodayISODate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

export function todayDowPacific(now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    weekday: "short",
  }).format(now);
  const idx = DOW_NAMES.findIndex((d) => d === weekday);
  return idx === -1 ? now.getUTCDay() : idx;
}
```

with:

```typescript
export function regionTodayISODate(timezone: string, now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: timezone });
}

export function todayDowInRegion(timezone: string, now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  const idx = DOW_NAMES.findIndex((d) => d === weekday);
  return idx === -1 ? now.getUTCDay() : idx;
}
```

And replace:

```typescript
export function pacificMonthIndex(now: Date = new Date()): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    month: "numeric",
  }).format(now);
  const parsed = parseInt(month, 10);
  return Number.isNaN(parsed) ? now.getUTCMonth() : parsed - 1;
}
```

with:

```typescript
export function regionMonthIndex(timezone: string, now: Date = new Date()): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "numeric",
  }).format(now);
  const parsed = parseInt(month, 10);
  return Number.isNaN(parsed) ? now.getUTCMonth() : parsed - 1;
}
```

`PACIFIC_TZ` stays defined at the top of the file (still used by `endOfDayPacific`/`startOfDayPacific`/`formatCheckedAt`, which are out of scope per this task's header). `pacificHour` (the internal helper used only by `endOfDayPacific`/`startOfDayPacific`) is unchanged.

- [ ] **Step 3: Update `lib/time.test.ts`**

Read the existing test file first to match its exact style, then update every test that called the old function names to call the new ones with an explicit timezone argument (`"America/Vancouver"` for the existing Pacific-behavior assertions — the test behavior itself doesn't change, only the call signature). Add one new test proving a non-Pacific timezone actually produces a different result, which the old hardcoded version could never have supported:

```typescript
test("regionTodayISODate resolves per timezone, not hardcoded Pacific", () => {
  // 2026-01-01 02:00 UTC is still 2025-12-31 in Vancouver (UTC-8) but already
  // 2026-01-01 in a UTC+1 timezone -- proves the timezone argument is load-bearing,
  // not a no-op parameter.
  const instant = new Date("2026-01-01T02:00:00Z");
  expect(regionTodayISODate("America/Vancouver", instant)).toBe("2025-12-31");
  expect(regionTodayISODate("Europe/Paris", instant)).toBe("2026-01-01");
});
```

Run: `npm test`
Expected: all tests pass, including the new one.

- [ ] **Step 4: Thread the resolved timezone through the public pages that filter "today"**

In `app/page.tsx` (already calls `getCurrentRegion()` per the prior session's fix — see the existing `const region = await getCurrentRegion();` line), add:

```typescript
import { getRegionContext } from "@/lib/regions";
// ... existing imports ...

export default async function Home() {
  const region = await getCurrentRegion();
  const { timezone } = await getRegionContext(region);
  const [specials, categorySponsors] = await Promise.all([
    getAllSpecialsWithVenue(region.id),
    getActiveCategorySponsors(),
  ]);
  // ... existing body ...
```

Pass `timezone` as a new prop to `<SpecialsBoard specials={specials} categorySponsors={categorySponsors} timezone={timezone} />`.

In `components/SpecialsBoard.tsx` (a client component — it cannot call `getCurrentRegion()`/`getRegionContext()` itself, since those are server-only and header-based, hence threading the value in as a prop):

- Add `timezone: string` to the component's props type, alongside the existing `specials`/`categorySponsors` props.
- Change the import at the top of the file from `import { todayDowPacific, dowFullName, pacificTodayISODate } from "@/lib/time";` to `import { todayDowInRegion, dowFullName, regionTodayISODate } from "@/lib/time";`.
- Line 49: `const initialToday = useMemo(() => todayDowPacific(), []);` becomes `const initialToday = useMemo(() => todayDowInRegion(timezone), [timezone]);`
- Line 69 (inside the `syncToday` effect): `const actual = todayDowPacific();` becomes `const actual = todayDowInRegion(timezone);` — and add `timezone` to that `useEffect`'s dependency array.
- Line 117 (inside the `dailyRandom` venue-ordering logic): `const today = pacificTodayISODate();` becomes `const today = regionTodayISODate(timezone);`

In `app/monthly/page.tsx` (already calls `getCurrentRegion()`/`getMonthlySpecials(region.id)` per the prior session's fix):

```typescript
import { getRegionContext } from "@/lib/regions";
// ... existing imports ...

export default async function MonthlyPage() {
  const region = await getCurrentRegion();
  const { timezone } = await getRegionContext(region);
  const specials = await getMonthlySpecials(region.id);
  // ... existing body, pass timezone to MonthlySpecials below ...
  <MonthlySpecials specials={specials} timezone={timezone} />
```

In `components/MonthlySpecials.tsx`:
- Add `timezone: string` to the component's props type.
- Change `import { pacificMonthIndex } from "@/lib/time";` to `import { regionMonthIndex } from "@/lib/time";`.
- Line 12: `const monthName = MONTH_NAMES[pacificMonthIndex()];` becomes `const monthName = MONTH_NAMES[regionMonthIndex(timezone)];`

In `app/events/page.tsx` (already calls `getCurrentRegion()`/`getRecurringEvents(region.id)`/`getUpcomingOneOffEvents(region.id)` per the prior session's fix):

```typescript
import { getRegionContext } from "@/lib/regions";
// ... existing imports ...

export default async function EventsPage() {
  const region = await getCurrentRegion();
  const { timezone } = await getRegionContext(region);
  const [recurring, upcoming] = await Promise.all([
    getRecurringEvents(region.id),
    getUpcomingOneOffEvents(region.id, timezone),
  ]);
  // ... existing body, pass timezone to EventsBoard below ...
  <EventsBoard recurring={recurring} upcoming={upcoming} timezone={timezone} />
```

In `lib/events-data.ts`, `getUpcomingOneOffEvents` has its own private, hand-duplicated `pacificTodayISODate()` function (not imported from `lib/time.ts` — a pre-existing duplication this task fixes as part of touching this function anyway). Delete the private function (currently just above `getRecurringEvents`):

```typescript
function pacificTodayISODate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}
```

and change `getUpcomingOneOffEvents`'s signature and body:

```typescript
import { regionTodayISODate } from "@/lib/time";

// was: export async function getUpcomingOneOffEvents(regionId: number, daysAhead = 21)
export async function getUpcomingOneOffEvents(
  regionId: number,
  timezone: string,
  daysAhead = 21
): Promise<EventWithVenue[]> {
  const today = regionTodayISODate(timezone);
  const until = new Date();
  until.setDate(until.getDate() + daysAhead);
  const untilStr = until.toLocaleDateString("en-CA", { timeZone: timezone });
  // ... rest of function unchanged
```

In `components/EventsBoard.tsx`:
- Add `timezone: string` to the component's props type.
- Change `import { todayDowPacific, dowFullName } from "@/lib/time";` to `import { todayDowInRegion, dowFullName } from "@/lib/time";`.
- Line 28: `const today = useMemo(() => todayDowPacific(), []);` becomes `const today = useMemo(() => todayDowInRegion(timezone), [timezone]);`

- [ ] **Step 5: Manually verify against both live regions**

Run: `npm run dev`, then with the dev server running, use `curl -H "Host: kelownafooddeals.shop" http://localhost:3000/` and `curl -H "Host: pentictonfooddeals.shop" http://localhost:3000/` (same Host-header-override pattern used to verify the prior session's region-scoping fix).
Expected: both return 200 with today's correct day-of-week specials showing (both regions are in BC/Pacific today, so this proves no regression — a genuine cross-timezone proof isn't possible until a non-Pacific region exists, which is explicitly out of scope for this plan).

- [ ] **Step 6: Commit**

```bash
git add lib/time.ts lib/time.test.ts app/page.tsx app/monthly/page.tsx app/events/page.tsx components/SpecialsBoard.tsx components/MonthlySpecials.tsx components/EventsBoard.tsx
git commit -m "Resolve today/day-of-week/month from the region's own timezone, not hardcoded Pacific"
```

---

### Task 4: Admin Country → Province → Region picker

**Files:**
- Modify: `lib/admin-region.ts`
- Modify: `app/api/admin/region/route.ts`
- Modify: `components/AdminNav.tsx`
- Modify: `components/AdminShell.tsx`
- Test: manual verification via the admin UI (this project's established pattern for admin-facing UI work — no test harness exists for admin pages)

**Interfaces:**
- Consumes: `countries`, `provinces` tables from Task 1
- Produces: `export interface AdminScope { regionIds: number[] | "all" }`, `export async function getSelectedAdminScope(): Promise<AdminScope>`, and `export function regionScopeCondition(column: PgColumn, scope: number[] | "all"): SQL | undefined` — Task 5, Task 6, and Task 7 all consume these exact names

- [ ] **Step 1: Replace `lib/admin-region.ts`'s single-cookie selector with three cascading cookies**

Full replacement of `lib/admin-region.ts`:

```typescript
import { cookies } from "next/headers";
import { inArray, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db, regions, provinces } from "@/db";
import { getCurrentRegion } from "./regions";

export const ADMIN_COUNTRY_COOKIE = "kds_admin_country";
export const ADMIN_PROVINCE_COOKIE = "kds_admin_province";
export const ADMIN_REGION_COOKIE = "kds_admin_region";

export interface AdminScope {
  regionIds: number[] | "all";
}

// A single region selection always wins (most specific). Falling back through
// province -> country -> "no selection yet" mirrors the exact fallback order
// the old single-cookie getSelectedAdminRegionId() used, just with two more
// levels above it.
export async function getSelectedAdminScope(): Promise<AdminScope> {
  const jar = await cookies();
  const regionRaw = jar.get(ADMIN_REGION_COOKIE)?.value;
  const provinceRaw = jar.get(ADMIN_PROVINCE_COOKIE)?.value;
  const countryRaw = jar.get(ADMIN_COUNTRY_COOKIE)?.value;

  if (regionRaw === "all" || provinceRaw === "all" || countryRaw === "all") {
    return { regionIds: "all" };
  }

  if (regionRaw && !Number.isNaN(Number(regionRaw))) {
    return { regionIds: [Number(regionRaw)] };
  }

  if (provinceRaw && !Number.isNaN(Number(provinceRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .where(eq(regions.provinceId, Number(provinceRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  if (countryRaw && !Number.isNaN(Number(countryRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .innerJoin(provinces, eq(regions.provinceId, provinces.id))
      .where(eq(provinces.countryId, Number(countryRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  // Nothing selected yet (fresh admin session) -- default to the current
  // domain's own region, exactly like the old getSelectedAdminRegionId() did.
  const current = await getCurrentRegion();
  return { regionIds: [current.id] };
}

// Shared by every admin query converted in Tasks 5-7: "all" means no filter
// at all (condition omitted from the WHERE clause via undefined), otherwise
// an inArray on whichever column identifies that row's region.
export function regionScopeCondition(column: PgColumn, scope: number[] | "all"): SQL | undefined {
  return scope === "all" ? undefined : inArray(column, scope);
}
```

- [ ] **Step 2: Extend `/api/admin/region` to accept all three levels**

Full replacement of `app/api/admin/region/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ADMIN_COUNTRY_COOKIE, ADMIN_PROVINCE_COOKIE, ADMIN_REGION_COOKIE } from "@/lib/admin-region";

const MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { countryId, provinceId, regionId } = await req.json();
  const res = NextResponse.json({ ok: true });
  // Selecting a broader level (country/province) clears anything more specific
  // that was previously chosen -- otherwise switching country wouldn't actually
  // change scope if a leaf region cookie from a prior selection was still set,
  // since getSelectedAdminScope() checks region before province before country.
  if (countryId !== undefined) {
    res.cookies.set(ADMIN_COUNTRY_COOKIE, String(countryId), { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_PROVINCE_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_REGION_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
  } else if (provinceId !== undefined) {
    res.cookies.set(ADMIN_PROVINCE_COOKIE, String(provinceId), { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_REGION_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
  } else if (regionId !== undefined) {
    res.cookies.set(ADMIN_REGION_COOKIE, String(regionId), { httpOnly: true, maxAge: MAX_AGE });
  }
  return res;
}
```

- [ ] **Step 3: Cascading picker UI in `AdminNav.tsx`**

Replace the `RegionSwitcher` function in `components/AdminNav.tsx` (lines 44-80) with a three-level cascading version:

```typescript
function ScopeSwitcher({
  countries,
  provinces,
  regions,
  selectedCountryId,
  selectedProvinceId,
  selectedRegionId,
}: {
  countries: { id: number; name: string }[];
  provinces: { id: number; countryId: number; name: string }[];
  regions: { id: number; provinceId: number; brandName: string }[];
  selectedCountryId: number | "all";
  selectedProvinceId: number | "all";
  selectedRegionId: number | "all";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(level: "countryId" | "provinceId" | "regionId", value: string) {
    setLoading(true);
    await fetch("/api/admin/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [level]: value }),
    });
    router.refresh();
    setLoading(false);
  }

  const visibleProvinces =
    selectedCountryId === "all" ? [] : provinces.filter((p) => p.countryId === selectedCountryId);
  const visibleRegions =
    selectedProvinceId === "all" ? [] : regions.filter((r) => r.provinceId === selectedProvinceId);

  const selectClass =
    "press-pill rounded-full border border-border bg-transparent px-3 py-1.5 text-xs text-muted disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={String(selectedCountryId)}
        disabled={loading}
        onChange={(e) => handleChange("countryId", e.target.value)}
        className={selectClass}
      >
        <option value="all">All countries</option>
        {countries.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {selectedCountryId !== "all" && (
        <select
          value={String(selectedProvinceId)}
          disabled={loading}
          onChange={(e) => handleChange("provinceId", e.target.value)}
          className={selectClass}
        >
          <option value="all">All provinces</option>
          {visibleProvinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {selectedProvinceId !== "all" && (
        <select
          value={String(selectedRegionId)}
          disabled={loading}
          onChange={(e) => handleChange("regionId", e.target.value)}
          className={selectClass}
        >
          <option value="all">All regions</option>
          {visibleRegions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.brandName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

Update `AdminNav`'s own props and render call to accept and pass through `countries`, `provinces`, `regions` (now needing `provinceId` on each region row and `countryId` on each province row), plus `selectedCountryId`/`selectedProvinceId`/`selectedRegionId`, replacing the single `regions`/`selectedRegionId` props and the `<RegionSwitcher regions={regions} selectedRegionId={selectedRegionId} />` call with `<ScopeSwitcher countries={countries} provinces={provinces} regions={regions} selectedCountryId={selectedCountryId} selectedProvinceId={selectedProvinceId} selectedRegionId={selectedRegionId} />`.

- [ ] **Step 4: Wire `AdminShell.tsx` to fetch the hierarchy and derive the three selected ids**

Replace `components/AdminShell.tsx`'s data-fetching (currently `db.select({ id: regions.id, slug: regions.slug, brandName: regions.brandName }).from(regions)` and `getSelectedAdminRegionId()`):

```typescript
import { getAdminNavCounts } from "@/lib/admin-counts";
import { getSelectedAdminScope, ADMIN_COUNTRY_COOKIE, ADMIN_PROVINCE_COOKIE, ADMIN_REGION_COOKIE } from "@/lib/admin-region";
import { db, regions, provinces, countries } from "@/db";
import { cookies } from "next/headers";
import { AdminNav } from "./AdminNav";

// ... inside AdminShell, replacing the existing Promise.all destructure:
const jar = await cookies();
const selectedCountryId = jar.get(ADMIN_COUNTRY_COOKIE)?.value;
const selectedProvinceId = jar.get(ADMIN_PROVINCE_COOKIE)?.value;
const selectedRegionId = jar.get(ADMIN_REGION_COOKIE)?.value;

const [{ pendingSubmissions, unreadInbox, flaggedCount }, countryRows, provinceRows, regionRows, scope] =
  await Promise.all([
    getAdminNavCounts(),
    db.select({ id: countries.id, name: countries.name }).from(countries),
    db.select({ id: provinces.id, countryId: provinces.countryId, name: provinces.name }).from(provinces),
    db.select({ id: regions.id, provinceId: regions.provinceId, brandName: regions.brandName }).from(regions),
    getSelectedAdminScope(),
  ]);
```

Pass `countryRows`, `provinceRows`, `regionRows`, and the three parsed cookie values (each `Number(x) | "all"`, defaulting to `"all"` when the cookie is absent — mirror the exact `raw === "all" ? "all" : Number(raw)` pattern the old `getSelectedAdminRegionId()` used) into `AdminNav`'s new props from Step 3. `scope` itself isn't passed to `AdminNav` (the nav only needs the raw selected ids to render the dropdowns) — it exists here so Task 5-7's page-level changes have a single already-computed `AdminScope` available via `getSelectedAdminScope()` directly in each admin page, not routed through `AdminShell`.

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, log in to `/admin/login` with `.env.local`'s `ADMIN_PASSWORD`, navigate to any admin page.
Expected: the nav shows a country dropdown; selecting "Canada" reveals a province dropdown; selecting "British Columbia" reveals a region dropdown listing both Kelowna and Penticton; selecting one persists across a page refresh (cookie-backed, same as today's single picker).

- [ ] **Step 6: Commit**

```bash
git add lib/admin-region.ts app/api/admin/region/route.ts components/AdminNav.tsx components/AdminShell.tsx
git commit -m "Add cascading Country > Province > Region admin picker"
```

---

### Task 5: Convert existing admin `regionId` consumers to `regionIds`

**Files:**
- Modify: `lib/sponsored-data.ts` (`getFeaturedVenues`, `getBoostedSpecials`, `getPartnerVenues`, `getVenueOptions`, `getSpecialOptions`)
- Modify: `lib/bookings-data.ts` (`getPendingApprovalBookings`, `getRefundsNeeded`)
- Modify: `lib/revenue-data.ts` (`getRevenueInRange`)
- Modify: `app/admin/outreach/page.tsx`
- Modify: `app/admin/submissions/page.tsx`
- Modify: `app/admin/sponsored/page.tsx`
- Modify: `app/admin/revenue/page.tsx`

**Interfaces:**
- Consumes: `getSelectedAdminScope()`, `regionScopeCondition()` from Task 4
- Produces: every function listed above now takes `regionIds: number[] | "all"` instead of `regionId?: number` — no other task consumes these signatures directly, but this establishes the pattern Task 6 and Task 7 follow for Analytics and Inbox

This task is one repeated mechanical change across every file above: replace `regionId?: number` parameters with `regionIds: number[] | "all"`, and replace every `regionId === undefined ? undefined : eq(column, regionId)` (or the `selectedRegionId === "all" ? undefined : eq(...)` variant in the two page files) with `regionScopeCondition(column, regionIds)`.

- [ ] **Step 1: `lib/sponsored-data.ts` — five functions**

```typescript
// getFeaturedVenues, was: (regionId?: number)
export async function getFeaturedVenues(regionIds: number[] | "all"): Promise<FeaturedVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, featuredUntil: venues.featuredUntil })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        gt(venues.featuredUntil, new Date()),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.featuredUntil));
  return rows as FeaturedVenue[];
}

// getBoostedSpecials, was: (regionId?: number)
export async function getBoostedSpecials(regionIds: number[] | "all"): Promise<BoostedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      venueId: specials.venueId,
      venueName: venues.name,
      title: specials.title,
      boostedUntil: specials.boostedUntil,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        isNull(specials.archivedAt),
        gt(specials.boostedUntil, new Date()),
        regionScopeCondition(specials.regionId, regionIds)
      )
    )
    .orderBy(asc(specials.boostedUntil));
  return rows as BoostedSpecial[];
}

// getPartnerVenues, was: (regionId?: number)
export async function getPartnerVenues(regionIds: number[] | "all"): Promise<PartnerVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, partnerSince: venues.partnerSince })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        isNotNull(venues.partnerSince),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.partnerSince));
  return rows as PartnerVenue[];
}

// getVenueOptions, was: (regionId?: number)
export async function getVenueOptions(regionIds: number[] | "all"): Promise<VenueOption[]> {
  return db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), regionScopeCondition(venues.regionId, regionIds)))
    .orderBy(asc(venues.name));
}

// getSpecialOptions, was: (regionId?: number)
export async function getSpecialOptions(regionIds: number[] | "all"): Promise<SpecialOption[]> {
  return db
    .select({ id: specials.id, venueId: specials.venueId, title: specials.title })
    .from(specials)
    .where(and(isNull(specials.archivedAt), regionScopeCondition(specials.regionId, regionIds)))
    .orderBy(asc(specials.title));
}
```

Add `import { regionScopeCondition } from "@/lib/admin-region";` to the top of `lib/sponsored-data.ts`.

- [ ] **Step 2: `lib/bookings-data.ts` — two functions**

```typescript
// getPendingApprovalBookings, was: (regionId?: number)
export async function getPendingApprovalBookings(regionIds: number[] | "all"): Promise<PendingBooking[]> {
  const rows = await db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      venueId: bookings.venueId,
      venueName: venues.name,
      specialId: bookings.specialId,
      specialTitle: specials.title,
      category: bookings.category,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      conflictDetected: bookings.conflictDetected,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .leftJoin(specials, eq(bookings.specialId, specials.id))
    .where(and(eq(bookings.status, "pending_approval"), regionScopeCondition(venues.regionId, regionIds)))
    .orderBy(asc(bookings.createdAt));
  return rows;
}

// getRefundsNeeded, was: (regionId?: number)
export async function getRefundsNeeded(regionIds: number[] | "all"): Promise<RefundNeeded[]> {
  return db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .where(
      and(
        eq(bookings.status, "rejected"),
        eq(bookings.refundNeeded, true),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(bookings.reviewedAt));
}
```

Add `import { regionScopeCondition } from "@/lib/admin-region";` to the top of `lib/bookings-data.ts`.

- [ ] **Step 3: `lib/revenue-data.ts` — `getRevenueInRange`**

```typescript
// was: (from: Date, to: Date, regionId?: number)
export async function getRevenueInRange(
  from: Date,
  to: Date,
  regionIds: number[] | "all"
): Promise<RevenueSummary> {
  const [tipsSummary, bookingRows] = await Promise.all([
    getTipsInRange(from, to), // unchanged -- tips have no region scoping in this plan, see Task 5 Step 3 note below
    db
      .select({
        id: bookings.id,
        productType: bookings.productType,
        venueName: venues.name,
        specialTitle: specials.title,
        priceCents: bookings.priceCents,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(venues, eq(bookings.venueId, venues.id))
      .leftJoin(specials, eq(bookings.specialId, specials.id))
      .where(
        and(
          inArray(bookings.status, REVENUE_STATUSES),
          gte(bookings.createdAt, from),
          lt(bookings.createdAt, to),
          regionScopeCondition(venues.regionId, regionIds)
        )
      )
      .orderBy(sql`${bookings.createdAt} desc`),
  ]);
  // ... rest of function unchanged
}
```

Add `import { regionScopeCondition } from "@/lib/admin-region";` to the top of `lib/revenue-data.ts`.

**Note on tips staying unscoped:** `getTipsInRange()` (in `lib/tips-data.ts`) has no region parameter at all today, and this plan does not add one — the spec named Inbox and Analytics specifically as the gaps to close (Task 6, Task 7); Tips having the same gap was discovered during this plan's research but is not in the spec's stated scope. Flagging it here rather than silently expanding scope; a natural follow-up plan, not part of this one.

- [ ] **Step 4: Update the four admin page call sites**

`app/admin/outreach/page.tsx` — replace `import { getSelectedAdminRegionId } from "@/lib/admin-region";` with `import { getSelectedAdminScope } from "@/lib/admin-region";`, and:

```typescript
const { regionIds } = await getSelectedAdminScope();

const venueRows = await db
  .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
  .from(venues)
  .where(
    and(
      isNotNull(venues.contactEmail),
      eq(venues.active, true),
      regionScopeCondition(venues.regionId, regionIds)
    )
  );
```

(add `import { getSelectedAdminScope, regionScopeCondition } from "@/lib/admin-region";` and keep the existing `and`/`eq`/`isNotNull` imports from `drizzle-orm`)

`app/admin/submissions/page.tsx` — same import swap, and:

```typescript
const { regionIds } = await getSelectedAdminScope();

// ... inside the .where(and(...)):
eq(submissions.status, "needs_review"),
// A submission for a venue that doesn't exist yet has no region to scope by --
// keep it visible under any specific scope rather than hiding it, same
// behavior as the old single-region version.
regionIds === "all"
  ? undefined
  : or(inArray(venues.regionId, regionIds), isNull(submissions.venueId))
```

(this one keeps its own inline `or(...)` rather than `regionScopeCondition()`, since it has the extra `isNull(submissions.venueId)` clause `regionScopeCondition()`'s generic shape doesn't accommodate — add `inArray` to the existing `drizzle-orm` import list)

`app/admin/sponsored/page.tsx` — replace `getSelectedAdminRegionId()` and the `regionFilter` variable:

```typescript
const { regionIds } = await getSelectedAdminScope();

const [
  featuredVenues,
  boostedSpecials,
  venueOptions,
  specialOptions,
  partnerVenues,
  categorySponsors,
  pendingBookings,
  refundsNeeded,
  settingsRows,
] = await Promise.all([
  getFeaturedVenues(regionIds),
  getBoostedSpecials(regionIds),
  getVenueOptions(regionIds),
  getSpecialOptions(regionIds),
  getPartnerVenues(regionIds),
  getActiveCategorySponsors(),
  getPendingApprovalBookings(regionIds),
  getRefundsNeeded(regionIds),
  // ... rest unchanged
```

`app/admin/revenue/page.tsx` — replace the `selectedRegionId`/`getRevenueInRange` call:

```typescript
const { regionIds } = await getSelectedAdminScope();
const summary = await getRevenueInRange(from, to, regionIds);
```

- [ ] **Step 5: Typecheck and manually verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, log in, visit `/admin/outreach`, `/admin/submissions`, `/admin/sponsored`, `/admin/revenue` with different country/province/region selections from Task 4's picker.
Expected: each page's data changes to match the selected scope exactly as it did with the old single-region picker when a leaf region is picked, and now also responds correctly to a country/province-level selection (showing combined data from every region under it).

- [ ] **Step 6: Commit**

```bash
git add lib/sponsored-data.ts lib/bookings-data.ts lib/revenue-data.ts app/admin/outreach/page.tsx app/admin/submissions/page.tsx app/admin/sponsored/page.tsx app/admin/revenue/page.tsx
git commit -m "Convert admin queries from single regionId to regionIds scope"
```

---

### Task 6: Wire Analytics into the scope

**Files:**
- Modify: `db/schema.ts` (add `analyticsEvents.regionId`)
- Create: `db/migrations/00XX_<generated_name>.sql` (via `drizzle-kit generate`)
- Modify: `app/api/track/route.ts`
- Modify: `lib/analytics.ts` (`trackEvent`, `getAnalyticsStats`)
- Modify: `app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `getSelectedAdminScope()`, `regionScopeCondition()` from Task 4; `getCurrentRegion()` (existing, unchanged)
- Produces: `analyticsEvents.regionId` (nullable — see Step 1's comment on historical rows); `trackEvent` now records it; `getAnalyticsStats(window, regionIds: number[] | "all")` — no other task consumes this

- [ ] **Step 1: Add a nullable `regionId` to `analyticsEvents`**

In `db/schema.ts`, in the `analyticsEvents` table definition:

```typescript
export const analyticsEvents = specialsSchema.table("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventLabel: text("event_label"),
  page: text("page").notNull(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  referrer: text("referrer"),
  country: text("country"), // unrelated to the new countries table -- this is the visitor's
                             // IP-derived country from Cloudflare's CF-IPCountry header, kept
                             // as-is; do not confuse with regionId below
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  regionId: integer("region_id").references(() => regions.id), // nullable: rows recorded before
                                                                  // this column existed have no
                                                                  // way to know their region after
                                                                  // the fact, and stay null forever
                                                                  // rather than being backfilled
                                                                  // with a guess
});
```

Run: `npx drizzle-kit generate` then `npx drizzle-kit migrate`.
Expected: migration succeeds (nullable column, no backfill needed, matches the existing `monetizationSettings.regionId` nullable pattern already in this schema for the same "not every row has one" reason).

- [ ] **Step 2: Record the region when a pageview/event is tracked**

`app/api/track/route.ts` currently has no region awareness. Read the file in full (it's a public, unauthenticated POST endpoint, so the region must come from the request itself, the same way every other public route resolves it). Add:

```typescript
import { getCurrentRegion } from "@/lib/regions";

// ... inside POST, after the existing bot/rate-limit/dnt checks, before calling trackEvent:
const region = await getCurrentRegion().catch(() => null); // never let a region-resolution
                                                              // failure break tracking itself --
                                                              // this endpoint always returns 200
                                                              // regardless of outcome by design
                                                              // (see the existing comment above POST)

await trackEvent({
  ...parsed.data,
  regionId: region?.id ?? null,
});
```

- [ ] **Step 3: `trackEvent` accepts and stores `regionId`**

In `lib/analytics.ts`:

```typescript
interface TrackEventParams {
  eventType: string;
  eventLabel?: string | null;
  page: string;
  sessionId: string;
  visitorId: string;
  referrer?: string | null;
  country?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  regionId?: number | null;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  await db.insert(analyticsEvents).values({
    eventType: params.eventType,
    eventLabel: params.eventLabel ?? null,
    page: params.page,
    sessionId: params.sessionId,
    visitorId: params.visitorId,
    referrer: params.referrer ?? null,
    country: params.country ?? null,
    utmSource: params.utmSource ?? null,
    utmMedium: params.utmMedium ?? null,
    utmCampaign: params.utmCampaign ?? null,
    regionId: params.regionId ?? null,
  });
}
```

- [ ] **Step 4: `getAnalyticsStats` takes and applies `regionIds`**

Read the full current implementation of `getAnalyticsStats` in `lib/analytics.ts` (it has several independent queries against `analyticsEvents` — pageviewCount, uniqueVisitorCount, sessionCount, sessionPageviewCounts for bounce rate, topPages, and likely more below what this plan's research covered). Add `regionIds: number[] | "all"` as a parameter and add `regionScopeCondition(analyticsEvents.regionId, regionIds)` to every one of those queries' `and(...)` where-clauses — the same mechanical change as Task 5, just applied to a different file's several queries instead of several files' one query each.

```typescript
import { regionScopeCondition } from "@/lib/admin-region";

export async function getAnalyticsStats(
  window: AnalyticsWindow,
  regionIds: number[] | "all"
): Promise<AnalyticsStats> {
  const prevWindow = buildPreviousWindow(window);
  const inWindow = and(
    gte(analyticsEvents.createdAt, window.from),
    lt(analyticsEvents.createdAt, window.to),
    regionScopeCondition(analyticsEvents.regionId, regionIds)
  );
  const inPrevWindow = and(
    gte(analyticsEvents.createdAt, prevWindow.from),
    lt(analyticsEvents.createdAt, prevWindow.to),
    regionScopeCondition(analyticsEvents.regionId, regionIds)
  );
  // Every other query in this function that currently does
  // .where(and(inWindow, isPageview)) or similar needs regionScopeCondition
  // added the same way where it doesn't already derive from inWindow/inPrevWindow
  // (any query built from `and(inWindow, ...)` already inherits the filter
  // automatically since inWindow now carries it -- only queries NOT built from
  // inWindow/inPrevWindow need their own explicit regionScopeCondition(...) added).
  // ... rest of function body, otherwise unchanged
}
```

**Accepted limitation, not a bug to fix here:** historical analytics rows recorded before this column existed have `regionId: null` and are invisible under any specific country/province/region filter (only visible under `"all"`). This is inherent to analytics data (there's no reliable way to know a historical pageview's region after the fact) and is the same class of limitation the spec already accepted for `mailingAddress`/`currency` defaults — flagged here so it isn't mistaken for a bug during review.

- [ ] **Step 5: Wire `app/admin/analytics/page.tsx`**

Read the file in full, then add `import { getSelectedAdminScope } from "@/lib/admin-region";` and thread `regionIds` from `getSelectedAdminScope()` into every `getAnalyticsStats(...)` call site in the file (there may be more than one, for different time windows — thread it into all of them).

- [ ] **Step 6: Typecheck and manually verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, visit the public site a few times to generate fresh (region-tagged) pageview events, then check `/admin/analytics` under different scope selections.
Expected: numbers change when narrowing to a single region vs. "all"; a country/province-level selection combines every region under it.

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts db/migrations/ app/api/track/route.ts lib/analytics.ts app/admin/analytics/page.tsx
git commit -m "Add region scoping to analytics tracking and admin stats"
```

---

### Task 7: Wire Inbox into the scope

**Files:**
- Modify: `lib/inbox-data.ts` (`getInboxThreads`, `getThreadMessages`)
- Modify: `app/admin/inbox/page.tsx`
- Modify: `app/admin/inbox/t/[key]/page.tsx` (verify whether it needs scope awareness — a single thread is opened by its own key, not filtered by scope, so this file likely needs no change; confirm by reading it before editing)

**Interfaces:**
- Consumes: `getSelectedAdminScope()`, `regionScopeCondition()` from Task 4
- Produces: `getInboxThreads(regionIds: number[] | "all"): Promise<InboxThread[]>` — no other task consumes this

**Design decision this task implements (per the spec's own flagged recommendation):** a thread with no matched venue (`venueId: null` — an unmatched sender) has no region to belong to at all. It shows only when `regionIds === "all"`; under any specific country/province/region scope, unmatched-sender threads are excluded rather than guessed into a region they don't belong to.

- [ ] **Step 1: Add `regionIds` filtering to `getInboxThreads`**

Read the full current implementation of `getInboxThreads` in `lib/inbox-data.ts` (already read in full during this plan's research — reproduced below with the change applied; re-read the live file first in case anything changed since).

```typescript
import { regionScopeCondition } from "@/lib/admin-region";
import { inArray } from "drizzle-orm";

export async function getInboxThreads(regionIds: number[] | "all"): Promise<InboxThread[]> {
  const [inbound, sends] = await Promise.all([
    db
      .select({
        venueId: inboundEmails.venueId,
        venueRegionId: venues.regionId,
        venueName: venues.name,
        fromEmail: inboundEmails.fromEmail,
        fromName: inboundEmails.fromName,
        subject: inboundEmails.subject,
        textBody: inboundEmails.textBody,
        htmlBody: inboundEmails.htmlBody,
        read: inboundEmails.read,
        archivedAt: inboundEmails.archivedAt,
        receivedAt: inboundEmails.receivedAt,
      })
      .from(inboundEmails)
      .leftJoin(venues, eq(inboundEmails.venueId, venues.id)),
    db
      .select({
        venueId: outreachSends.venueId,
        venueRegionId: venues.regionId,
        venueName: venues.name,
        toEmail: outreachSends.toEmail,
        subject: outreachSends.subject,
        htmlBody: outreachSends.htmlBody,
        createdAt: outreachSends.createdAt,
      })
      .from(outreachSends)
      .leftJoin(venues, eq(outreachSends.venueId, venues.id))
      .where(eq(outreachSends.hiddenFromInbox, false)),
  ]);

  // Filter here (in JS, after the query) rather than in SQL, since the
  // exclude-unmatched-when-scoped rule ("venueRegionId is null -> only visible
  // under 'all'") doesn't map cleanly onto a single WHERE clause shared between
  // the inbound and sends queries above without duplicating this same
  // conditional in both .where() calls.
  const scopedInbound =
    regionIds === "all" ? inbound : inbound.filter((e) => e.venueRegionId !== null && regionIds.includes(e.venueRegionId));
  const scopedSends =
    regionIds === "all" ? sends : sends.filter((s) => s.venueRegionId !== null && regionIds.includes(s.venueRegionId));

  // ... rest of the function's existing thread-building logic, unchanged, but
  // reading from scopedInbound/scopedSends instead of inbound/sends
}
```

- [ ] **Step 2: Wire `app/admin/inbox/page.tsx`**

Read the file in full, then add `import { getSelectedAdminScope } from "@/lib/admin-region";` and:

```typescript
const { regionIds } = await getSelectedAdminScope();
const threads = await getInboxThreads(regionIds);
```

- [ ] **Step 3: Confirm whether the single-thread page needs a change**

Read `app/admin/inbox/t/[key]/page.tsx` in full. A single thread is opened by its own key (venue id or sender email), not by scope — it most likely needs no change at all. If it currently calls `getInboxThreads()` internally for any reason (rather than a more targeted `getThreadMessages(key)`-style lookup), confirm that call site too and update it the same way as Step 2 if so.

- [ ] **Step 4: Typecheck and manually verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, log in, visit `/admin/inbox` under different scope selections.
Expected: threads for venues outside the selected scope disappear; an unmatched-sender thread (if any exist) is visible only under "All countries".

- [ ] **Step 5: Commit**

```bash
git add lib/inbox-data.ts app/admin/inbox/page.tsx
git commit -m "Add region scoping to admin inbox"
```

---

## Final verification (after all tasks)

- [ ] Run `npm test` and `npx tsc --noEmit` — both clean.
- [ ] Run `npm run build` — confirms no route-level regressions across every page touched.
- [ ] Manually re-verify the prior session's cross-region fix still holds: `curl -H "Host: kelownafooddeals.shop"` and `curl -H "Host: pentictonfooddeals.shop"` against a local dev server still show only each region's own venues — this plan must not reintroduce that bug while adding a level above it.
- [ ] Confirm every item in the spec's "Out of scope" section was in fact left untouched: no currency/i18n behavior added, no wildcard-subdomain code, no actual new country/province/region inserted beyond the Canada/BC seed from Task 1, no per-user roles.
