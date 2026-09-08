# Deal Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every special two independent human-confirmation signals — a venue confirming its own listing via a magic link, and site visitors crowdsourcing confirm/dispute — reusing this codebase's existing signed-token, rate-limit, and report patterns rather than building new infrastructure.

**Architecture:** One nullable `venueConfirmedAt` column on `specials`, one new `deal_feedback` table logging every confirm/dispute for both specials and events (mirroring the existing `/api/report` route's own specials/events duality). A new signed-token helper (identical HMAC pattern to `lib/unsubscribe.ts`) drives a no-login venue verification page reached from a link in the existing outreach email. The existing "Report incorrect" button becomes DB-backed instead of email-backed, and a new "Confirm this deal" button is added alongside it on specials only.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + Postgres, Zod for request validation.

**Spec:** `docs/superpowers/specs/2026-09-07-deal-verification-design.md`

## Global Constraints

- No login/session system for venues — verification is a one-time signed link, following `lib/unsubscribe.ts`'s exact HMAC-over-id pattern (`crypto.createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)`).
- No verification (`venueConfirmedAt`, the "Confirm this deal" button) for `events` in this build — specials only. The existing dispute path (`/api/report`) already covers both specials and events and must keep covering both after this plan's changes.
- Disputes never auto-hide or remove a special/event — they only ever surface in the new admin "Flagged" queue for a human to act on.
- The existing "Report incorrect" email-to-admin behavior is REMOVED, replaced entirely by the new DB-backed queue (per explicit decision during brainstorming — not a "keep both" choice).
- A confirmation has no expiry — it stays valid until the special's row changes (which the nightly cron already causes naturally by replacing changed specials with a new row) or is archived.
- Anti-spam relies entirely on the existing `checkRateLimit` helper (`lib/request-rate-limit.ts`) — no new fingerprinting/hashing logic.

---

### Task 1: Schema — `venueConfirmedAt` column and `deal_feedback` table

**Files:**
- Modify: `db/schema.ts`
- Create (generated): a new file under `db/migrations/` via `npx drizzle-kit generate`

**Interfaces:**
- Produces: `specials.venueConfirmedAt` (nullable timestamp), `dealFeedback` table (Drizzle export `dealFeedback`), columns `id, itemId, kind ('special'|'event'), feedbackType ('confirm'|'dispute'), createdAt`.

- [ ] **Step 1: Add `venueConfirmedAt` to the `specials` table**

In `db/schema.ts`, inside the `specials` table definition (the one with `id: serial("id").primaryKey()` starting around line 130), add this field right after `boostedUntil`:

```typescript
  // Set when the venue itself clicks "Yes, this is accurate" on the /verify/[token]
  // page reached from the outreach email -- see lib/venue-verify.ts. Null means never
  // confirmed by the venue. Survives unchanged across cron re-scrapes (the nightly
  // upsert only creates a new row when a special's content actually changes -- see
  // cron/upsert.ts's replaceVenueSpecials), so a confirmation naturally resets to null
  // only when the underlying deal itself changes, matching the spec's "no expiry" rule.
  venueConfirmedAt: timestamp("venue_confirmed_at", { withTimezone: true }),
```

- [ ] **Step 2: Add the `dealFeedback` table**

Add this new table near the bottom of `db/schema.ts`, after the `rateLimits` table definition:

```typescript
// One row per visitor confirm/dispute click on a special or event. Counts are computed
// at read time (count(*) grouped by itemId/kind/feedbackType) rather than stored as a
// running total, so there's no risk of a cached count drifting from the underlying rows.
// itemId + kind together identify the target row (specials.id or events.id) -- mirrors
// the same kind-discriminated design app/api/report/route.ts already uses, rather than
// adding two separate nullable foreign key columns.
export const dealFeedback = specialsSchema.table("deal_feedback", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  kind: text("kind").$type<"special" | "event">().notNull(),
  feedbackType: text("feedback_type").$type<"confirm" | "dispute">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type DealFeedback = typeof dealFeedback.$inferSelect;
```

- [ ] **Step 3: Generate and apply the migration**

Run: `npx drizzle-kit generate`
Expected: a new SQL file under `db/migrations/` adding the nullable `venue_confirmed_at` column to `specials` and creating the `deal_feedback` table. Read the generated SQL to confirm it touches nothing else.

Run: `npx drizzle-kit migrate` (production `DATABASE_URL`, same as every other migration this project applies directly)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "Add venueConfirmedAt column and deal_feedback table"
```

---

### Task 2: Venue verification token helper

**Files:**
- Create: `lib/venue-verify.ts`
- Test: a throwaway `scripts/tmp-test-venue-verify.mjs`, run then deleted (this project has no formal test runner — see `lib/unsubscribe.ts`/`lib/booking-token.ts` for the pattern this mirrors)

**Interfaces:**
- Produces: `buildVenueVerifyToken(venueId: number): string`, `verifyVenueVerifyToken(venueId: number, token: string): boolean`, `buildVenueVerifyUrl(venueId: number, domain: string): string`.

- [ ] **Step 1: Write the token helper**

```typescript
// lib/venue-verify.ts
import crypto from "crypto";

/**
 * Stateless, unguessable per-venue verification token (HMAC over the venue id),
 * identical pattern to lib/unsubscribe.ts's buildUnsubscribeToken -- verified by
 * recomputing and comparing, never stored, so a /verify/[token] link works without
 * a separate token table and without any login system.
 */
export function buildVenueVerifyToken(venueId: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  // Distinct HMAC input prefix ("verify:") from buildUnsubscribeToken's bare venueId,
  // so a leaked unsubscribe token can never be replayed as a verify token or vice versa.
  return crypto.createHmac("sha256", secret).update(`verify:${venueId}`).digest("hex");
}

export function verifyVenueVerifyToken(venueId: number, token: string): boolean {
  const expected = buildVenueVerifyToken(venueId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildVenueVerifyUrl(venueId: number, domain: string): string {
  const token = buildVenueVerifyToken(venueId);
  return `https://${domain}/verify/${venueId}-${token}`;
}
```

- [ ] **Step 2: Write a throwaway verification script**

```javascript
// scripts/tmp-test-venue-verify.mjs
import "dotenv/config";
const { buildVenueVerifyToken, verifyVenueVerifyToken } = await import("../lib/venue-verify.ts");

const token = buildVenueVerifyToken(42);
if (!verifyVenueVerifyToken(42, token)) throw new Error("FAIL: valid token rejected");
if (verifyVenueVerifyToken(43, token)) throw new Error("FAIL: token for venue 42 accepted for venue 43");
console.log("PASS: venue verify token round-trips and is venue-scoped");
```

Run: `npx tsx scripts/tmp-test-venue-verify.mjs`
Expected: `PASS: venue verify token round-trips and is venue-scoped`

- [ ] **Step 3: Delete the verification script and commit**

```bash
rm scripts/tmp-test-venue-verify.mjs
git add lib/venue-verify.ts
git commit -m "Add venue verification token helper"
```

---

### Task 3: `/verify/[venueId-token]` page and confirm API route

**Files:**
- Create: `app/verify/[token]/page.tsx`
- Create: `components/VenueVerifyList.tsx`
- Create: `app/api/venue-verify/confirm/route.ts`

**Interfaces:**
- Consumes: `verifyVenueVerifyToken` from Task 2, `specials`/`venues` from `@/db`.
- Produces: a public page at `/verify/{venueId}-{token}` and a `POST /api/venue-verify/confirm` route consumed by `VenueVerifyList`.

- [ ] **Step 1: Write the confirm API route**

```typescript
// app/api/venue-verify/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials } from "@/db";
import { eq, and } from "drizzle-orm";
import { verifyVenueVerifyToken } from "@/lib/venue-verify";

const confirmSchema = z.object({
  venueId: z.number().int().positive(),
  token: z.string().min(1),
  specialId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { venueId, token, specialId } = parsed.data;

  // Verify the token server-side rather than trusting the client-supplied venueId on
  // its own -- a forged venueId with no matching valid token is rejected here.
  if (!verifyVenueVerifyToken(venueId, token)) {
    return NextResponse.json({ error: "invalid or expired link" }, { status: 401 });
  }

  // Belt-and-suspenders: only allow confirming a special that actually belongs to the
  // venue the token was issued for, so a valid token for venue A can never be used
  // (even via a manually crafted request) to confirm venue B's specials.
  const result = await db
    .update(specials)
    .set({ venueConfirmedAt: new Date() })
    .where(and(eq(specials.id, specialId), eq(specials.venueId, venueId)));

  if (result.count === 0) {
    return NextResponse.json({ error: "special not found for this venue" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the verify page**

```typescript
// app/verify/[token]/page.tsx
import { notFound } from "next/navigation";
import { db, venues, specials } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { verifyVenueVerifyToken } from "@/lib/venue-verify";
import { VenueVerifyList } from "@/components/VenueVerifyList";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawParam } = await params;
  // The route param is "{venueId}-{token}" (e.g. "42-abc123..."); split on the first
  // hyphen only, since the HMAC hex token itself never contains one.
  const separatorIndex = rawParam.indexOf("-");
  if (separatorIndex === -1) notFound();
  const venueId = Number(rawParam.slice(0, separatorIndex));
  const token = rawParam.slice(separatorIndex + 1);
  if (!Number.isInteger(venueId) || !verifyVenueVerifyToken(venueId, token)) notFound();

  const [venue] = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) notFound();

  const venueSpecials = await db
    .select({
      id: specials.id,
      title: specials.title,
      description: specials.description,
      venueConfirmedAt: specials.venueConfirmedAt,
    })
    .from(specials)
    .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));

  return (
    <main className="min-h-full flex flex-col items-center px-4 py-10 gap-6">
      <h1 className="font-display text-2xl text-foreground">Confirm {venue.name}'s specials</h1>
      <p className="text-sm text-muted max-w-md text-center">
        These are the specials currently listed for your venue. Click confirm on each one that's still accurate.
      </p>
      <VenueVerifyList venueId={venueId} token={token} specials={venueSpecials} />
    </main>
  );
}
```

- [ ] **Step 3: Write the client list component**

```typescript
// components/VenueVerifyList.tsx
"use client";

import { useState } from "react";

interface VerifySpecial {
  id: number;
  title: string;
  description: string | null;
  venueConfirmedAt: Date | null;
}

export function VenueVerifyList({
  venueId,
  token,
  specials,
}: {
  venueId: number;
  token: string;
  specials: VerifySpecial[];
}) {
  const [confirmed, setConfirmed] = useState<Set<number>>(
    new Set(specials.filter((s) => s.venueConfirmedAt !== null).map((s) => s.id))
  );
  const [pending, setPending] = useState<number | null>(null);

  async function confirm(specialId: number) {
    setPending(specialId);
    try {
      const res = await fetch("/api/venue-verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, token, specialId }),
      });
      if (res.ok) setConfirmed((prev) => new Set(prev).add(specialId));
    } finally {
      setPending(null);
    }
  }

  if (specials.length === 0) {
    return <p className="text-sm text-muted">No active specials listed right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-3 w-full max-w-md">
      {specials.map((s) => (
        <li key={s.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{s.title}</p>
            {s.description && <p className="text-xs text-muted">{s.description}</p>}
          </div>
          <button
            onClick={() => confirm(s.id)}
            disabled={confirmed.has(s.id) || pending === s.id}
            className="press-pill shrink-0 rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {confirmed.has(s.id) ? "✓ Confirmed" : pending === s.id ? "…" : "Yes, this is accurate"}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`. Manually generate a token via the Task 2 test-script pattern for a real venue id in your local/dev database, visit `/verify/{venueId}-{token}`, click confirm on a special, and confirm the response is 200 and `venueConfirmedAt` is set in the database for that row.

- [ ] **Step 5: Commit**

```bash
git add app/verify/ components/VenueVerifyList.tsx app/api/venue-verify/confirm/route.ts
git commit -m "Add venue verification page and confirm API route"
```

---

### Task 4: Wire the verify link into the outreach email

**Files:**
- Modify: `app/api/admin/outreach/send/route.ts`

**Interfaces:**
- Consumes: `buildVenueVerifyUrl` from Task 2.

- [ ] **Step 1: Add the verify link to `buildOutreachHtml`**

In `app/api/admin/outreach/send/route.ts`, add a new parameter to `buildOutreachHtml`'s signature (after `domain`):

```typescript
function buildOutreachHtml(
  venueName: string,
  venueId: number,
  unsubscribeUrl: string,
  mailingAddress: string,
  domain: string,
  verifyUrl: string
): string {
```

Replace the existing paragraph that says `"That's built from what I could find on your site, but I'd rather double-check with you..."` with:

```typescript
        <p style="margin:0 0 16px;">That's built from what I could find on your site, but I'd rather double-check with you
        than guess wrong.</p>
        <p style="margin:0 0 20px;">
          <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT_DIM};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Confirm your specials are accurate</a>
        </p>
        <p style="margin:0 0 16px;">If you've got specials or events that
        aren't on your website but you'd want people to know about, just reply here and I'll add
        them.</p>
```

- [ ] **Step 2: Pass the new URL at the call site**

In the `POST` handler, import `buildVenueVerifyUrl` from `@/lib/venue-verify`, and update the `buildOutreachHtml` call:

```typescript
  const verifyUrl = buildVenueVerifyUrl(venue.id, region.domain);
  const htmlBody = buildOutreachHtml(venue.name, venue.id, unsubscribeUrl, mailingAddress, region.domain, verifyUrl);
```

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck` — expect no new errors.

```bash
git add app/api/admin/outreach/send/route.ts
git commit -m "Add venue verification link to the outreach email"
```

---

### Task 5: Convert `/api/report` from email to DB-backed dispute logging

**Files:**
- Modify: `app/api/report/route.ts`

**Interfaces:**
- Consumes: `dealFeedback` table from Task 1.
- Produces: no change to the route's external contract (`POST /api/report` with `{ specialId, venueId, kind }`) — callers (`SpecialCard`, `SpecialRow`, `EventCard`, `EventRow`) need no changes.

- [ ] **Step 1: Replace the email send with a DB insert**

Replace the full contents of `app/api/report/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, events, venues, dealFeedback } from "@/db";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

const reportSchema = z.object({
  specialId: z.number().int().positive(),
  venueId: z.number().int().positive().nullable(),
  kind: z.enum(["special", "event"]).default("special"),
});

export async function POST(req: NextRequest) {
  const { ok: withinLimit } = await checkRateLimit(req, "report", 10, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many reports, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { specialId, kind } = parsed.data;

  // Confirm the target actually exists before logging a dispute against it -- an
  // invalid specialId (typo, stale client, tampered request) shouldn't silently create
  // an orphaned feedback row that the admin queue then has to render around.
  const rows =
    kind === "event"
      ? await db.select({ id: events.id }).from(events).where(eq(events.id, specialId)).limit(1)
      : await db.select({ id: specials.id }).from(specials).where(eq(specials.id, specialId)).limit(1);

  if (!rows[0]) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: specialId, kind, feedbackType: "dispute" });

  return NextResponse.json({ ok: true });
}
```

Note: `venues` and `sql` are no longer used by this route now that it doesn't build an email-notification message — remove those two now-unused imports (already done in the replacement above; do not leave `import { db, specials, events, venues } from "@/db";` with an unused `venues`).

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck` — expect no new errors, and confirm `lib/brevo.ts`'s `sendReportEmail` (now possibly unused) doesn't cause a lint/type failure — it's fine to leave that function defined and simply unused, since other functions in `lib/brevo.ts` may still reference shared code there; do not delete `sendReportEmail` itself, only stop calling it from this route.

```bash
git add app/api/report/route.ts
git commit -m "Log disputes to deal_feedback instead of emailing on every report"
```

---

### Task 6: New confirm API route for visitors

**Files:**
- Create: `app/api/specials/[id]/confirm/route.ts`

**Interfaces:**
- Consumes: `dealFeedback` table from Task 1, `checkRateLimit` from `lib/request-rate-limit.ts`.

- [ ] **Step 1: Write the route**

```typescript
// app/api/specials/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, specials, dealFeedback } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // A distinct rate-limit "route" per special, using the same checkRateLimit helper
  // every other endpoint on this site already uses -- gives a natural per-IP,
  // per-special cap with no new fingerprinting logic.
  const { ok: withinLimit } = await checkRateLimit(req, `special-confirm-${specialId}`, 3, 60 * 24);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many confirmations, try again later" }, { status: 429 });
  }

  const [row] = await db.select({ id: specials.id }).from(specials).where(eq(specials.id, specialId)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: specialId, kind: "special", feedbackType: "confirm" });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck` — expect no new errors.

```bash
git add app/api/specials/
git commit -m "Add visitor confirm API route for specials"
```

---

### Task 7: Surface `venueConfirmedAt` and visitor confirm counts in `lib/data.ts`

**Files:**
- Modify: `lib/data.ts`

**Interfaces:**
- Consumes: `specials.venueConfirmedAt` from Task 1, `dealFeedback` from Task 1.
- Produces: `SpecialWithVenue.venueConfirmedAt: Date | null`, `SpecialWithVenue.confirmCount: number` — consumed by Task 8's UI changes.

- [ ] **Step 1: Extend the shared interface and query columns**

In `lib/data.ts`, add to the `SpecialWithVenue` interface (after `venuePartnerSince`):

```typescript
  venueConfirmedAt: Date | null;
  // Count of visitor "confirm" feedback rows from the last 30 days -- a rolling window
  // so an old special's count doesn't just accumulate forever and lose meaning. See
  // docs/superpowers/specs/2026-09-07-deal-verification-design.md Section 1.
  confirmCount: number;
```

Add `dealFeedback` to the existing `import { db, specials, venues } from "@/db";` line, making it `import { db, specials, venues, dealFeedback } from "@/db";`, and add `sql` if not already imported (it already is, per the existing `notExists` subquery in this file).

Add these two entries to `baseColumns` (after `venuePartnerSince: venues.partnerSince,`):

```typescript
  venueConfirmedAt: specials.venueConfirmedAt,
  confirmCount: sql<number>`(
    select count(*)::int from specials.deal_feedback
    where item_id = ${specials.id} and kind = 'special' and feedback_type = 'confirm'
      and created_at > now() - interval '30 days'
  )`,
```

This single change applies to all three functions that already spread `baseColumns` (`getAllSpecialsWithVenue`, `getMonthlySpecials`, `getPreviousSpecials`), since they all select from `baseColumns` directly.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If a `dealFeedback` import path error appears, confirm Task 1's migration/schema change landed and `db/index.ts` re-exports it (it does, via the existing `export * from "./schema"`).

- [ ] **Step 3: Commit**

```bash
git add lib/data.ts
git commit -m "Surface venueConfirmedAt and visitor confirm counts on specials"
```

---

### Task 8: Add confirm button and badges to `SpecialCard` and `SpecialRow`

**Files:**
- Modify: `components/SpecialCard.tsx`
- Modify: `components/SpecialRow.tsx`
- Create: `components/ConfirmedBadges.tsx`

**Interfaces:**
- Consumes: `SpecialWithVenue.venueConfirmedAt`/`confirmCount` from Task 7.

- [ ] **Step 1: Write the shared badge component**

```typescript
// components/ConfirmedBadges.tsx
export function ConfirmedBadges({
  venueConfirmedAt,
  confirmCount,
}: {
  venueConfirmedAt: Date | null;
  confirmCount: number;
}) {
  if (!venueConfirmedAt && confirmCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {venueConfirmedAt && (
        <span className="stamp px-2 py-0.5 text-[10px]">✓ Confirmed by venue</span>
      )}
      {confirmCount > 0 && (
        <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen">
          Confirmed by {confirmCount} visitor{confirmCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `SpecialCard`**

In `components/SpecialCard.tsx`, add the import: `import { ConfirmedBadges } from "./ConfirmedBadges";`

Add confirm-button state alongside the existing `reportState`:

```typescript
  const [confirmState, setConfirmState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleConfirm() {
    setConfirmState("sending");
    try {
      const res = await fetch(`/api/specials/${special.id}/confirm`, { method: "POST" });
      setConfirmState(res.ok ? "sent" : "error");
    } catch {
      setConfirmState("error");
    }
  }
```

In the JSX, inside the existing `<div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-border">` block, replace:

```jsx
        <VerifiedBadge lastVerifiedAt={special.lastVerifiedAt} />
```

with:

```jsx
        <div className="flex flex-col gap-1">
          <VerifiedBadge lastVerifiedAt={special.lastVerifiedAt} />
          <ConfirmedBadges venueConfirmedAt={special.venueConfirmedAt} confirmCount={special.confirmCount} />
        </div>
```

And add a confirm button right before the existing `<button onClick={handleReport} ...>` button, inside the same flex row (wrap both buttons in a `<div className="flex items-center gap-3">`):

```jsx
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={confirmState !== "idle"}
            className="relative z-10 text-xs text-evergreen hover:underline disabled:cursor-default"
          >
            {confirmState === "idle" && "Confirm this deal"}
            {confirmState === "sending" && "Sending…"}
            {confirmState === "sent" && "Thanks!"}
            {confirmState === "error" && "Failed — try again"}
          </button>
          <button
            onClick={handleReport}
            disabled={reportState !== "idle"}
            className="relative z-10 text-xs text-muted-2 hover:text-muted disabled:cursor-default"
          >
            {reportState === "idle" && "Report incorrect"}
            {reportState === "sending" && "Sending…"}
            {reportState === "sent" && "Reported"}
            {reportState === "error" && "Failed — try again"}
          </button>
        </div>
```

- [ ] **Step 3: Wire it into `SpecialRow`**

Apply the identical pattern to `components/SpecialRow.tsx`: add the `ConfirmedBadges` import, the `confirmState` state + `handleConfirm` function (identical to Step 2's), and in the JSX's bottom row (the `<div className="flex items-center justify-between mt-1">` block), add the confirm button next to the existing report button the same way, and render `<ConfirmedBadges venueConfirmedAt={special.venueConfirmedAt} confirmCount={special.confirmCount} />` somewhere in that row (e.g. replacing the `<span />` placeholder currently rendered when `!stale`).

- [ ] **Step 4: Verify locally**

Run: `npm run dev`, open the homepage, click "Confirm this deal" on a special, refresh, and confirm the "Confirmed by 1 visitor" badge now appears.

- [ ] **Step 5: Commit**

```bash
git add components/SpecialCard.tsx components/SpecialRow.tsx components/ConfirmedBadges.tsx
git commit -m "Add confirm button and confirmation badges to special cards"
```

---

### Task 9: Admin "Flagged specials" queue

**Files:**
- Create: `lib/flagged-data.ts`
- Create: `app/admin/flagged/page.tsx`
- Create: `components/FlaggedSpecialsPanel.tsx`
- Create: `app/api/admin/flagged/[id]/route.ts`
- Modify: `components/AdminNav.tsx`
- Modify: `components/AdminShell.tsx`
- Modify: `lib/admin-counts.ts`

**Interfaces:**
- Consumes: `dealFeedback`, `specials`, `venues` from `@/db`.
- Produces: `getFlaggedSpecials(): Promise<FlaggedSpecial[]>`, `flaggedCount` added to `getAdminNavCounts()`'s return shape.

- [ ] **Step 1: Write the data query**

```typescript
// lib/flagged-data.ts
import { db, specials, venues, dealFeedback } from "@/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

export interface FlaggedSpecial {
  id: number;
  title: string;
  venueName: string;
  disputeCount: number;
}

export async function getFlaggedSpecials(): Promise<FlaggedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      title: specials.title,
      venueName: venues.name,
      disputeCount: sql<number>`count(${dealFeedback.id})::int`,
    })
    .from(dealFeedback)
    .innerJoin(specials, eq(specials.id, dealFeedback.itemId))
    .innerJoin(venues, eq(venues.id, specials.venueId))
    .where(and(eq(dealFeedback.kind, "special"), eq(dealFeedback.feedbackType, "dispute"), isNull(specials.archivedAt)))
    .groupBy(specials.id, specials.title, venues.name)
    .orderBy(desc(sql`count(${dealFeedback.id})`));

  return rows;
}
```

- [ ] **Step 2: Write the admin API route (archive / dismiss)**

```typescript
// app/api/admin/flagged/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, dealFeedback } from "@/db";
import { eq, and } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const actionSchema = z.object({ action: z.enum(["archive", "dismiss"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "archive") {
    await db.update(specials).set({ archivedAt: new Date() }).where(eq(specials.id, specialId));
  }
  // Both "archive" and "dismiss" clear the dispute rows -- archiving a special
  // that's already flagged shouldn't leave it re-appearing in the queue if it's
  // ever manually unarchived later, and "dismiss" is explicitly "I looked, it's fine."
  await db.delete(dealFeedback).where(and(eq(dealFeedback.itemId, specialId), eq(dealFeedback.kind, "special"), eq(dealFeedback.feedbackType, "dispute")));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Write the admin panel component**

```typescript
// components/FlaggedSpecialsPanel.tsx
"use client";

import { useState } from "react";
import type { FlaggedSpecial } from "@/lib/flagged-data";
import { useRouter } from "next/navigation";

export function FlaggedSpecialsPanel({ flagged }: { flagged: FlaggedSpecial[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function act(id: number, action: "archive" | "dismiss") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/flagged/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (flagged.length === 0) {
    return <p className="text-sm text-muted">No flagged specials right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {flagged.map((f) => (
        <li key={f.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{f.title}</p>
            <p className="text-xs text-muted">
              {f.venueName} — flagged {f.disputeCount} time{f.disputeCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => act(f.id, "dismiss")}
              disabled={busyId === f.id}
              className="press-pill rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              onClick={() => act(f.id, "archive")}
              disabled={busyId === f.id}
              className="press-pill rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Write the admin page**

```typescript
// app/admin/flagged/page.tsx
import { AdminShell } from "@/components/AdminShell";
import { FlaggedSpecialsPanel } from "@/components/FlaggedSpecialsPanel";
import { getFlaggedSpecials } from "@/lib/flagged-data";

export const dynamic = "force-dynamic";

export default async function AdminFlaggedPage() {
  const flagged = await getFlaggedSpecials();

  return (
    <AdminShell active="flagged" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Flagged specials</h1>
      <FlaggedSpecialsPanel flagged={flagged} />
    </AdminShell>
  );
}
```

- [ ] **Step 5: Add the nav entry and badge count**

In `lib/admin-counts.ts`, replace the full contents with:

```typescript
import { db, submissions, inboundEmails, dealFeedback } from "@/db";
import { and, count, eq } from "drizzle-orm";

// Cheap, count-only queries for the admin nav badges -- deliberately not reusing
// getInboxThreads()/the submissions page's full row query, which both join and
// shape far more data than a badge needs.
export async function getAdminNavCounts(): Promise<{
  pendingSubmissions: number;
  unreadInbox: number;
  flaggedCount: number;
}> {
  const [[submissionRow], [inboxRow], [flaggedRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.status, "needs_review"))),
    db.select({ n: count() }).from(inboundEmails).where(eq(inboundEmails.read, false)),
    db.select({ n: count() }).from(dealFeedback).where(eq(dealFeedback.feedbackType, "dispute")),
  ]);
  return {
    pendingSubmissions: submissionRow?.n ?? 0,
    unreadInbox: inboxRow?.n ?? 0,
    flaggedCount: flaggedRow?.n ?? 0,
  };
}
```

Note: `flaggedCount` here counts individual dispute rows, not distinct flagged specials — a simple, cheap count consistent with the other two badges, which also count rows rather than distinct grouped entities. This is intentionally a coarser number than `getFlaggedSpecials()`'s per-special breakdown; good enough for a nav badge.

In `components/AdminNav.tsx`:
- Change the `AdminSection` type (line 7) to: `type AdminSection = "submissions" | "outreach" | "inbox" | "sponsored" | "revenue" | "analytics" | "flagged";`
- Add `flaggedCount` to the destructured props and the props type object (alongside `unreadInbox`).
- Add one entry to the `items` array (after the `"analytics"` entry): `{ key: "flagged", href: "/admin/flagged", label: "Flagged", badge: flaggedCount, tone: "accent" },`

In `components/AdminShell.tsx`:
- Change the `active` prop's type union (line 14) to include `"flagged"`.
- Destructure `flaggedCount` from `getAdminNavCounts()`'s return (update the line `const [{ pendingSubmissions, unreadInbox }, regionRows, selectedRegionId] = ...` to `const [{ pendingSubmissions, unreadInbox, flaggedCount }, regionRows, selectedRegionId] = ...`).
- Pass `flaggedCount={flaggedCount}` to `<AdminNav ... />`.

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck` — expect no errors.

Run: `npm run dev`, log into `/admin`, confirm a "Flagged" nav pill appears, and that clicking "Report incorrect" on a live special (from Task 5's route) makes it appear in `/admin/flagged` with a dispute count of 1. Click "Dismiss" and confirm it disappears from the queue.

```bash
git add lib/flagged-data.ts app/admin/flagged/ components/FlaggedSpecialsPanel.tsx app/api/admin/flagged/ components/AdminNav.tsx components/AdminShell.tsx lib/admin-counts.ts
git commit -m "Add admin Flagged specials queue"
```
