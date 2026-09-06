# Monetization Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a venue owner self-serve purchase Featured Placement, Seasonal Boost, or Category
Sponsorship via Stripe Checkout on the public site, with admin approval still required before
anything goes live, and date-range conflict checking so capped placements can never be oversold.

**Architecture:** A new `bookings` table is the single source of truth for every self-serve
purchase (pending, approved, rejected). A new `monetization_settings` table holds admin-editable
caps/pricing. The existing "what's live right now" columns (`venues.featuredUntil`,
`specials.boostedUntil`, `categorySponsors`) are untouched and stay the only thing any existing
render code reads — an `activateBooking()` helper (used both at admin-approval time and by a daily
sync job) is the only thing that ever writes to them going forward, alongside the existing manual
admin panels. Buyer flow: pick venue/product/dates on `/advertise` → live courtesy availability
check → email magic-link verification → authoritative re-check + Stripe Checkout inside one DB
transaction with a Postgres advisory lock (prevents two buyers grabbing the same last slot) →
Stripe webhook flips the booking to pending admin approval → admin approves (activates
immediately or on its future start date) or rejects (flags for a manual refund).

**Tech Stack:** Next.js App Router route handlers, Drizzle ORM / Postgres, Stripe Checkout +
webhooks, Brevo transactional email (existing `sendOutreachEmail`/`sendReportEmail`), Web Crypto
HMAC-signed tokens (mirrors the existing pattern in `lib/admin-auth.ts`), Vitest for the two
pure-logic units that are safety-critical (conflict math, token round-trip) — everything else
follows this project's established pattern of live Playwright verification against the real
deployment rather than integration tests, since there is no test framework in this repo today.

**Spec:** `docs/superpowers/specs/2026-09-06-monetization-automation-design.md`

## Global Constraints

- Verified Partner is **out of scope** — stays admin-only, not part of this system.
- No dollar amount or cap number here is a real business decision — `monetization_settings` is
  seeded with obviously-fake placeholder values (`$1.00/day`, caps from the spec) and the operator
  sets real numbers before this goes live. Never hardcode a "real" price.
- Refunds are **manual** — rejecting a booking only flags `refundNeeded`; nothing calls Stripe's
  refund API anywhere in this plan.
- Every admin mutation that changes what a visitor sees on an ISR page must call `revalidatePath`
  (a real bug found and fixed in the previous phase of this project — see
  `project_kelowna_specials_ui_audit.md` in the operator's memory) — apply this to every new admin
  route in this plan (`/`, `/events`, and `/venues/[id]` where relevant).
- Follow existing patterns exactly: Drizzle query style (`and`/`eq`/`or`/`gt`/`isNull` from
  `drizzle-orm`, not raw SQL except where noted), the `isAdminAuthed(req)` guard on every
  `/api/admin/*` route, Zod validation on every request body, and the existing panel component
  shape (`useRouter().refresh()` after a successful admin mutation).
- All new tables live in the `specials` Postgres schema (`specialsSchema`), matching every existing
  table.
- `npm run typecheck` and `npm run build` must pass after every task before committing.

---

### Task 1: Schema — `bookings` and `monetization_settings` tables

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/0020_<generated_name>.sql` (via `npm run db:generate`, name assigned by drizzle-kit)

**Interfaces:**
- Produces: `bookingProductType` (`["featured", "boost", "category_sponsor"] as const`),
  `BookingProductType` type; `bookingStatus`
  (`["pending_payment", "pending_approval", "approved", "rejected", "expired"] as const`),
  `BookingStatus` type; `bookings` table; `monetizationSettings` table. All re-exported from
  `db/index.ts` automatically via its existing `export * from "./schema"`.

**Note on refining the spec:** the spec's table sketch listed `venueId` as null for
`category_sponsor` bookings. In practice the purchase flow always starts with "pick your venue"
(step 1, even for a category sponsorship — the sponsoring business is a venue in the system), so
`venueId` is set for `featured` and `category_sponsor` alike, and additionally for `boost` (the
venue that owns the boosted special). Only `specialId` is conditional (set for `boost` only) and
only `category` is conditional (set for `category_sponsor` only). This is a refinement, not a
contradiction — the spec never described the venue picker as skipped for category sponsorship.

- [ ] **Step 1: Add the enums and tables to `db/schema.ts`**

Append after the existing `categorySponsors` table definition:

```ts
export const bookingProductType = ["featured", "boost", "category_sponsor"] as const;
export type BookingProductType = (typeof bookingProductType)[number];

export const bookingStatus = [
  "pending_payment",
  "pending_approval",
  "approved",
  "rejected",
  "expired",
] as const;
export type BookingStatus = (typeof bookingStatus)[number];

// A self-serve paid placement, from the moment a buyer starts checkout through admin
// approval. This is the source of truth for scheduling; venues.featuredUntil,
// specials.boostedUntil, and categorySponsors stay the "what's live right now" cache
// that all existing render code already reads -- activateBooking() (lib/bookings-data.ts)
// is the only thing that writes into those from an approved booking.
export const bookings = specialsSchema.table("bookings", {
  id: serial("id").primaryKey(),
  productType: text("product_type").$type<BookingProductType>().notNull(),
  // Set for every product ("featured"/"category_sponsor": the sponsoring venue itself;
  // "boost": the venue that owns specialId).
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  specialId: integer("special_id").references(() => specials.id, { onDelete: "cascade" }), // "boost" only
  category: text("category").$type<SpecialCategory>(), // "category_sponsor" only
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").$type<BookingStatus>().notNull().default("pending_payment"),
  // Only meaningful while status = "pending_payment" -- the checkout hold's expiry.
  // A row past this point simply stops counting toward capacity (see
  // lib/booking-availability.ts); nothing needs to actively clean it up.
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  priceCents: integer("price_cents").notNull(), // snapshot of what was actually charged
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  buyerEmail: text("buyer_email").notNull(),
  buyerVerifiedAt: timestamp("buyer_verified_at", { withTimezone: true }),
  refundNeeded: boolean("refund_needed").notNull().default(false),
  // Set by the Stripe webhook if payment succeeded but the dates now conflict with an
  // approved booking made in the interim -- surfaced for manual admin resolution.
  conflictDetected: boolean("conflict_detected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// Admin-configurable caps/pricing per product. Seeded with placeholder values below --
// the operator sets real numbers before this goes live.
export const monetizationSettings = specialsSchema.table("monetization_settings", {
  productType: text("product_type").$type<BookingProductType>().primaryKey(),
  capCount: integer("cap_count"), // null = uncapped
  priceCentsPerDay: integer("price_cents_per_day").notNull(),
  minDays: integer("min_days").notNull(),
  maxDays: integer("max_days").notNull(),
});
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`

Expected: a new file `db/migrations/00XX_<name>.sql` containing `CREATE TABLE "specials"."bookings" (...)`
and `CREATE TABLE "specials"."monetization_settings" (...)`, plus updated
`db/migrations/meta/_journal.json` and a new `db/migrations/meta/00XX_snapshot.json`.

- [ ] **Step 3: Append placeholder seed rows to the generated migration file**

Open the newly generated `.sql` file and add at the end (obviously-fake placeholder prices —
$1.00/day flat, real numbers are the operator's call before launch):

```sql
INSERT INTO "specials"."monetization_settings" ("product_type", "cap_count", "price_cents_per_day", "min_days", "max_days") VALUES
  ('featured', 4, 100, 1, 60),
  ('boost', NULL, 100, 1, 60),
  ('category_sponsor', 1, 100, 7, 90);
```

- [ ] **Step 4: Run the migration**

Run: `npm run db:migrate`
Expected: no errors; confirm with `npm run db:studio` or a one-off `psql`/script query that both
tables exist and `monetization_settings` has exactly 3 rows.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass (no consumers yet, so nothing should break).

```bash
git add db/schema.ts db/migrations
git commit -m "Add bookings and monetization_settings tables"
```

---

### Task 2: Booking token utility (signed magic-link / selection-carry tokens)

**Files:**
- Create: `lib/booking-token.ts`
- Test: `lib/booking-token.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency + `test` script)

**Interfaces:**
- Produces: `interface BookingSelection { productType: BookingProductType; venueId: number;
  specialId: number | null; category: SpecialCategory | null; startDate: string; endDate: string;
  buyerEmail: string; }`; `signBookingToken<T extends object>(payload: T, ttlMs: number):
  Promise<string>`; `verifyBookingToken<T>(token: string): Promise<(T & { exp: number }) | null>`.
- Consumes: nothing (first new lib file).

This project has no test runner today — Vitest is added here because the two things it verifies
(token forgery resistance, expiry) are exactly the kind of "must not silently break" logic this
project's normal live-Playwright-verification approach can't easily exercise (you can't easily
demonstrate "a tampered token is rejected" by clicking around the live site).

- [ ] **Step 1: Add Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the `test` script**

Modify `package.json`'s `"scripts"` block, adding after `"typecheck"`:

```json
    "test": "vitest run",
```

- [ ] **Step 4: Write the failing test**

Create `lib/booking-token.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signBookingToken, verifyBookingToken } from "./booking-token";

beforeAll(() => {
  process.env.BOOKING_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
});

describe("booking token round trip", () => {
  it("returns the original payload when the token is valid and unexpired", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, 60_000);
    const result = await verifyBookingToken<{ email: string }>(token);
    expect(result?.email).toBe("owner@venue.com");
  });

  it("rejects a token with a tampered signature", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, 60_000);
    const [body] = token.split(".");
    const tampered = `${body}.0000000000000000000000000000000000000000000000000000000000000000`;
    const result = await verifyBookingToken<{ email: string }>(tampered);
    expect(result).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, -1);
    const result = await verifyBookingToken<{ email: string }>(token);
    expect(result).toBeNull();
  });

  it("rejects a malformed token with no signature separator", async () => {
    const result = await verifyBookingToken<{ email: string }>("not-a-real-token");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run lib/booking-token.test.ts`
Expected: FAIL — `Cannot find module './booking-token'`

- [ ] **Step 6: Implement `lib/booking-token.ts`**

```ts
// Signed, tamper-proof tokens carrying a buyer's in-progress booking selection across
// the email-verification round trip (magic link) and into checkout. Deliberately
// separate from lib/admin-auth.ts's HMAC cookie -- different secret, different payload
// shape, and a leaked booking token must never be usable as an admin session. Unlike
// admin-auth.ts (which avoids Node's Buffer because proxy.ts runs on the Edge
// middleware runtime), this file is only ever imported by regular API routes, so
// Buffer is fine here.

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireSecret(): string {
  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) throw new Error("BOOKING_TOKEN_SECRET is not set");
  return secret;
}

export async function signBookingToken<T extends object>(payload: T, ttlMs: number): Promise<string> {
  const secret = requireSecret();
  const body = JSON.stringify({ ...payload, exp: Date.now() + ttlMs });
  const bodyB64 = toBase64Url(body);
  const sig = await hmac(bodyB64, secret);
  return `${bodyB64}.${sig}`;
}

export async function verifyBookingToken<T>(token: string): Promise<(T & { exp: number }) | null> {
  const secret = requireSecret();
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const bodyB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = await hmac(bodyB64, secret);
  if (!timingSafeEqualHex(sig, expectedSig)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(bodyB64)) as T & { exp: number };
    if (typeof parsed.exp !== "number" || Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface BookingSelection {
  productType: import("@/db/schema").BookingProductType;
  venueId: number;
  specialId: number | null;
  category: import("@/db/schema").SpecialCategory | null;
  startDate: string;
  endDate: string;
  buyerEmail: string;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run lib/booking-token.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 8: Set the env var locally and typecheck**

Add `BOOKING_TOKEN_SECRET=<a long random string, e.g. from `openssl rand -hex 32`>` to
`.env.local`. Run `npm run typecheck` — expect it to pass.

- [ ] **Step 9: Commit**

```bash
git add lib/booking-token.ts lib/booking-token.test.ts vitest.config.ts package.json package-lock.json
git commit -m "Add signed booking-token utility with unit tests"
```

---

### Task 3: Availability/conflict-checking logic

**Files:**
- Create: `lib/booking-availability.ts`
- Test: `lib/booking-availability.test.ts`

**Interfaces:**
- Consumes: `bookings`, `db` from `@/db`; `BookingProductType`, `SpecialCategory` from `@/db/schema`.
- Produces: `interface OccupyingRange { startDate: string; endDate: string; }`;
  `rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean`;
  `isRangeAvailable(existing: OccupyingRange[], requestedStart: string, requestedEnd: string,
  capCount: number | null): boolean`; `getOccupyingBookings(executor: typeof db, productType:
  BookingProductType, category: SpecialCategory | null, excludeId?: number):
  Promise<OccupyingRange[]>`; `checkAvailability(executor: typeof db, productType:
  BookingProductType, category: SpecialCategory | null, capCount: number | null, startDate: string,
  endDate: string, excludeId?: number): Promise<boolean>`.

- [ ] **Step 1: Write the failing test for the pure logic**

Create `lib/booking-availability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rangesOverlap, isRangeAvailable } from "./booking-availability";

describe("rangesOverlap", () => {
  it("returns true when ranges overlap", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-05", "2026-10-15")).toBe(true);
  });
  it("returns true when one range is fully inside another", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-31", "2026-10-05", "2026-10-06")).toBe(true);
  });
  it("returns true when ranges touch on the boundary day", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-10", "2026-10-20")).toBe(true);
  });
  it("returns false when ranges don't overlap", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-11", "2026-10-20")).toBe(false);
  });
});

describe("isRangeAvailable", () => {
  it("is always available when capCount is null (uncapped)", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-12-31" }];
    expect(isRangeAvailable(existing, "2026-10-15", "2026-10-20", null)).toBe(true);
  });

  it("is available when no existing bookings overlap", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-10-10" }];
    expect(isRangeAvailable(existing, "2026-10-11", "2026-10-20", 1)).toBe(true);
  });

  it("is not available when an overlap would meet or exceed the cap", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-10-20" }];
    expect(isRangeAvailable(existing, "2026-10-15", "2026-10-25", 1)).toBe(false);
  });

  it("is available when overlaps exist but stay under a higher cap", () => {
    const existing = [
      { startDate: "2026-10-01", endDate: "2026-10-20" },
      { startDate: "2026-10-05", endDate: "2026-10-15" },
    ];
    expect(isRangeAvailable(existing, "2026-10-10", "2026-10-12", 3)).toBe(true);
  });

  it("is not available when overlaps already meet a higher cap", () => {
    const existing = [
      { startDate: "2026-10-01", endDate: "2026-10-20" },
      { startDate: "2026-10-05", endDate: "2026-10-15" },
    ];
    expect(isRangeAvailable(existing, "2026-10-10", "2026-10-12", 2)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/booking-availability.test.ts`
Expected: FAIL — `Cannot find module './booking-availability'`

- [ ] **Step 3: Implement `lib/booking-availability.ts`**

```ts
import { db, bookings } from "@/db";
import type { BookingProductType, SpecialCategory } from "@/db/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";

export interface OccupyingRange {
  startDate: string;
  endDate: string;
}

// Two inclusive [start, end] date ranges, as "YYYY-MM-DD" strings -- ISO dates sort
// lexically the same as numerically, so plain string comparison is correct here.
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// Pure decision, no DB access -- this is what's unit tested directly. `existing` is
// every other booking that currently occupies the same product/category, already
// fetched by the caller. capCount === null means uncapped (always available).
export function isRangeAvailable(
  existing: OccupyingRange[],
  requestedStart: string,
  requestedEnd: string,
  capCount: number | null
): boolean {
  if (capCount === null) return true;
  const overlapping = existing.filter((b) =>
    rangesOverlap(b.startDate, b.endDate, requestedStart, requestedEnd)
  );
  return overlapping.length < capCount;
}

const OCCUPYING_STATUSES = ["approved", "pending_approval"] as const;

// Every booking that currently counts against capacity for this productType/category:
// approved, pending_approval, or a still-live checkout hold (pending_payment with
// reservedUntil in the future -- an expired hold is filtered out here, not by any
// cleanup job). `executor` is `db` for the read-only courtesy check, or a transaction
// (`tx` from `db.transaction(async (tx) => ...)`) when called from the checkout path
// so it sees the same locked snapshot as the insert that follows it.
export async function getOccupyingBookings(
  executor: typeof db,
  productType: BookingProductType,
  category: SpecialCategory | null,
  excludeId?: number
): Promise<OccupyingRange[]> {
  const rows = await executor
    .select({ id: bookings.id, startDate: bookings.startDate, endDate: bookings.endDate })
    .from(bookings)
    .where(
      and(
        eq(bookings.productType, productType),
        category !== null ? eq(bookings.category, category) : undefined,
        or(
          inArray(bookings.status, OCCUPYING_STATUSES),
          and(eq(bookings.status, "pending_payment"), gt(bookings.reservedUntil, new Date()))
        )
      )
    );
  return rows.filter((r) => r.id !== excludeId).map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

export async function checkAvailability(
  executor: typeof db,
  productType: BookingProductType,
  category: SpecialCategory | null,
  capCount: number | null,
  startDate: string,
  endDate: string,
  excludeId?: number
): Promise<boolean> {
  if (capCount === null) return true;
  const occupying = await getOccupyingBookings(executor, productType, category, excludeId);
  return isRangeAvailable(occupying, startDate, endDate, capCount);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/booking-availability.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add lib/booking-availability.ts lib/booking-availability.test.ts
git commit -m "Add booking conflict/availability checking with unit tests"
```

---

### Task 4: Public courtesy availability-check API route

**Files:**
- Create: `app/api/bookings/check-availability/route.ts`

**Interfaces:**
- Consumes: `checkAvailability` from `@/lib/booking-availability`; `db`, `monetizationSettings`
  from `@/db`; `bookingProductType`, `specialCategory` from `@/db/schema`; `checkRateLimit` from
  `@/lib/request-rate-limit`.
- Produces: `POST /api/bookings/check-availability` — body `{ productType, category?, startDate,
  endDate }` → `{ available: boolean }` (or a 400 with `{ error: string }`).

This is the live, non-authoritative check the buyer's date picker calls while they're choosing
dates (spec step 3) — the real check happens again inside the checkout transaction in Task 6.

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, monetizationSettings } from "@/db";
import { bookingProductType, specialCategory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkAvailability } from "@/lib/booking-availability";
import { checkRateLimit } from "@/lib/request-rate-limit";

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  category: z.enum(specialCategory).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "bookings-check-availability", 30, 60);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { productType, category, startDate, endDate } = parsed.data;

  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, productType));
  if (!settings) return NextResponse.json({ error: "unknown product" }, { status: 400 });

  const available = await checkAvailability(
    db,
    productType,
    productType === "category_sponsor" ? category : null,
    settings.capCount,
    startDate,
    endDate
  );

  return NextResponse.json({ available });
}
```

- [ ] **Step 2: Verify manually**

Run `npm run dev`, then from another terminal:

```bash
curl -X POST http://localhost:3000/api/bookings/check-availability \
  -H "Content-Type: application/json" \
  -d '{"productType":"featured","category":null,"startDate":"2026-10-01","endDate":"2026-10-10"}'
```

Expected: `{"available":true}` (nothing booked yet).

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add app/api/bookings/check-availability/route.ts
git commit -m "Add public availability courtesy-check endpoint"
```

---

### Task 5: Email verification (magic link request + confirm)

**Files:**
- Create: `app/api/bookings/verify-email/route.ts`
- Create: `app/api/bookings/confirm-email/route.ts`

**Interfaces:**
- Consumes: `signBookingToken`, `verifyBookingToken`, `BookingSelection` from
  `@/lib/booking-token`; `sendOutreachEmail` from `@/lib/outreach-email`; `checkRateLimit` from
  `@/lib/request-rate-limit`; `bookingProductType`, `specialCategory` from `@/db/schema`.
- Produces: `POST /api/bookings/verify-email` — body matches `BookingSelection` minus
  `buyerEmail`-derived fields (see schema below) → `{ ok: true }`, sends a magic-link email.
  `GET /api/bookings/confirm-email?token=...` → redirects to `/advertise?verifiedToken=...` on
  success, or `/advertise?bookingError=expired` on an invalid/expired token. The `verifiedToken`
  query param carries a second, short-lived signed token (30 min) embedding the full selection
  plus `verifiedAt` — this is what Task 6's checkout route consumes.

- [ ] **Step 1: Implement the request route**

```ts
// app/api/bookings/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookingProductType, specialCategory } from "@/db/schema";
import { signBookingToken, type BookingSelection } from "@/lib/booking-token";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { checkRateLimit } from "@/lib/request-rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  venueId: z.number().int().positive(),
  specialId: z.number().int().positive().nullable(),
  category: z.enum(specialCategory).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "bookings-verify-email", 5, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const selection: BookingSelection = parsed.data;
  const token = await signBookingToken(selection, 15 * 60 * 1000);
  const link = `${SITE_URL}/api/bookings/confirm-email?token=${encodeURIComponent(token)}`;

  await sendOutreachEmail({
    to: selection.buyerEmail,
    subject: "Confirm your Kelowna Food Deals booking",
    htmlContent: `<p>Click below to confirm this email and continue your booking:</p><p><a href="${link}">Confirm and continue</a></p><p>This link expires in 15 minutes.</p>`,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement the confirm route**

```ts
// app/api/bookings/confirm-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyBookingToken, signBookingToken, type BookingSelection } from "@/lib/booking-token";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/advertise?bookingError=expired`);
  }

  const selection = await verifyBookingToken<BookingSelection>(token);
  if (!selection) {
    return NextResponse.redirect(`${SITE_URL}/advertise?bookingError=expired`);
  }

  const { exp: _exp, ...clean } = selection as BookingSelection & { exp: number };
  const verifiedToken = await signBookingToken(
    { ...clean, verifiedAt: Date.now() },
    30 * 60 * 1000
  );

  // verifiedProduct rides alongside the token in plain text -- it's not sensitive (just
  // one of three enum values) and lets /advertise (Task 10) hand the token to the one
  // BookingFlow instance it actually belongs to, without needing to verify the
  // HMAC-signed token client-side (which it can't -- only the server holds the secret).
  return NextResponse.redirect(
    `${SITE_URL}/advertise?verifiedToken=${encodeURIComponent(verifiedToken)}&verifiedProduct=${clean.productType}`
  );
}
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`, POST a real selection to `/api/bookings/verify-email` with your own test email
(same curl shape as Task 4 but this endpoint), confirm the email arrives via Brevo, click the link,
confirm it redirects to `/advertise?verifiedToken=...` with a non-empty token in the URL.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add app/api/bookings/verify-email/route.ts app/api/bookings/confirm-email/route.ts
git commit -m "Add booking email verification (magic link) flow"
```

---

### Task 6: Checkout route — authoritative reserve + Stripe session

**Files:**
- Create: `app/api/bookings/checkout/route.ts`

**Interfaces:**
- Consumes: `verifyBookingToken`, `BookingSelection` from `@/lib/booking-token`;
  `checkAvailability` from `@/lib/booking-availability`; `db`, `bookings`, `monetizationSettings`
  from `@/db`; `getStripe` from `@/lib/stripe`; `checkRateLimit` from `@/lib/request-rate-limit`.
- Produces: `POST /api/bookings/checkout` — body `{ verifiedToken: string }` →
  `{ url: string }` (Stripe Checkout URL) or an error status. This is the transaction where the
  double-sell race condition is actually prevented (see the advisory lock below).

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db, bookings, monetizationSettings } from "@/db";
import { verifyBookingToken, type BookingSelection } from "@/lib/booking-token";
import { checkAvailability } from "@/lib/booking-availability";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/request-rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";
const HOLD_MS = 15 * 60 * 1000;

const bodySchema = z.object({ verifiedToken: z.string() });

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

// Deterministic per-product(+category) lock key so two concurrent checkouts for the
// same capped slot serialize here instead of racing the availability check below.
function lockKeyFor(productType: string, category: string | null): string {
  return category ? `booking:${productType}:${category}` : `booking:${productType}`;
}

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "bookings-checkout", 10, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const selection = await verifyBookingToken<BookingSelection & { verifiedAt: number }>(
    parsed.data.verifiedToken
  );
  if (!selection) {
    return NextResponse.json({ error: "Verification link expired -- start again" }, { status: 400 });
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, selection.productType));
  if (!settings) return NextResponse.json({ error: "unknown product" }, { status: 400 });

  const days = daysBetween(selection.startDate, selection.endDate);
  if (days < settings.minDays || days > settings.maxDays) {
    return NextResponse.json(
      { error: `Choose between ${settings.minDays} and ${settings.maxDays} days` },
      { status: 400 }
    );
  }
  const priceCents = settings.priceCentsPerDay * days;
  const category = selection.productType === "category_sponsor" ? selection.category : null;

  const booking = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKeyFor(selection.productType, category)}))`);

    const available = await checkAvailability(
      tx,
      selection.productType,
      category,
      settings.capCount,
      selection.startDate,
      selection.endDate
    );
    if (!available) return null;

    const [created] = await tx
      .insert(bookings)
      .values({
        productType: selection.productType,
        venueId: selection.venueId,
        specialId: selection.specialId,
        category,
        startDate: selection.startDate,
        endDate: selection.endDate,
        status: "pending_payment",
        reservedUntil: new Date(Date.now() + HOLD_MS),
        priceCents,
        buyerEmail: selection.buyerEmail,
        buyerVerifiedAt: new Date(selection.verifiedAt),
      })
      .returning();
    return created;
  });

  if (!booking) {
    return NextResponse.json({ error: "Those dates are no longer available" }, { status: 409 });
  }

  let sessionUrl: string | null = null;
  let sessionId: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: `${selection.productType} placement — Kelowna Food Deals` },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: selection.buyerEmail,
      client_reference_id: String(booking.id),
      metadata: { bookingId: String(booking.id) },
      expires_at: Math.floor((Date.now() + HOLD_MS) / 1000),
      success_url: `${SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/advertise`,
    });
    sessionUrl = session.url;
    sessionId = session.id;
  } catch {
    sessionUrl = null;
  }

  if (!sessionUrl || !sessionId) {
    await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, booking.id));
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  await db.update(bookings).set({ stripeSessionId: sessionId }).where(eq(bookings.id, booking.id));

  return NextResponse.json({ url: sessionUrl });
}
```

- [ ] **Step 2: Verify the race condition is actually prevented**

Set `monetization_settings.cap_count = 1` for `category_sponsor` (already the seeded default).
With the dev server running, fire two near-simultaneous requests for the same category/date range
(two terminal tabs, same `verifiedToken` obtained via two separate real verify-email round trips
for the same selection):

```bash
curl -s -X POST http://localhost:3000/api/bookings/checkout -H "Content-Type: application/json" -d '{"verifiedToken":"<token>"}' &
curl -s -X POST http://localhost:3000/api/bookings/checkout -H "Content-Type: application/json" -d '{"verifiedToken":"<token>"}' &
wait
```

Expected: exactly one response has a `url`; the other has `{"error":"Those dates are no longer
available"}`. Confirm via `db:studio` that exactly one `bookings` row exists for those dates.

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add app/api/bookings/checkout/route.ts
git commit -m "Add booking checkout endpoint with transactional slot reservation"
```

---

### Task 7: Stripe webhook

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`
- Modify: `.env.local` (document `STRIPE_WEBHOOK_SECRET` requirement — see Step 3)

**Interfaces:**
- Consumes: `getStripe` from `@/lib/stripe`; `db`, `bookings` from `@/db`; `checkAvailability`
  from `@/lib/booking-availability`; `sendReportEmail` from `@/lib/brevo`.
- Produces: `POST /api/webhooks/stripe` — verifies Stripe's signature, handles
  `checkout.session.completed` by flipping the matching booking from `pending_payment` to
  `pending_approval` (idempotently) and notifying the admin.

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookings, monetizationSettings } from "@/db";
import { getStripe } from "@/lib/stripe";
import { checkAvailability } from "@/lib/booking-availability";
import { sendReportEmail } from "@/lib/brevo";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as { id: string; payment_intent: string | null; metadata: Record<string, string> | null };
  const bookingId = Number(session.metadata?.bookingId);
  if (!Number.isInteger(bookingId)) {
    console.error("Stripe webhook: no bookingId in session metadata", session.id);
    return NextResponse.json({ received: true });
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) {
    console.error("Stripe webhook: booking not found", bookingId);
    return NextResponse.json({ received: true });
  }
  if (booking.status !== "pending_payment") {
    // Already processed (Stripe retry) -- idempotent no-op.
    return NextResponse.json({ received: true });
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, booking.productType));

  // Re-check for a conflict introduced between checkout and payment completion (e.g.
  // another booking for the same slot was approved in the meantime). Payment already
  // succeeded, so this can't be silently dropped -- it's flagged for the admin instead.
  const stillAvailable = settings
    ? await checkAvailability(
        db,
        booking.productType,
        booking.category,
        settings.capCount,
        booking.startDate,
        booking.endDate,
        booking.id
      )
    : true;

  await db
    .update(bookings)
    .set({
      status: "pending_approval",
      stripePaymentIntentId: session.payment_intent,
      conflictDetected: !stillAvailable,
    })
    .where(eq(bookings.id, bookingId));

  try {
    await sendReportEmail({
      subject: `New booking pending approval: ${booking.productType} #${booking.id}${!stillAvailable ? " (CONFLICT)" : ""}`,
      textContent: `Product: ${booking.productType}\nVenue ID: ${booking.venueId}\nDates: ${booking.startDate} to ${booking.endDate}\nBuyer: ${booking.buyerEmail}\nPrice paid: $${(booking.priceCents / 100).toFixed(2)}\n\nReview at /admin/sponsored`,
    });
  } catch (err) {
    console.error("Failed to send booking notification email:", err);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Configure the webhook**

Add `STRIPE_WEBHOOK_SECRET` to `.env.local` and to Railway's environment variables (get the value
from the Stripe dashboard after registering `https://kelownafooddeals.shop/api/webhooks/stripe`
as an endpoint listening for `checkout.session.completed` — or via `stripe listen` for local
testing, which prints a `whsec_...` secret).

- [ ] **Step 3: Verify manually with the Stripe CLI**

Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, complete a real test-mode
checkout from Task 6's flow using a Stripe test card (`4242 4242 4242 4242`), and confirm: (a) the
webhook logs `200`, (b) the booking's `status` is now `pending_approval` in `db:studio`, (c) the
admin notification email arrives.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "Add Stripe webhook to fulfill bookings on successful payment"
```

---

### Task 8: Booking data queries, activation, and admin approve/reject routes

**Files:**
- Create: `lib/bookings-data.ts`
- Create: `app/api/admin/bookings/[id]/approve/route.ts`
- Create: `app/api/admin/bookings/[id]/reject/route.ts`
- Create: `app/api/admin/bookings/[id]/mark-refunded/route.ts`

**Interfaces:**
- Consumes: `db`, `bookings`, `venues`, `specials`, `categorySponsors` from `@/db`;
  `isAdminAuthed` from `@/lib/admin-auth`; `pacificTodayISODate` from `@/lib/time`.
- Produces: `interface PendingBooking { id, productType, venueId, venueName, specialId,
  specialTitle: string | null, category: SpecialCategory | null, startDate, endDate, priceCents,
  buyerEmail, conflictDetected }`; `getPendingApprovalBookings(): Promise<PendingBooking[]>`;
  `interface RefundNeeded { id, productType, priceCents, buyerEmail, stripePaymentIntentId: string
  | null }`; `getRefundsNeeded(): Promise<RefundNeeded[]>`; `activateBooking(bookingId: number):
  Promise<void>` (writes the live legacy columns — also used by Task 11's sync job);
  `approveBooking(bookingId: number): Promise<void>`; `rejectBooking(bookingId: number):
  Promise<void>`; `markRefunded(bookingId: number): Promise<void>`.
  `POST /api/admin/bookings/[id]/approve`, `POST /api/admin/bookings/[id]/reject`,
  `POST /api/admin/bookings/[id]/mark-refunded` (no body on any of the three).

- [ ] **Step 1: Implement `lib/bookings-data.ts`**

```ts
import { db, bookings, venues, specials, categorySponsors } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";
import { pacificTodayISODate } from "@/lib/time";

export interface PendingBooking {
  id: number;
  productType: string;
  venueId: number | null;
  venueName: string | null;
  specialId: number | null;
  specialTitle: string | null;
  category: SpecialCategory | null;
  startDate: string;
  endDate: string;
  priceCents: number;
  buyerEmail: string;
  conflictDetected: boolean;
}

export async function getPendingApprovalBookings(): Promise<PendingBooking[]> {
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
    .where(eq(bookings.status, "pending_approval"))
    .orderBy(asc(bookings.createdAt));
  return rows;
}

export interface RefundNeeded {
  id: number;
  productType: string;
  priceCents: number;
  buyerEmail: string;
  stripePaymentIntentId: string | null;
}

export async function getRefundsNeeded(): Promise<RefundNeeded[]> {
  return db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "rejected"), eq(bookings.refundNeeded, true)))
    .orderBy(asc(bookings.reviewedAt));
}

function endOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

// Writes an approved booking's dates into the existing "live now" columns that every
// render path already reads. Used both when an admin approves a booking whose range
// already covers today, and by the daily sync job (Task 11) for a future-dated
// approved booking on the day its range starts. Idempotent -- safe to call more than
// once for the same booking.
export async function activateBooking(bookingId: number): Promise<void> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;
  const until = endOfDayUtc(booking.endDate);

  if (booking.productType === "featured" && booking.venueId !== null) {
    await db.update(venues).set({ featuredUntil: until }).where(eq(venues.id, booking.venueId));
  } else if (booking.productType === "boost" && booking.specialId !== null) {
    await db.update(specials).set({ boostedUntil: until }).where(eq(specials.id, booking.specialId));
  } else if (booking.productType === "category_sponsor" && booking.category !== null && booking.venueId !== null) {
    const [venue] = await db.select().from(venues).where(eq(venues.id, booking.venueId));
    await db.delete(categorySponsors).where(eq(categorySponsors.category, booking.category));
    await db.insert(categorySponsors).values({
      category: booking.category,
      sponsorName: venue?.name ?? "Sponsor",
      sponsorUrl: venue?.website ?? null,
      sponsorUntil: until,
    });
  }
}

export async function approveBooking(bookingId: number): Promise<void> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking || booking.status !== "pending_approval") return;

  await db
    .update(bookings)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  const today = pacificTodayISODate();
  if (booking.startDate <= today && today <= booking.endDate) {
    await activateBooking(bookingId);
  }
}

export async function rejectBooking(bookingId: number): Promise<void> {
  await db
    .update(bookings)
    .set({ status: "rejected", refundNeeded: true, reviewedAt: new Date() })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending_approval")));
}

export async function markRefunded(bookingId: number): Promise<void> {
  await db.update(bookings).set({ refundNeeded: false }).where(eq(bookings.id, bookingId));
}
```

- [ ] **Step 2: Implement the approve route**

```ts
// app/api/admin/bookings/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/admin-auth";
import { approveBooking } from "@/lib/bookings-data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await approveBooking(bookingId);

  revalidatePath("/");
  revalidatePath("/events");

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement the reject route**

```ts
// app/api/admin/bookings/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { rejectBooking } from "@/lib/bookings-data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await rejectBooking(bookingId);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement the mark-refunded route**

```ts
// app/api/admin/bookings/[id]/mark-refunded/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { markRefunded } from "@/lib/bookings-data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await markRefunded(bookingId);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify manually**

Using a `pending_approval` booking from Task 7's manual test, `curl` the approve endpoint with the
admin cookie (log into `/admin` in a browser, copy the `kds_admin_session` cookie value):

```bash
curl -X POST http://localhost:3000/api/admin/bookings/<id>/approve -H "Cookie: kds_admin_session=<value>"
```

Expected: `{"ok":true}`, and (if the booking's dates cover today) the corresponding
`venues.featuredUntil`/`specials.boostedUntil`/`categorySponsors` row is now set — confirm via
`db:studio`.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add lib/bookings-data.ts app/api/admin/bookings
git commit -m "Add booking activation logic and admin approve/reject/refund routes"
```

---

### Task 9: Admin UI — pending bookings, refunds, and settings panels

**Files:**
- Create: `components/PendingBookingsPanel.tsx`
- Create: `components/RefundsNeededPanel.tsx`
- Create: `components/MonetizationSettingsPanel.tsx`
- Create: `app/api/admin/settings/route.ts`
- Modify: `app/admin/sponsored/page.tsx`

**Interfaces:**
- Consumes: `getPendingApprovalBookings`, `getRefundsNeeded` from `@/lib/bookings-data`; `db`,
  `monetizationSettings` from `@/db`; `formatPrice` from `@/lib/format`; `isAdminAuthed` from
  `@/lib/admin-auth`; `bookingProductType` from `@/db/schema`.
- Produces: `GET /api/admin/settings` → all `monetization_settings` rows; `POST
  /api/admin/settings` — body `{ productType, capCount: number | null, priceCentsPerDay, minDays,
  maxDays }` → updates one row.

- [ ] **Step 1: Add a settings query helper and API route**

```ts
// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, monetizationSettings } from "@/db";
import { bookingProductType } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(monetizationSettings);
  return NextResponse.json({ settings: rows });
}

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  capCount: z.number().int().positive().nullable(),
  priceCentsPerDay: z.number().int().nonnegative(),
  minDays: z.number().int().positive(),
  maxDays: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.minDays > parsed.data.maxDays) {
    return NextResponse.json({ error: "minDays must be <= maxDays" }, { status: 400 });
  }

  await db
    .update(monetizationSettings)
    .set({
      capCount: parsed.data.capCount,
      priceCentsPerDay: parsed.data.priceCentsPerDay,
      minDays: parsed.data.minDays,
      maxDays: parsed.data.maxDays,
    })
    .where(eq(monetizationSettings.productType, parsed.data.productType));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement `PendingBookingsPanel.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingBooking } from "@/lib/bookings-data";
import { formatPrice } from "@/lib/format";

export function PendingBookingsPanel({ pending }: { pending: PendingBooking[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: number, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Pending bookings</h2>
      <p className="text-sm text-muted">Paid, awaiting your approval before they go live.</p>

      {pending.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing pending.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground/90">
                    {b.productType} — {b.venueName ?? b.specialTitle ?? b.category}
                  </span>
                  <span className="text-xs text-muted-2">
                    {b.startDate} to {b.endDate} · {formatPrice(b.priceCents)} · {b.buyerEmail}
                  </span>
                  {b.conflictDetected && (
                    <span className="text-xs text-stale">
                      Conflict: another booking now overlaps these dates — check before approving.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(b.id, "approve")}
                    disabled={busyId === b.id}
                    className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act(b.id, "reject")}
                    disabled={busyId === b.id}
                    className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Implement `RefundsNeededPanel.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RefundNeeded } from "@/lib/bookings-data";
import { formatPrice } from "@/lib/format";

export function RefundsNeededPanel({ refunds }: { refunds: RefundNeeded[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function markDone(id: number) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/bookings/${id}/mark-refunded`, { method: "POST" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (refunds.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Refunds needed</h2>
      <p className="text-sm text-muted">
        Rejected bookings that were already paid — refund these in Stripe's dashboard directly,
        then mark done here.
      </p>
      <ul className="flex flex-col gap-2">
        {refunds.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stale/40 bg-surface px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground/90">
                {r.productType} — {formatPrice(r.priceCents)}
              </span>
              <span className="text-xs text-muted-2">
                {r.buyerEmail} · payment intent: {r.stripePaymentIntentId ?? "unknown"}
              </span>
            </div>
            <button
              onClick={() => markDone(r.id)}
              disabled={busyId === r.id}
              className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
            >
              Mark refunded
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Implement `MonetizationSettingsPanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { BookingProductType } from "@/db/schema";

interface SettingsRow {
  productType: BookingProductType;
  capCount: number | null;
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

export function MonetizationSettingsPanel({ initial }: { initial: SettingsRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<BookingProductType | null>(null);
  const [savedAt, setSavedAt] = useState<BookingProductType | null>(null);

  async function save(row: SettingsRow) {
    setBusy(row.productType);
    setSavedAt(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) setSavedAt(row.productType);
    } finally {
      setBusy(null);
    }
  }

  function update(productType: BookingProductType, patch: Partial<SettingsRow>) {
    setRows((prev) => prev.map((r) => (r.productType === productType ? { ...r, ...patch } : r)));
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Monetization settings</h2>
      <p className="text-sm text-muted">
        Real prices and caps for the self-serve booking system — set these before announcing it.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.productType} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <span className="text-sm font-medium text-foreground/90">{row.productType}</span>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <label className="flex flex-col gap-1">
                Cap (blank = uncapped)
                <input
                  type="number"
                  value={row.capCount ?? ""}
                  onChange={(e) =>
                    update(row.productType, { capCount: e.target.value ? Number(e.target.value) : null })
                  }
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Price/day (cents)
                <input
                  type="number"
                  value={row.priceCentsPerDay}
                  onChange={(e) => update(row.productType, { priceCentsPerDay: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Min days
                <input
                  type="number"
                  value={row.minDays}
                  onChange={(e) => update(row.productType, { minDays: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Max days
                <input
                  type="number"
                  value={row.maxDays}
                  onChange={(e) => update(row.productType, { maxDays: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
            </div>
            <button
              onClick={() => save(row)}
              disabled={busy === row.productType}
              className="press-pill self-start rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              {savedAt === row.productType ? "Saved" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Wire all three panels into the admin page**

Modify `app/admin/sponsored/page.tsx`:

```tsx
import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import { PartnersPanel } from "@/components/PartnersPanel";
import { CategorySponsorPanel } from "@/components/CategorySponsorPanel";
import { PendingBookingsPanel } from "@/components/PendingBookingsPanel";
import { RefundsNeededPanel } from "@/components/RefundsNeededPanel";
import { MonetizationSettingsPanel } from "@/components/MonetizationSettingsPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getVenueOptions,
  getSpecialOptions,
  getPartnerVenues,
  getActiveCategorySponsors,
} from "@/lib/sponsored-data";
import { getPendingApprovalBookings, getRefundsNeeded } from "@/lib/bookings-data";
import { db, monetizationSettings } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
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
    getFeaturedVenues(),
    getBoostedSpecials(),
    getVenueOptions(),
    getSpecialOptions(),
    getPartnerVenues(),
    getActiveCategorySponsors(),
    getPendingApprovalBookings(),
    getRefundsNeeded(),
    db.select().from(monetizationSettings),
  ]);

  return (
    <AdminShell active="sponsored" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Sponsored</h1>

      <PendingBookingsPanel pending={pendingBookings} />
      <RefundsNeededPanel refunds={refundsNeeded} />
      <FeaturedVenuesPanel active={featuredVenues} venueOptions={venueOptions} />
      <BoostedSpecialsPanel
        active={boostedSpecials}
        venueOptions={venueOptions}
        specialOptions={specialOptions}
      />
      <PartnersPanel active={partnerVenues} venueOptions={venueOptions} />
      <CategorySponsorPanel active={categorySponsors} />
      <MonetizationSettingsPanel initial={settingsRows} />
    </AdminShell>
  );
}
```

- [ ] **Step 6: Verify live in the browser**

Log into `/admin/sponsored`, confirm all three new sections render (Pending bookings, Refunds
needed — hidden if empty, Monetization settings), and that saving a settings value round-trips
(reload the page, confirm the new value persisted).

- [ ] **Step 7: Typecheck, build, and commit**

Run `npm run typecheck` then `npm run build` — expect both to pass.

```bash
git add components/PendingBookingsPanel.tsx components/RefundsNeededPanel.tsx components/MonetizationSettingsPanel.tsx app/api/admin/settings/route.ts app/admin/sponsored/page.tsx
git commit -m "Add admin UI for pending bookings, refunds, and monetization settings"
```

---

### Task 10: Public purchase flow on `/advertise`

**Files:**
- Create: `components/BookingFlow.tsx`
- Create: `app/book/success/page.tsx`
- Modify: `app/advertise/page.tsx`

**Interfaces:**
- Consumes: `getVenueOptions`, `getSpecialOptions` from `@/lib/sponsored-data`; `db`,
  `monetizationSettings` from `@/db`; `bookingProductType`, `specialCategory` from `@/db/schema`;
  `CATEGORY_LABELS`, `formatPrice` from `@/lib/format`.
- Produces: a `BookingFlow` client component rendered per product card on `/advertise`, and a
  `/book/success` confirmation page.

**Current state of `app/advertise/page.tsx`** (read in full so Step 4 below is a precise diff, not
a guess): it's a server component with three static cards (Featured placement, Seasonal boost,
Category sponsorship — the third one's copy still says "Not built yet — tell us you're interested"
from before this project existed) followed by `<SponsorInquiryForm />`. No data fetching happens
today. Step 4 replaces the whole file.

- [ ] **Step 1: Implement `BookingFlow.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { BookingProductType, SpecialCategory } from "@/db/schema";
import { CATEGORY_LABELS, formatPrice } from "@/lib/format";

interface VenueOption {
  id: number;
  name: string;
}
interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}
interface Settings {
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

const CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];

export function BookingFlow({
  productType,
  venues,
  specials,
  settings,
  initialVerifiedToken,
}: {
  productType: BookingProductType;
  venues: VenueOption[];
  specials: SpecialOption[];
  settings: Settings;
  initialVerifiedToken: string | null;
}) {
  const [open, setOpen] = useState(initialVerifiedToken !== null);
  const [venueId, setVenueId] = useState<number | "">("");
  const [specialId, setSpecialId] = useState<number | "">("");
  const [category, setCategory] = useState<SpecialCategory>("happy_hour");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<"unknown" | "checking" | "available" | "unavailable">("unknown");
  const [step, setStep] = useState<"form" | "sent" | "checkout">(initialVerifiedToken ? "checkout" : "form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) {
      setAvailability("unknown");
      return;
    }
    setAvailability("checking");
    const controller = new AbortController();
    fetch("/api/bookings/check-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productType,
        category: productType === "category_sponsor" ? category : null,
        startDate,
        endDate,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setAvailability(data.available ? "available" : "unavailable"))
      .catch(() => {});
    return () => controller.abort();
  }, [productType, category, startDate, endDate]);

  const venueSpecials = specials.filter((s) => s.venueId === venueId);

  async function requestVerification() {
    setError(null);
    if (!venueId) return setError("Pick your venue.");
    if (productType === "boost" && !specialId) return setError("Pick which special to boost.");
    if (!startDate || !endDate || endDate < startDate) return setError("Pick valid dates.");
    if (!email) return setError("Enter your email.");

    setBusy(true);
    try {
      const res = await fetch("/api/bookings/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          venueId,
          specialId: productType === "boost" ? specialId : null,
          category: productType === "category_sponsor" ? category : null,
          startDate,
          endDate,
          buyerEmail: email,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function goToCheckout() {
    if (!initialVerifiedToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedToken: initialVerifiedToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start"
      >
        Get started
      </button>
    );
  }

  if (step === "checkout") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
        <p className="text-sm text-foreground/90">Email verified — ready to pay.</p>
        {error && <p className="text-sm text-stale">{error}</p>}
        <button
          onClick={goToCheckout}
          disabled={busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start disabled:opacity-50"
        >
          {busy ? "Redirecting…" : "Continue to payment"}
        </button>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <p className="text-sm text-muted">
        Check {email} for a confirmation link — it expires in 15 minutes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Venue
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Select a venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>

      {productType === "boost" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Which special?
          <select
            value={specialId}
            onChange={(e) => setSpecialId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select a special…</option>
            {venueSpecials.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {productType === "category_sponsor" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SpecialCategory)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>

      {availability === "checking" && <p className="text-xs text-muted-2">Checking availability…</p>}
      {availability === "unavailable" && (
        <p className="text-xs text-stale">Not available for those dates — try a different range.</p>
      )}
      {availability === "available" && startDate && endDate && (
        <p className="text-xs text-muted-2">
          Available. Price: {formatPrice(settings.priceCentsPerDay)}/day
          (between {settings.minDays} and {settings.maxDays} days).
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-muted">
        Your email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourvenue.com"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        onClick={requestVerification}
        disabled={busy || availability === "unavailable"}
        className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send verification email"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `/book/success`**

```tsx
// app/book/success/page.tsx
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "Booking received" };

export default function BookingSuccessPage() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="blog" subtitle="Payment received." />
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Payment received</p>
        <p className="text-sm text-muted">
          Your booking is now pending review. You&apos;ll hear from us within a day or two once
          it&apos;s approved and live.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/advertise/page.tsx`**

```tsx
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { BookingFlow } from "@/components/BookingFlow";
import { getVenueOptions, getSpecialOptions } from "@/lib/sponsored-data";
import { db, monetizationSettings } from "@/db";
import type { BookingProductType } from "@/db/schema";

export const metadata = {
  title: "Advertise With Us",
  description:
    "Feature your venue, promote a seasonal special, or sponsor a category on Kelowna Food Deals.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ verifiedToken?: string; verifiedProduct?: string; bookingError?: string }>;
}

export default async function AdvertisePage({ searchParams }: PageProps) {
  const { verifiedToken, verifiedProduct, bookingError } = await searchParams;
  // Only the BookingFlow whose productType matches the confirmed link's product ever
  // receives a non-null token -- confirm-email (Task 5) redirects with the product
  // type in plain text alongside the (HMAC-signed, client-unverifiable) token itself.
  function tokenFor(productType: BookingProductType): string | null {
    return verifiedProduct === productType ? (verifiedToken ?? null) : null;
  }
  const [venueOptions, specialOptions, settingsRows] = await Promise.all([
    getVenueOptions(),
    getSpecialOptions(),
    db.select().from(monetizationSettings),
  ]);

  function settingsFor(productType: BookingProductType) {
    const row = settingsRows.find((r) => r.productType === productType);
    return {
      priceCentsPerDay: row?.priceCentsPerDay ?? 0,
      minDays: row?.minDays ?? 1,
      maxDays: row?.maxDays ?? 30,
    };
  }

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader
        active="blog"
        subtitle="Feature your venue or promote a seasonal special to Kelowna diners."
      />

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl text-foreground">Three ways to get more visibility</h2>
        <p className="text-sm text-muted">
          Pick a venue, choose your dates, and pay securely — every booking is reviewed before it
          goes live.
        </p>
        {bookingError === "expired" && (
          <p className="text-sm text-stale">That link expired — please start again below.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Featured placement</h3>
            <p className="text-sm text-muted">
              Your venue's card pins to the top of the homepage board — every day, every category —
              for as long as the placement runs. Comes with a gold &ldquo;Featured&rdquo; badge.
            </p>
          </div>
          <BookingFlow
            productType="featured"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("featured")}
            initialVerifiedToken={tokenFor("featured")}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Seasonal boost</h3>
            <p className="text-sm text-muted">
              One specific special — a holiday menu, a game-day deal, a one-off event — gets top
              billing for its exact date window. A one-time push instead of an ongoing commitment.
            </p>
          </div>
          <BookingFlow
            productType="boost"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("boost")}
            initialVerifiedToken={tokenFor("boost")}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Category sponsorship</h3>
            <p className="text-sm text-muted">
              Your brand attached to a specific category sitewide (Wing Nights, Happy Hour) —
              shown right under the filter whenever a diner picks that category.
            </p>
          </div>
          <BookingFlow
            productType="category_sponsor"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("category_sponsor")}
            initialVerifiedToken={tokenFor("category_sponsor")}
          />
        </div>
      </div>

      <SponsorInquiryForm />

      <SiteFooter />
    </div>
  );
}
```

Note this also fixes the Category Sponsorship card's stale "Not built yet" copy from before this
project existed — it's been live since the previous phase. It also relies on Task 5's confirm
route redirecting with both `verifiedToken` and `verifiedProduct` (already specified in Task 5,
Step 2 above) — only the one `BookingFlow` instance whose `productType` prop matches
`verifiedProduct` ever receives a non-null `initialVerifiedToken`, via the `tokenFor()` helper
above. The other two stay in their normal closed/form state.

- [ ] **Step 4: Verify live in the browser**

Run `npm run dev`, visit `/advertise`, click "Get started" under Featured Placement, fill the form,
watch the availability check respond, submit, receive the real email, click the link, confirm it
lands back on `/advertise` with the **Featured Placement** card (and only that one) in the "ready
to pay" state, click through to a real Stripe test checkout.

- [ ] **Step 5: Typecheck, build, and commit**

Run `npm run typecheck` then `npm run build` — expect both to pass.

```bash
git add components/BookingFlow.tsx app/book/success/page.tsx app/advertise/page.tsx
git commit -m "Add public self-serve booking flow to /advertise"
```

---

### Task 11: Daily sync job for future-dated approved bookings

**Files:**
- Create: `cron/booking-sync.ts`
- Modify: `cron/index.ts`

**Interfaces:**
- Consumes: `db`, `bookings` from `@/db`; `pacificTodayISODate` from `@/lib/time`;
  `activateBooking` from `@/lib/bookings-data`.
- Produces: `syncBookings(): Promise<{ activated: number }>`, called once per day from the
  existing cron's `runScrapeCycle()`.

Deactivation needs no code here: `activateBooking()` sets `featuredUntil`/`boostedUntil`/
`categorySponsors.sponsorUntil` to the end of the booking's own `endDate`, and every existing
render path already treats those as self-expiring (`isPromotionActive()`,
`getActiveCategorySponsors()`'s own filter) — so a booking that already activated on time simply
stops showing once its date passes, with nothing new to schedule for that half.

- [ ] **Step 1: Implement `cron/booking-sync.ts`**

```ts
import { db, bookings } from "@/db";
import { eq, and, lte, gte } from "drizzle-orm";
import { pacificTodayISODate } from "@/lib/time";
import { activateBooking } from "@/lib/bookings-data";

// Activates any approved booking whose date range has just started (today falls
// inside [startDate, endDate]) but which hasn't been written to the live columns yet.
// A booking approved while its range already covered today was activated immediately
// by approveBooking() -- this only catches future-dated approvals reaching their
// start date. Idempotent: activateBooking() is safe to call more than once.
export async function syncBookings(): Promise<{ activated: number }> {
  const today = pacificTodayISODate();
  const dueToday = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.status, "approved"), lte(bookings.startDate, today), gte(bookings.endDate, today)));

  for (const row of dueToday) {
    await activateBooking(row.id);
  }

  return { activated: dueToday.length };
}
```

- [ ] **Step 2: Wire it into the cron entry point**

Modify `cron/index.ts`: add the import near the top —

```ts
import { syncBookings } from "./booking-sync";
```

— and add a new try/catch block inside `runScrapeCycle()`, matching the existing style of the
`pruneAnalyticsEvents`/`scrapeCastanetEvents` steps (insert right after the `pruneAnalyticsEvents`
block):

```ts
  try {
    const { activated } = await syncBookings();
    console.log(`Bookings: activated ${activated} booking(s) starting today`);
  } catch (err) {
    console.error("Booking sync failed:", err instanceof Error ? err.message : err);
  }
```

- [ ] **Step 3: Verify manually**

Create a test `approved` booking directly via `db:studio` (or a one-off script) with `startDate`
equal to today and `endDate` a week out, for a real test venue. Run `npm run cron` locally (or
just `npx tsx --require ./scripts/env.cjs -e "import('./cron/booking-sync').then(m => m.syncBookings()).then(console.log)"`)
and confirm: (a) it logs `activated 1`, (b) the venue's `featuredUntil` (or the relevant column)
is now set. Clean up the test booking and any live column change afterward.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck` — expect it to pass.

```bash
git add cron/booking-sync.ts cron/index.ts
git commit -m "Add daily sync job to activate future-dated approved bookings"
```

---

## After all tasks: full-system live verification

Once all 11 tasks are committed, do one end-to-end pass on the live Railway deployment (matching
this project's established verification pattern — see `project_kelowna_specials_ui_audit.md`):

1. Set real (or clearly-marked test) values in `/admin/sponsored`'s new Settings panel.
2. Complete a real Stripe test-mode purchase through `/advertise` for each of the three product
   types (Featured, Boost, Category Sponsorship).
3. Confirm each lands in the Pending Bookings admin panel with correct details.
4. Approve one, reject one, and confirm: the approved one shows up live on the site (via the
   existing badges/sponsor line already verified in the previous phase), and the rejected one
   appears in Refunds Needed.
5. Attempt to double-book the same capped slot (two browser tabs) and confirm the second one is
   correctly told "not available."
6. Clean up all test bookings/data created during this pass before considering the feature done.
