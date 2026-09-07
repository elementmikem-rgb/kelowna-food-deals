# Multi-Region Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-tenant Kelowna Food Deals app into a shared platform where each domain (each "region") gets its own brand name, logo, colors, mailing address, and venue data, all served from one deployment, one database, one admin login.

**Architecture:** A new `regions` table becomes the source of truth for every tenant-specific value. `proxy.ts` (this project's Next.js middleware-equivalent, already Edge-runtime) detects the region from the request's `Host` header on every request and passes it downstream via a request header; `lib/regions.ts` reads that header (cached in memory) to give every Server Component, API route, and cron job a `getCurrentRegion()`/`getRegionById()` primitive. Existing `venues`/`specials`/`events` rows gain a `regionId` foreign key replacing their current free-text `region` column.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts` middleware convention), Drizzle ORM + Postgres, Tailwind v4 CSS custom properties for theming.

**Spec:** `docs/superpowers/specs/2026-09-07-multi-region-platform-design.md`

## Global Constraints

- Kelowna's existing domain (`kelownafooddeals.shop`), brand name ("Kelowna Food Deals"), and all existing data must survive migration unchanged from a visitor's perspective.
- One shared Stripe account, one shared `ADMIN_PASSWORD`, one shared Brevo API key across all regions (per the spec's Global Constraints) — only the *sender identity/mailing address* varies per region, not the underlying accounts.
- `bookings`, `analytics_events`, `submissions`, `outreach_sends`, `inbound_emails`, `category_sponsors`, `venue_photos`, `scrape_runs` do **not** get their own `regionId` column — they reach a region through the `venueId` they already carry (spec Section 5).
- Every region needs a `mailingAddress` before any outreach email can legally be sent from it (CASL).

---

### Task 1: Add the `regions` table and `regionId` columns to the schema

**Files:**
- Modify: `db/schema.ts`
- Create (generated): a new file under `db/migrations/` via `npx drizzle-kit generate`

**Interfaces:**
- Produces: `regions` table (Drizzle export `regions`), columns `id, slug, domain, brandName, logoUrl, accentColor, accentDimColor, accentSoftColor, backgroundColor, foregroundColor, evergreenColor, mailingAddress, contactEmail, tokenCeiling, active, createdAt`.
- Produces: `venues.regionId`, `specials.regionId`, `events.regionId` (all `integer references regions.id`, nullable until Task 2 backfills them, then tightened to `.notNull()` in that same task's migration).
- Produces: `monetizationSettings.regionId` (nullable integer, references `regions.id`) — null means "applies to every region," per spec Section 1's YAGNI note on pricing.

- [ ] **Step 1: Add the `regions` table to the schema**

Add this near the top of `db/schema.ts`, after the existing `DEFAULT_REGION` constant (it will be deleted in Task 2, but leave it for now so nothing else breaks mid-task):

```typescript
export const regions = specialsSchema.table("regions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // "kelowna", "south-okanagan"
  domain: text("domain").notNull().unique(), // "kelownafooddeals.shop"
  brandName: text("brand_name").notNull(), // "Kelowna Food Deals"
  logoUrl: text("logo_url").notNull(),
  accentColor: text("accent_color").notNull(),
  accentDimColor: text("accent_dim_color").notNull(),
  accentSoftColor: text("accent_soft_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  foregroundColor: text("foreground_color").notNull(),
  evergreenColor: text("evergreen_color").notNull(),
  // CASL requires a valid mailing address in every commercial email sent from
  // this region -- see lib/outreach-email.ts and the OUTREACH_MAILING_ADDRESS
  // history this replaces.
  mailingAddress: text("mailing_address").notNull(),
  contactEmail: text("contact_email").notNull(),
  // This region's own nightly scrape budget, separate from every other
  // region's so a busy region can never starve a smaller one's share.
  tokenCeiling: integer("token_ceiling").notNull().default(50000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Region = typeof regions.$inferSelect;
```

- [ ] **Step 2: Add `regionId` to `venues`, `specials`, `events`, and `monetizationSettings`**

In `venues` (near its existing `region: text("region")...` line): add `regionId: integer("region_id").references(() => regions.id)` (nullable for now).

Do the same in `specials` and `events` next to their existing `region` text columns.

In `monetizationSettings`, add `regionId: integer("region_id").references(() => regions.id)` (stays nullable permanently — see Global Constraints).

- [ ] **Step 3: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: a new SQL file appears under `db/migrations/` creating the `regions` table and adding the four nullable `region_id` columns. Read the generated SQL to confirm it does not touch or drop the existing `region` text columns yet (that's Task 2).

- [ ] **Step 4: Apply the migration to production**

Run: `npx drizzle-kit migrate` (with `DATABASE_URL` set to the production connection string, same as every prior migration this project has applied directly)
Expected: no errors; `select * from specials.regions limit 1;` returns zero rows (table exists, empty).

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "Add regions table and nullable regionId columns"
```

---

### Task 2: Seed the Kelowna region and backfill existing data

**Files:**
- Create: `scripts/tmp-seed-kelowna-region.mjs` (one-off, deleted after running per this project's established throwaway-script convention)
- Modify: `db/schema.ts` (tighten columns, remove `DEFAULT_REGION`)
- Create (generated): a second migration file

**Interfaces:**
- Consumes: `regions`, `venues.regionId`, `specials.regionId`, `events.regionId` from Task 1.
- Produces: exactly one `regions` row (slug `"kelowna"`) that every existing `venues`/`specials`/`events` row's `regionId` points to; `regionId` becomes `.notNull()` on all three tables; the old `region` text column and `DEFAULT_REGION` constant are gone.

- [ ] **Step 1: Write and run the seed + backfill script**

This must use the **real current values** already live in production, not placeholders -- the whole point is that Kelowna's site doesn't change from a visitor's perspective.

```javascript
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL);

const [region] = await sql`
  insert into specials.regions
    (slug, domain, brand_name, logo_url, accent_color, accent_dim_color,
     accent_soft_color, background_color, foreground_color, evergreen_color,
     mailing_address, contact_email, token_ceiling)
  values (
    'kelowna',
    'kelownafooddeals.shop',
    'Kelowna Food Deals',
    'https://kelownafooddeals.shop/icons/icon-192.png',
    '#c14a1f', '#8f3315', '#f0c68a', '#f4ecd8', '#2a2818', '#33502c',
    '1356 Water Street, Kelowna, BC',
    'element.mikem@gmail.com',
    50000
  )
  returning id
`;
console.log("Created region id:", region.id);

const results = await Promise.all([
  sql`update specials.venues set region_id = ${region.id} where region_id is null`,
  sql`update specials.specials set region_id = ${region.id} where region_id is null`,
  sql`update specials.events set region_id = ${region.id} where region_id is null`,
]);
console.log("Backfilled rows:", results.map((r) => r.count));

await sql.end();
```

Run: `node scripts/tmp-seed-kelowna-region.mjs` (with production `DATABASE_URL` sourced from `.env.local`, same as every other one-off script this session has run)
Expected: prints the new region id and non-zero backfilled row counts for `venues`/`specials`/`events` matching their current total row counts.

- [ ] **Step 2: Verify every row backfilled**

Run this check inline (same script pattern, or a fresh one-off): `select count(*) from specials.venues where region_id is null;` -- expect `0`. Repeat for `specials.specials` and `specials.events`.

- [ ] **Step 3: Delete the seed script**

```bash
rm scripts/tmp-seed-kelowna-region.mjs
```

- [ ] **Step 4: Tighten the schema and drop the old columns**

In `db/schema.ts`:
- Change `regionId` on `venues`, `specials`, `events` from nullable to `.notNull()`.
- Delete the old `region: text("region").notNull().default(DEFAULT_REGION)` line from all three tables.
- Delete the `export const DEFAULT_REGION = "central-okanagan";` line and its comment.

- [ ] **Step 5: Generate and apply the migration**

Run: `npx drizzle-kit generate`
Expected: a migration dropping the three `region` text columns and adding a `not null` constraint to the three `region_id` columns.

Run: `npx drizzle-kit migrate`
Expected: no errors (every row already has a non-null `region_id` from Step 1, so the `not null` constraint applies cleanly).

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: fails at every remaining reference to the deleted `DEFAULT_REGION` export or the old `region` column -- this is expected and is exactly the list of call sites Tasks 3-8 fix. Do not fix them in this task; just confirm the compiler found them (there should be no *other*, unrelated type errors).

```bash
git add db/schema.ts db/migrations/
git commit -m "Backfill Kelowna region data and drop the old free-text region column"
```

---

### Task 3: Region config loader (`lib/regions.ts`)

**Files:**
- Create: `lib/regions.ts`
- Test: `lib/regions.test.ts` (if this project has no existing test runner configured, add a plain Node assertion script instead -- check `package.json` `scripts` for an existing `test` command first; this codebase has favored one-off verification scripts over a formal test suite throughout, so a `scripts/tmp-test-regions.mjs` run-and-delete script is consistent with established practice if no runner exists)

**Interfaces:**
- Consumes: `regions` table from Task 1/2 (`db, regions` from `@/db`).
- Produces: `getRegionByDomain(domain: string): Promise<Region | null>`, `getRegionById(id: number): Promise<Region | null>`, both exported from `lib/regions.ts`, both with a shared in-memory TTL cache so a normal request doesn't hit Postgres for region config on every single page load.

- [ ] **Step 1: Write the region loader with caching**

```typescript
import { db, regions } from "@/db";
import { eq } from "drizzle-orm";
import type { Region } from "@/db/schema";

// Region config changes rarely (a human edits it, not a request), so a short
// in-memory cache avoids a Postgres round trip on every single page render
// without risking a stale region surviving more than a minute after an edit.
const CACHE_TTL_MS = 60_000;
const byDomain = new Map<string, { region: Region | null; expiresAt: number }>();
const byId = new Map<number, { region: Region | null; expiresAt: number }>();

export async function getRegionByDomain(domain: string): Promise<Region | null> {
  const cached = byDomain.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.domain, domain)).limit(1);
  const region = row ?? null;
  byDomain.set(domain, { region, expiresAt: Date.now() + CACHE_TTL_MS });
  return region;
}

export async function getRegionById(id: number): Promise<Region | null> {
  const cached = byId.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
  const region = row ?? null;
  byId.set(id, { region, expiresAt: Date.now() + CACHE_TTL_MS });
  return region;
}
```

- [ ] **Step 2: Write a throwaway verification script**

```javascript
import "dotenv/config";
const { getRegionByDomain } = await import("./lib/regions.ts");
const region = await getRegionByDomain("kelownafooddeals.shop");
if (!region || region.slug !== "kelowna") {
  throw new Error(`Expected kelowna region, got ${JSON.stringify(region)}`);
}
console.log("PASS: getRegionByDomain resolves kelownafooddeals.shop -> kelowna");
```

Run: `npx tsx scripts/tmp-test-regions.mjs`
Expected: `PASS: getRegionByDomain resolves kelownafooddeals.shop -> kelowna`

- [ ] **Step 3: Delete the verification script and commit**

```bash
rm scripts/tmp-test-regions.mjs
git add lib/regions.ts
git commit -m "Add region config loader with in-memory caching"
```

---

### Task 4: Region detection in `proxy.ts`

**Files:**
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: `getRegionByDomain` from Task 3.
- Produces: every request downstream carries an `x-region-id` request header set to the resolved region's numeric id (as a string), readable via `headers()` in any Server Component or Route Handler.

- [ ] **Step 1: Broaden the matcher and inject the region header**

Replace the full contents of `proxy.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getRegionByDomain } from "@/lib/regions";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  // Strip a port (local dev / preview URLs) so lookup matches the bare domain
  // stored in regions.domain.
  const domain = host.split(":")[0];

  const region = await getRegionByDomain(domain);

  const requestHeaders = new Headers(req.headers);
  if (region) requestHeaders.set("x-region-id", String(region.id));

  // Everything below this line is the pre-existing admin-auth gate, unchanged
  // in behavior -- it only now runs on a request that also carries the
  // region header for downstream pages to read.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (pathname === "/admin/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (await isAdminAuthed(req)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Runs on every request except static assets and Next's internal image
  // optimizer route, so region detection covers pages, API routes, and the
  // sitemap/robots handlers alike -- not just /admin like before.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Verify locally**

Run: `npm run dev` (background), then `curl -sD - -o /dev/null http://localhost:3000/ -H "Host: kelownafooddeals.shop"`
Expected: a `200` response (the header injection itself isn't directly visible via curl since it's an internal request header, not a response header -- Task 5 is the first consumer that proves this works end to end).

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "Detect region from Host header in proxy.ts for every request"
```

---

### Task 5: `getCurrentRegion()` and dynamic theming/metadata in the root layout

**Files:**
- Modify: `lib/regions.ts` (add the request-scoped helper)
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `getRegionById` from Task 3, the `x-region-id` header from Task 4.
- Produces: `getCurrentRegion(): Promise<Region>` (throws if no region resolved -- every real request through `proxy.ts` always has one, so a missing header means the app is broken, not that this should silently fall back). Every subsequent task that needs brand name, colors, domain, mailing address, or contact email calls this instead of a hardcoded constant.

- [ ] **Step 1: Add `getCurrentRegion()` to `lib/regions.ts`**

```typescript
import { headers } from "next/headers";

export async function getCurrentRegion(): Promise<Region> {
  const regionId = (await headers()).get("x-region-id");
  if (!regionId) {
    throw new Error("No x-region-id header -- proxy.ts should set this on every request");
  }
  const region = await getRegionById(Number(regionId));
  if (!region) {
    throw new Error(`x-region-id header points at a region id (${regionId}) with no matching row`);
  }
  return region;
}
```

- [ ] **Step 2: Convert `app/layout.tsx`'s static metadata to `generateMetadata()`**

Replace lines 24-71 of `app/layout.tsx` (the `SITE_URL`/`SITE_TITLE`/`SITE_DESCRIPTION` constants and the static `export const metadata`) with:

```typescript
import { getCurrentRegion } from "@/lib/regions";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const siteUrl = `https://${region.domain}`;
  const title = `${region.brandName} — Food & Drink Deals Today`;
  const description = `Food and drink specials actually running today in ${region.brandName.replace(" Food Deals", "")} — happy hours and deals, checked daily, not scraped.`;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s — ${region.brandName}` },
    description,
    applicationName: region.brandName,
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "default", title: region.brandName },
    openGraph: { type: "website", locale: "en_CA", url: siteUrl, siteName: region.brandName, title, description },
    twitter: { card: "summary", title, description },
    alternates: { canonical: siteUrl },
  };
}
```

(The `keywords` array from the old static metadata was Kelowna-specific SEO copy -- leave it out of the shared implementation; each region gets its own keyword list as a follow-up once it actually launches, per the spec's Section 6 playbook. This is a deliberate scope cut, not an oversight.)

- [ ] **Step 3: Inject per-region theming and make the root layout async**

Replace the `RootLayout` function body in `app/layout.tsx`:

```typescript
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const region = await getCurrentRegion();
  const themeStyle = `:root { --accent: ${region.accentColor}; --accent-dim: ${region.accentDimColor}; --accent-soft: ${region.accentSoftColor}; --background: ${region.backgroundColor}; --foreground: ${region.foregroundColor}; --evergreen: ${region.evergreenColor}; }`;

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger -- static string built entirely
            from our own regions table, never from request-supplied input */}
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-accent focus:text-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <main id="main-content" className="flex flex-col flex-1">
          {children}
        </main>
        <AnalyticsTracker />
        <Script src="/js/track.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify Kelowna's own theme survives unchanged**

Run: `npm run build && npm run dev`, then open `http://localhost:3000/` in a browser (or `curl -s http://localhost:3000/ | grep -o ':root[^}]*}'`)
Expected: the injected `<style>` block's hex values exactly match Kelowna's original hardcoded CSS (`#c14a1f`, `#8f3315`, `#f0c68a`, `#f4ecd8`, `#2a2818`, `#33502c`) -- confirming Task 2's seed values were copied correctly.

- [ ] **Step 5: Commit**

```bash
git add lib/regions.ts app/layout.tsx
git commit -m "Serve per-region theming and metadata from the layout"
```

---

### Task 6: `SiteHeader` uses region brand/logo

**Files:**
- Modify: `components/SiteHeader.tsx:1-60` (the `Image` and brand-name block identified in this session's earlier work adding the homepage link)

**Interfaces:**
- Consumes: `getCurrentRegion()` from Task 5.

- [ ] **Step 1: Make `SiteHeader` async and read the region**

`SiteHeader` is currently a synchronous function component. Add `async` to its signature and, as its first line, `const region = await getCurrentRegion();`. Replace:
- The hardcoded `src="/icons/icon-192.png"` on the `Image` with `src={region.logoUrl}`.
- The hardcoded `alt="Kelowna Food Deals logo"` with `` alt={`${region.brandName} logo`} ``.
- The default brand markup (`<span className="hand-underline">Kelowna</span> Food Deals`) with `region.brandName` split on the first space so the existing hand-underline styling still applies to the first word: `` const [firstWord, ...rest] = region.brandName.split(" "); `` then render `<span className="hand-underline">{firstWord}</span> {rest.join(" ")}`.

- [ ] **Step 2: Verify Kelowna renders identically**

Run: `npm run dev`, open the homepage.
Expected: logo and "Kelowna Food Deals" wordmark render exactly as before (same image, same hand-underline on "Kelowna").

- [ ] **Step 3: Commit**

```bash
git add components/SiteHeader.tsx
git commit -m "Read brand name and logo from the current region in SiteHeader"
```

---

### Task 7: Region-aware sitemap and robots.txt

**Files:**
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`

**Interfaces:**
- Consumes: `getCurrentRegion()` from Task 5.
- Consumes: `venues.regionId`, `specials.regionId` -- the sitemap's venue/blog listing must filter to the current region's own venues, not every venue in the database.

- [ ] **Step 1: Scope `app/sitemap.ts` to the current region**

Replace the hardcoded `const BASE_URL = "https://kelownafooddeals.shop";` with, inside the `sitemap()` function: `const region = await getCurrentRegion(); const BASE_URL = `https://${region.domain}`;`.

Add `eq(venues.regionId, region.id)` to the existing `activeVenues` query's `where` clause (currently just `eq(venues.active, true)` -- combine with `and(...)`).

- [ ] **Step 2: Point `robots.ts` at the current region's sitemap**

```typescript
import type { MetadataRoute } from "next";
import { getCurrentRegion } from "@/lib/regions";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const region = await getCurrentRegion();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${region.domain}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Verify**

Run: `curl -s http://localhost:3000/sitemap.xml | grep kelownafooddeals.shop | head -3`
Expected: URLs still point at `kelownafooddeals.shop` (the only region that exists yet), confirming the dynamic lookup produces the same result as the old hardcoded value.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "Scope sitemap to the current region's venues and domain"
```

---

### Task 8: Region-aware outreach emails, checkout URLs, and unsubscribe links

**Files:**
- Modify: `lib/unsubscribe.ts`
- Modify: `app/api/admin/outreach/send/route.ts`
- Modify: `app/api/bookings/checkout/route.ts:11` (the `SITE_URL` constant)
- Modify: `app/api/bookings/confirm-email/route.ts:4` (the `SITE_URL` constant)
- Modify: `app/api/bookings/verify-email/route.ts:11` (the `SITE_URL` constant)
- Modify: `app/api/tip/checkout/route.ts:15` (the `SITE_URL` constant)

**Interfaces:**
- Consumes: a venue's `regionId` -> `getRegionById()` from Task 3, to look up that venue's own region rather than the requesting browser's (an outreach email send is triggered from the admin UI, which could itself be viewed on any region's domain, but the email must reference the *venue's* region, not the admin's current page).

- [ ] **Step 1: `buildUnsubscribeUrl` takes a domain instead of hardcoding one**

```typescript
export function buildUnsubscribeUrl(venueId: number, domain: string): string {
  const token = buildUnsubscribeToken(venueId);
  return `https://${domain}/api/unsubscribe?venueId=${venueId}&token=${token}`;
}
```

- [ ] **Step 2: Update the outreach send route to look up the venue's region**

In `app/api/admin/outreach/send/route.ts`, the existing query already selects `venue.id, venue.name, venue.contactEmail, venue.unsubscribedAt` -- add `venue.regionId` to that same select. After loading the venue, add:

```typescript
const region = await getRegionById(venue.regionId);
if (!region) {
  return NextResponse.json({ error: "venue has no valid region" }, { status: 500 });
}
```

Replace the existing `const mailingAddress = process.env.OUTREACH_MAILING_ADDRESS;` fail-closed check with `const mailingAddress = region.mailingAddress;` (a `regions.mailingAddress` is `.notNull()` in the schema, so the fail-closed check becomes unnecessary -- the database itself now enforces every region has one before it can exist).

Update the `buildOutreachHtml` call site to pass `region.domain` for the venue URL and advertise URL (replacing the hardcoded `https://kelownafooddeals.shop` inside that function), and pass `buildUnsubscribeUrl(venue.id, region.domain)` instead of the old single-argument call.

- [ ] **Step 3: Update booking and tip checkout success/cancel URLs**

In `app/api/bookings/checkout/route.ts`, replace the top-level `const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";` with a call to `getCurrentRegion()` inside the `POST` handler (a booking checkout is a same-domain request, so the *requesting* region is correct here, unlike outreach): `const region = await getCurrentRegion(); const SITE_URL = `https://${region.domain}`;`. Use this for the existing `success_url`/`cancel_url` fields.

Do the identical replacement in `app/api/bookings/confirm-email/route.ts` and `app/api/bookings/verify-email/route.ts` (both currently have the exact same `SITE_URL` constant pattern, used to build the confirmation-link and verification-link URLs emailed to the buyer), and in `app/api/tip/checkout/route.ts`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors referencing `OUTREACH_MAILING_ADDRESS`, `DEFAULT_REGION`, or a single-argument `buildUnsubscribeUrl` call remain. Any other pre-existing hardcoded `kelownafooddeals.shop` reference not touched by this task (e.g. blog post copy, the privacy page's own prose) is out of scope for this plan -- flag it if found, but do not fix it here; per the spec, that's fixed when a second region's launch actually needs it to read differently.

- [ ] **Step 5: Commit**

```bash
git add lib/unsubscribe.ts app/api/admin/outreach/send/route.ts app/api/bookings/checkout/route.ts app/api/bookings/confirm-email/route.ts app/api/bookings/verify-email/route.ts app/api/tip/checkout/route.ts
git commit -m "Make outreach emails and checkout URLs region-aware"
```

---

### Task 9: Admin region switcher

**Files:**
- Create: `lib/admin-region.ts`
- Create: `app/api/admin/region/route.ts`
- Modify: `components/AdminNav.tsx`
- Modify: `components/AdminShell.tsx`
- Modify: `app/admin/revenue/page.tsx` (add the "All regions" option)

**Interfaces:**
- Produces: `getSelectedAdminRegionId(): Promise<number | "all">` (reads a plain cookie, defaults to the current request's own region via `getCurrentRegion()` if unset).
- Consumes: `getCurrentRegion()`, `getRegionById()` from Tasks 3/5.

- [ ] **Step 1: Add the selected-region cookie helper**

```typescript
// lib/admin-region.ts
import { cookies } from "next/headers";
import { getCurrentRegion } from "./regions";

export const ADMIN_REGION_COOKIE = "kds_admin_region";

export async function getSelectedAdminRegionId(): Promise<number | "all"> {
  const raw = (await cookies()).get(ADMIN_REGION_COOKIE)?.value;
  if (raw === "all") return "all";
  if (raw && !Number.isNaN(Number(raw))) return Number(raw);
  const current = await getCurrentRegion();
  return current.id;
}
```

- [ ] **Step 2: Add the route that sets the cookie**

```typescript
// app/api/admin/region/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ADMIN_REGION_COOKIE } from "@/lib/admin-region";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { regionId } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_REGION_COOKIE, String(regionId), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

- [ ] **Step 3: Add the switcher to `AdminNav`**

`AdminNav` currently receives `active`, `pendingSubmissions`, `unreadInbox` as props from `AdminShell`. Add a new prop `regions: { id: number; slug: string; brandName: string }[]` and `selectedRegionId: number | "all"`, both fetched in `AdminShell` (via `db.select().from(regions)` and `getSelectedAdminRegionId()`) and passed through. Render a `<select>` next to the existing nav pills listing every region plus an `"All regions"` option, `onChange` POSTing to `/api/admin/region` and calling `router.refresh()`.

- [ ] **Step 4: Scope existing admin pages by the selected region**

Every admin page that queries `venues`/`specials`/`events`/`bookings` (Submissions, Outreach, Sponsored, Revenue) adds a `regionId` filter derived from `getSelectedAdminRegionId()`: when it's a number, filter to `venues.regionId = that id` (joining through `venues` for tables like `bookings` that don't carry `regionId` directly, per the Global Constraints); when it's `"all"`, skip the filter entirely.

- [ ] **Step 5: Add the "All regions" revenue view**

In `app/admin/revenue/page.tsx`, when `getSelectedAdminRegionId()` returns `"all"`, `getRevenueInRange` (from `lib/revenue-data.ts`) runs without any region filter, summing every region's tips and bookings together -- this is the one place the spec calls for a genuinely combined cross-region total rather than per-region scoping.

- [ ] **Step 6: Verify**

Run: `npm run dev`, log into `/admin`, confirm the region dropdown shows "Kelowna Food Deals" (the only region) and "All regions," and switching between them doesn't error (there's nothing to actually differ yet with one region -- this proves the plumbing works, not that filtering is visibly different).

- [ ] **Step 7: Commit**

```bash
git add lib/admin-region.ts app/api/admin/region/route.ts components/AdminNav.tsx components/AdminShell.tsx app/admin/revenue/page.tsx
git commit -m "Add admin region switcher and All-regions revenue view"
```

---

### Task 10: Per-region cron token budgets

**Files:**
- Modify: `cron/index.ts`
- Modify: `cron/upsert.ts` (the `getActiveVenues` function)

**Interfaces:**
- Consumes: `regions` table (all active rows), each carrying its own `tokenCeiling`.
- Produces: `getActiveVenues(regionId: number)` (was previously no-argument, returning every active venue globally) -- every caller updates accordingly.

- [ ] **Step 1: Scope `getActiveVenues` to one region**

In `cron/upsert.ts`, add `regionId: number` as `getActiveVenues`'s first parameter, and add `eq(venues.regionId, regionId)` to its existing `where(eq(venues.active, true))` clause (combine with `and(...)`).

- [ ] **Step 2: Loop `runScrapeCycle` over every active region**

Replace the body of `runScrapeCycle` in `cron/index.ts` (currently: fetch one global venue list, scrape against one shared `TOKEN_CEILING` module constant) with a loop over `db.select().from(regions).where(eq(regions.active, true))`, running the existing per-venue scrape logic once per region against that region's own `tokenCeiling` value instead of the shared `TOKEN_CEILING` constant. The existing `CRON_TOKEN_CEILING` env var override still applies, but now as a *global cap* on top of each region's own configured ceiling (`Math.min(region.tokenCeiling, envOverride ?? Infinity)`) rather than the only budget that exists -- this preserves the ability to manually throttle an entire run without losing the per-region fairness the spec calls for.

The Castanet scrape, analytics pruning, monthly-special archival, and booking sync steps (currently run once per `runScrapeCycle` call) move to run once total, after the per-region loop finishes -- per spec Section 4, none of them are region-scoped work.

- [ ] **Step 3: Verify with the one existing region**

Run: `npx tsx cron/index.ts` (same invocation the scheduled job already uses) against production data.
Expected: log output shows `"Starting scrape run for N active venue(s) in region kelowna"` (or equivalent), a token ceiling of `50000` (Kelowna's seeded value from Task 2) enforced exactly as before, and the run completing all four post-scrape steps exactly once, not once per region.

- [ ] **Step 4: Commit**

```bash
git add cron/index.ts cron/upsert.ts
git commit -m "Run the nightly scrape once per active region with its own token budget"
```
