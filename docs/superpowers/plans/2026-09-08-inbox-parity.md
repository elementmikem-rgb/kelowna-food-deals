# Admin Inbox Feature Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the admin inbox up to Photaro-inbox parity: inline archive/delete, bulk actions, a status filter, mark unread, forward, block sender, in-app unsubscribe, and full email-attachment support.

**Architecture:** One schema migration (a soft-delete `archivedAt` column, a `blockedSenders` table, an `emailAttachments` table storing base64 like this project's existing image tables). The Brevo inbound webhook gains a blocked-sender check and an attachment-fetch step. `lib/inbox-data.ts` surfaces archived status and attachments per thread/message. A handful of small new admin API routes (archive, delete, block, unsubscribe) plus an extended mark-read route. The list and thread UI components get the new controls; Forward reuses the existing `/api/admin/inbox/send` route rather than adding a new one.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + Postgres, Zod, Brevo transactional/inbound email API.

**Spec:** `docs/superpowers/specs/2026-09-08-inbox-parity-design.md`

## Global Constraints

- No external blob storage (B2/S3) — attachments are base64 text in Postgres, matching `submissions.photoData`/`venuePhotos.photoData`'s existing pattern.
- A blocked sender's future mail is still recorded (never silently dropped) but pre-archived.
- Attachments over 4MB are skipped (logged, not fatal to the webhook) — matches `app/api/submit/route.ts`'s `MAX_PHOTO_BYTES` cap.
- Thread-level actions (archive/delete/mark-unread) apply to every inbound message in the thread at once, never just the newest one.
- No separate "Sent" tab, no Photaro-style flat pagination — Kelowna's unified per-thread view stays as-is.
- Retroactive attachment backfill for already-existing `inboundEmails` rows is out of scope — only new mail gets attachments from this point forward.

---

### Task 1: Schema — `archivedAt`, `blockedSenders`, `emailAttachments`

**Files:**
- Modify: `db/schema.ts`
- Create (generated): a new file under `db/migrations/`

**Interfaces:**
- Produces: `inboundEmails.archivedAt` (nullable timestamp), `blockedSenders` table (Drizzle export `blockedSenders`, columns `id, email, blockedAt`), `emailAttachments` table (Drizzle export `emailAttachments`, columns `id, inboundEmailId, fileName, contentType, fileData, sizeBytes`).

- [ ] **Step 1: Add `archivedAt` to `inboundEmails`**

In `db/schema.ts`, inside the `inboundEmails` table definition (around line 108), add this field after `read`:

```typescript
  archivedAt: timestamp("archived_at", { withTimezone: true }), // null = active/inbox
```

- [ ] **Step 2: Add the `blockedSenders` table**

Add near the bottom of `db/schema.ts`, after the `inboundEmails` table:

```typescript
// Keyed by email, not venueId -- an inboundEmails row's venueId can be null
// (no match found; see app/api/webhooks/brevo-inbound/[token]/route.ts's
// fallback matching), so blocking has to work by address alone.
export const blockedSenders = specialsSchema.table("blocked_senders", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Add the `emailAttachments` table**

```typescript
// Base64-encoded, following this project's existing pattern for stored
// images (submissions.photoData, venuePhotos.photoData) rather than
// introducing external blob storage for a low-volume admin inbox.
export const emailAttachments = specialsSchema.table("email_attachments", {
  id: serial("id").primaryKey(),
  inboundEmailId: integer("inbound_email_id")
    .notNull()
    .references(() => inboundEmails.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileData: text("file_data").notNull(), // base64
  sizeBytes: integer("size_bytes").notNull(),
});
```

- [ ] **Step 4: Generate and apply the migration**

Run: `npx drizzle-kit generate`
Expected: a new SQL file adding the nullable `archived_at` column to `inbound_emails`, and creating `blocked_senders` and `email_attachments`. Read the generated SQL to confirm it touches nothing else.

Run: `npx drizzle-kit migrate` (production `DATABASE_URL`, same as every other migration this project applies directly)
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "Add archivedAt, blockedSenders, and emailAttachments for inbox parity"
```

---

### Task 2: Brevo webhook — blocked-sender check and attachment fetch

**Files:**
- Modify: `app/api/webhooks/brevo-inbound/[token]/route.ts`

**Interfaces:**
- Consumes: `blockedSenders`, `emailAttachments` from Task 1.
- Produces: newly-arriving inbound mail from a blocked sender is inserted pre-archived; attachments on any newly-arriving mail are fetched and stored.

- [ ] **Step 1: Add the blocked-sender check**

In `app/api/webhooks/brevo-inbound/[token]/route.ts`, add `blockedSenders` to the existing `import { db, inboundEmails, outreachSends, venues } from "@/db";` line. After the `fromEmail` extraction (around the existing `if (!fromEmail) continue;` check), add:

```typescript
    const [blocked] = await db
      .select({ id: blockedSenders.id })
      .from(blockedSenders)
      .where(eq(blockedSenders.email, fromEmail))
      .limit(1);
```

Then in the final `db.insert(inboundEmails).values({...})` call, add `archivedAt: blocked ? new Date() : null,` to the values object.

- [ ] **Step 2: Add the attachment interface and fetch logic**

Add `Attachments` to the `BrevoInboundItem` interface:

```typescript
interface BrevoInboundItem {
  MessageId?: string;
  InReplyTo?: string;
  From?: { Address?: string; Name?: string };
  Subject?: string;
  RawTextBody?: string;
  RawHtmlBody?: string;
  Attachments?: { Name: string; ContentType: string; ContentLength: number; DownloadToken: string }[];
}
```

Add this constant near the top of the file (matching `app/api/submit/route.ts`'s existing cap):

```typescript
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4MB, matches app/api/submit/route.ts's MAX_PHOTO_BYTES
```

Add this function (module-level, after the interface):

```typescript
async function fetchAndStoreAttachments(inboundEmailId: number, attachments: BrevoInboundItem["Attachments"]) {
  if (!attachments || attachments.length === 0) return;
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  for (const att of attachments) {
    try {
      if (att.ContentLength > MAX_ATTACHMENT_BYTES) {
        console.error(`Skipping oversized attachment "${att.Name}": ${att.ContentLength} bytes`);
        continue;
      }
      const res = await fetch(`https://api.brevo.com/v3/inbound/attachments/${att.DownloadToken}`, {
        headers: { "api-key": apiKey },
      });
      if (!res.ok) {
        console.error(`Failed to fetch attachment "${att.Name}": HTTP ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await db.insert(emailAttachments).values({
        inboundEmailId,
        fileName: att.Name,
        contentType: att.ContentType,
        fileData: buffer.toString("base64"),
        sizeBytes: buffer.length,
      });
    } catch (err) {
      console.error(`Error fetching attachment "${att.Name}":`, err instanceof Error ? err.message : err);
    }
  }
}
```

- [ ] **Step 3: Call the attachment fetcher after each insert**

Change the final insert to capture the returned row, then call the fetcher:

```typescript
    const [inserted] = await db
      .insert(inboundEmails)
      .values({
        venueId,
        brevoMessageId: messageId,
        inReplyTo,
        fromEmail,
        fromName: item.From?.Name ?? null,
        subject: item.Subject ?? null,
        textBody: item.RawTextBody ?? null,
        htmlBody: item.RawHtmlBody ?? null,
        archivedAt: blocked ? new Date() : null,
      })
      .returning({ id: inboundEmails.id });

    await fetchAndStoreAttachments(inserted.id, item.Attachments);
```

- [ ] **Step 4: Verify the oversized-attachment skip with a throwaway script**

This logic is easy to get subtly wrong (e.g. comparing the wrong field, an inverted condition) and won't be exercised by normal manual testing since a real 4MB+ email attachment is awkward to generate by hand. Write and run a throwaway script that calls `fetchAndStoreAttachments` directly against fake data:

```javascript
// scripts/tmp-test-attachment-cap.mjs
import "dotenv/config";
const { db, emailAttachments, inboundEmails } = await import("../db/index.ts");
const { eq } = await import("drizzle-orm");

// Insert a throwaway inbound row to attach to.
const [row] = await db
  .insert(inboundEmails)
  .values({ fromEmail: "tmp-attachment-test@example.com", subject: "tmp test" })
  .returning({ id: inboundEmails.id });

// Import the function under test. It's not exported today -- temporarily add
// `export` to `async function fetchAndStoreAttachments` in
// app/api/webhooks/brevo-inbound/[token]/route.ts before running this script,
// then remove the `export` again afterward (Next.js route files only export
// HTTP method handlers; this is a one-off test-only exception, not a
// permanent change).
const { fetchAndStoreAttachments } = await import("../app/api/webhooks/brevo-inbound/[token]/route.ts");

await fetchAndStoreAttachments(row.id, [
  { Name: "too-big.jpg", ContentType: "image/jpeg", ContentLength: 5 * 1024 * 1024, DownloadToken: "fake-token-never-fetched" },
]);

const stored = await db.select().from(emailAttachments).where(eq(emailAttachments.inboundEmailId, row.id));
if (stored.length !== 0) throw new Error(`FAIL: oversized attachment was stored anyway (${stored.length} rows)`);
console.log("PASS: oversized attachment correctly skipped, no fetch attempted");

await db.delete(inboundEmails).where(eq(inboundEmails.id, row.id));
```

Run: `npx tsx scripts/tmp-test-attachment-cap.mjs`
Expected: `PASS: oversized attachment correctly skipped, no fetch attempted`

Delete the script after it passes, and remove the temporary `export` keyword from `fetchAndStoreAttachments` if you added one.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expect no new errors.

```bash
git add app/api/webhooks/brevo-inbound/
git commit -m "Fetch and store email attachments, pre-archive mail from blocked senders"
```

---

### Task 3: Attachment serve route

**Files:**
- Create: `app/api/admin/inbox/attachments/[id]/route.ts`

**Interfaces:**
- Consumes: `emailAttachments` from Task 1.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, emailAttachments } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(emailAttachments)
    .where(eq(emailAttachments.id, attachmentId))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = Buffer.from(row.fileData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": row.contentType,
      "Content-Disposition": `inline; filename="${row.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck` — expect no new errors.

```bash
git add app/api/admin/inbox/attachments/
git commit -m "Add authenticated route to serve stored email attachments"
```

---

### Task 4: `lib/inbox-data.ts` — archived status and attachments

**Files:**
- Modify: `lib/inbox-data.ts`

**Interfaces:**
- Consumes: `inboundEmails.archivedAt`, `emailAttachments` from Task 1.
- Produces: `InboxThread.archived: boolean`, `ThreadMessage.attachments: { id: number; fileName: string; contentType: string; sizeBytes: number }[]`.

- [ ] **Step 1: Add `archived` to `InboxThread` and thread computation**

Add `archivedAt: inboundEmails.archivedAt` to the existing `inbound` query's `.select({...})` block in `getInboxThreads`.

Add `archived: boolean;` to the `InboxThread` interface (after `unreadCount`).

In the `for (const e of inbound)` loop, when creating a new thread entry, add `archived: e.archivedAt !== null,`. In the `else` branch (existing thread), when `isNewest` is true, also update `existing.archived = e.archivedAt !== null;` — the thread's archived status always tracks its most recently received inbound message, and since Section 6 of the spec keeps every message in a thread in sync when archiving/unarchiving, this is equivalent to "all archived" in practice.

- [ ] **Step 2: Add `attachments` to `ThreadMessage` and `getThreadMessages`**

Add `attachments: { id: number; fileName: string; contentType: string; sizeBytes: number }[];` to the `ThreadMessage` interface.

Add `emailAttachments` to the existing `import { db, outreachSends, inboundEmails, venues } from "@/db";` line.

In `getThreadMessages`, both branches (`key.startsWith("v")` and `key.startsWith("u")`) build their `inbound` array the same way. In both places, after fetching `inbound`, fetch attachments for those rows in one query and attach them:

```typescript
    const inboundIds = inbound.map((e) => e.id);
    const attachmentRows = inboundIds.length > 0
      ? await db
          .select({
            id: emailAttachments.id,
            inboundEmailId: emailAttachments.inboundEmailId,
            fileName: emailAttachments.fileName,
            contentType: emailAttachments.contentType,
            sizeBytes: emailAttachments.sizeBytes,
          })
          .from(emailAttachments)
          .where(inArray(emailAttachments.inboundEmailId, inboundIds))
      : [];
    const attachmentsByEmail = new Map<number, typeof attachmentRows>();
    for (const a of attachmentRows) {
      const list = attachmentsByEmail.get(a.inboundEmailId) ?? [];
      list.push(a);
      attachmentsByEmail.set(a.inboundEmailId, list);
    }
```

Add `inArray` to the existing `import { and, eq, isNull } from "drizzle-orm";` line, making it `import { and, eq, isNull, inArray } from "drizzle-orm";`.

Then in each branch's `...inbound.map((e) => ({...}))` block that builds `ThreadMessage` objects, add `attachments: attachmentsByEmail.get(e.id) ?? [],` to each mapped object.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. `components/InboxThread.tsx` will now show a type error because its local `Message` interface doesn't have `attachments` yet — that's expected and fixed in Task 7. Confirm no *other* unrelated errors appear.

- [ ] **Step 4: Commit**

```bash
git add lib/inbox-data.ts
git commit -m "Surface archived status and attachments in inbox data layer"
```

---

### Task 5: New admin API routes — archive, delete, block, unsubscribe, and extended mark-read

**Files:**
- Create: `app/api/admin/inbox/archive/route.ts`
- Create: `app/api/admin/inbox/delete/route.ts`
- Create: `app/api/admin/inbox/block/route.ts`
- Create: `app/api/admin/inbox/unsubscribe/route.ts`
- Modify: `app/api/admin/inbox/mark-read/route.ts`

**Interfaces:**
- Consumes: `blockedSenders`, `inboundEmails.archivedAt` from Task 1.
- Produces: `POST /api/admin/inbox/archive` `{ ids: number[], archived: boolean }`, `POST /api/admin/inbox/delete` `{ ids: number[] }`, `POST /api/admin/inbox/block` `{ emails: string[] }`, `POST /api/admin/inbox/unsubscribe` `{ venueId: number }`, `POST /api/admin/inbox/mark-read` `{ ids: number[], read: boolean }` (extended from the existing always-true behavior).

- [ ] **Step 1: Archive/unarchive route (toggle, supports bulk)**

```typescript
// app/api/admin/inbox/archive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { inArray } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const archiveSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  archived: z.boolean(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = archiveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await db
    .update(inboundEmails)
    .set({ archivedAt: parsed.data.archived ? new Date() : null })
    .where(inArray(inboundEmails.id, parsed.data.ids));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Delete route (hard delete, supports bulk)**

```typescript
// app/api/admin/inbox/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { inArray } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const deleteSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // ON DELETE CASCADE on email_attachments.inbound_email_id (Task 1) means
  // this also removes any attachments on the deleted messages.
  await db.delete(inboundEmails).where(inArray(inboundEmails.id, parsed.data.ids));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Block-sender route**

```typescript
// app/api/admin/inbox/block/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, blockedSenders } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";

const blockSchema = z.object({ emails: z.array(z.string().email()).min(1).max(20) });

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = blockSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  for (const email of parsed.data.emails) {
    await db
      .insert(blockedSenders)
      .values({ email: email.toLowerCase().trim() })
      .onConflictDoNothing({ target: blockedSenders.email });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Unsubscribe route**

```typescript
// app/api/admin/inbox/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const unsubscribeSchema = z.object({ venueId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await db.update(venues).set({ unsubscribedAt: new Date() }).where(eq(venues.id, parsed.data.venueId));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Extend mark-read to a read/unread toggle**

Replace the full contents of `app/api/admin/inbox/mark-read/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { inArray } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const markReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  read: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = markReadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await db.update(inboundEmails).set({ read: parsed.data.read }).where(inArray(inboundEmails.id, parsed.data.ids));
  return NextResponse.json({ ok: true });
}
```

This is backward-compatible: the existing call site in `components/InboxThread.tsx` (`{ ids: unreadIds }`, no `read` field) still works because `read` defaults to `true` via `.default(true)`.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck` — expect no new errors.

```bash
git add app/api/admin/inbox/archive/ app/api/admin/inbox/delete/ app/api/admin/inbox/block/ app/api/admin/inbox/unsubscribe/ app/api/admin/inbox/mark-read/route.ts
git commit -m "Add archive, delete, block-sender, and unsubscribe admin inbox routes"
```

---

### Task 6: List view — filter, inline actions, bulk select

**Files:**
- Modify: `components/InboxThreadList.tsx`
- Modify: `app/admin/inbox/page.tsx`

**Interfaces:**
- Consumes: `InboxThread.archived` from Task 4, `/api/admin/inbox/archive` and `/api/admin/inbox/delete` from Task 5.

- [ ] **Step 1: Pass `archived` through from the page**

In `app/admin/inbox/page.tsx`, the existing `threads.map((t) => ({ ...t, lastAt: t.lastAt.toISOString() }))` call already spreads every field on `t`, so `archived` (added to `InboxThread` in Task 4) passes through automatically — no change needed here beyond confirming this (open the file, verify the spread is unconditional, which it is).

- [ ] **Step 2: Add `archived` to `InboxThreadList`'s local type and default-exclude it**

In `components/InboxThreadList.tsx`, add `archived: boolean;` to the local `ThreadRow` interface. Add a `statusFilter` state:

```typescript
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "archived">("all");
```

Replace the existing `filtered` computation:

```typescript
  const filtered = threads
    .filter((t) => {
      if (statusFilter === "archived") return t.archived;
      if (statusFilter === "unread") return !t.archived && t.unreadCount > 0;
      return !t.archived; // "all" still excludes archived -- Archive means "out of my way"
    })
    .filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.displayName.toLowerCase().includes(q) ||
        (t.contactEmail ?? "").toLowerCase().includes(q) ||
        t.lastSnippet.toLowerCase().includes(q)
      );
    });
```

- [ ] **Step 3: Add the filter dropdown next to the search box**

Replace the existing search `<input>` block with a flex row containing both:

```jsx
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "unread" | "archived")}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="archived">Archived</option>
        </select>
      </div>
```

- [ ] **Step 4: Add bulk-select state and a selection action bar**

Add state and a toggle function:

```typescript
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Thread keys aren't inboundEmails ids -- bulk actions need the actual row
  // ids, which the thread list doesn't carry. Bulk archive/delete operate on
  // whichever venueId/email each selected thread key resolves to server-side
  // is not available here, so this fetches the same "mark whole thread" idea
  // via a dedicated bulk route scoped by thread key instead of raw ids.
  async function bulkAction(action: "archive" | "unarchive" | "delete") {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [...selected], action }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }
```

This introduces a need for a bulk-by-thread-key route not yet built. Add it now:

Create `app/api/admin/inbox/bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { eq, isNull, and } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const bulkSchema = z.object({
  keys: z.array(z.string()).min(1).max(200),
  action: z.enum(["archive", "unarchive", "delete"]),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  for (const key of parsed.data.keys) {
    const condition = key.startsWith("v")
      ? eq(inboundEmails.venueId, Number(key.slice(1)))
      : and(isNull(inboundEmails.venueId), eq(inboundEmails.fromEmail, decodeURIComponent(key.slice(1))));
    if (!condition) continue;

    if (parsed.data.action === "delete") {
      await db.delete(inboundEmails).where(condition);
    } else {
      await db
        .update(inboundEmails)
        .set({ archivedAt: parsed.data.action === "archive" ? new Date() : null })
        .where(condition);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Wire the bulk action bar and per-row checkboxes into the JSX**

Add a "Select all shown" checkbox and action bar above the list, and a checkbox + inline Archive/Delete buttons per row. Replace the existing `filtered.length === 0 ? ... : (<div className="flex flex-col divide-y ...">{filtered.map(...)}</div>)` block:

```jsx
      {filtered.length === 0 ? (
        <p className="text-muted-2 text-sm py-4 text-center">No conversations match &quot;{query}&quot;.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(filtered.map((t) => t.key)) : new Set())
                }
              />
              Select all shown
            </label>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => bulkAction(statusFilter === "archived" ? "unarchive" : "archive")}
                  disabled={busy}
                  className="press-pill rounded-full border border-border px-3 py-1 text-xs disabled:opacity-50"
                >
                  {statusFilter === "archived" ? "Unarchive" : "Archive"} ({selected.size})
                </button>
                <button
                  onClick={() => bulkAction("delete")}
                  disabled={busy}
                  className="press-pill rounded-full border border-danger/40 text-danger px-3 py-1 text-xs disabled:opacity-50"
                >
                  Delete ({selected.size})
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {filtered.map((t) => (
              <div key={t.key} className="flex items-start gap-2 px-4 py-3 hover:bg-accent-soft/20">
                <input
                  type="checkbox"
                  checked={selected.has(t.key)}
                  onChange={() => toggleSelected(t.key)}
                  className="mt-1"
                />
                <Link href={`/admin/inbox/t/${t.key}`} className="flex-1 flex items-start justify-between gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p
                      className={`text-sm ${t.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
                    >
                      {t.displayName}
                    </p>
                    <p className="text-xs text-muted-2 truncate max-w-[380px]">{t.lastSnippet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-2">
                      {new Date(t.lastAt).toLocaleDateString()}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="rounded-full bg-accent text-background text-[10px] font-medium px-1.5 py-0.5">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => bulkAction2(t.key, t.archived ? "unarchive" : "archive")}
                    className="text-[11px] text-muted hover:text-foreground px-2 py-1.5"
                  >
                    {t.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => bulkAction2(t.key, "delete")}
                    className="text-[11px] text-danger/80 hover:text-danger px-2 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
```

Add a single-row variant of the bulk action (reusing the same `/api/admin/inbox/bulk` route with one key):

```typescript
  async function bulkAction2(key: string, action: "archive" | "unarchive" | "delete") {
    setBusy(true);
    try {
      await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [key], action }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }
```

- [ ] **Step 6: Verify locally**

Run: `npm run dev`, log into `/admin/inbox`, confirm the filter dropdown and per-row Archive/Delete buttons render and work (archiving a thread makes it disappear from "All"/"Unread" and appear under "Archived"), and bulk-select + bulk archive/delete work across multiple selected rows.

- [ ] **Step 7: Commit**

```bash
git add components/InboxThreadList.tsx app/api/admin/inbox/bulk/
git commit -m "Add inbox list filter, inline archive/delete, and bulk actions"
```

---

### Task 7: Thread view — action bar, attachments, forward

**Files:**
- Modify: `components/InboxThread.tsx`

**Interfaces:**
- Consumes: `ThreadMessage.attachments` from Task 4, `/api/admin/inbox/archive`, `/api/admin/inbox/delete`, `/api/admin/inbox/block`, `/api/admin/inbox/unsubscribe`, `/api/admin/inbox/mark-read` (extended) from Task 5, and reuses the existing `/api/admin/inbox/send` route for Forward (no new send route).

- [ ] **Step 1: Add `attachments` to the local `Message` interface**

In `components/InboxThread.tsx`, add to the `Message` interface (after `inboundId`):

```typescript
  attachments: { id: number; fileName: string; contentType: string; sizeBytes: number }[];
```

- [ ] **Step 2: Add the action bar state and handlers**

Add these near the top of the component, alongside the existing `replyText`/`state` state:

```typescript
  const [actionBusy, setActionBusy] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const router = useRouter();

  const inboundIds = messages.filter((m) => m.inboundId !== null).map((m) => m.inboundId!);

  async function handleMarkUnread() {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      await fetch("/api/admin/inbox/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, read: false }),
      });
      router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleArchive(archived: boolean) {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      await fetch("/api/admin/inbox/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, archived }),
      });
      router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      await fetch("/api/admin/inbox/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds }),
      });
      router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUnsubscribe() {
    if (!venueId) return;
    setActionBusy(true);
    try {
      await fetch("/api/admin/inbox/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBlock() {
    // contactEmail (this component's own prop), not m.fromLabel -- fromLabel is
    // e.fromName ?? e.fromEmail in lib/inbox-data.ts, so for a sender with a
    // name on file it's a display name, not an address. contactEmail is
    // always the real address this thread is keyed to.
    if (!contactEmail) return;
    setActionBusy(true);
    try {
      await fetch("/api/admin/inbox/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [contactEmail] }),
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleForward() {
    if (!forwardTo.trim()) return;
    const original = [...messages].reverse().find((m) => m.direction === "inbound");
    if (!original) return;
    setActionBusy(true);
    try {
      const quoted = `${forwardNote ? forwardNote + "\n\n" : ""}---- Forwarded message ----\nFrom: ${original.fromLabel}\n\n${original.bodyText ?? ""}`;
      await fetch("/api/admin/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: null,
          toEmail: forwardTo.trim(),
          subject: original.subject?.startsWith("Fwd:") ? original.subject : `Fwd: ${original.subject ?? displayName}`,
          body: quoted,
        }),
      });
      setForwardOpen(false);
      setForwardTo("");
      setForwardNote("");
    } finally {
      setActionBusy(false);
    }
  }
```

Add `import { useRouter } from "next/navigation";` to the top of the file.

- [ ] **Step 3: Add the action bar JSX**

Insert this directly after the existing `<header>` block, before the messages list:

```jsx
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <button onClick={handleMarkUnread} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          Mark unread
        </button>
        <button onClick={() => handleArchive(true)} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          Archive
        </button>
        <button onClick={handleDelete} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
          Delete
        </button>
        <button onClick={() => setForwardOpen((v) => !v)} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          Forward
        </button>
        {venueId && (
          <button onClick={handleUnsubscribe} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
            Unsubscribe
          </button>
        )}
        <button onClick={handleBlock} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
          Block sender
        </button>
      </div>

      {forwardOpen && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <input
            type="email"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="Forward to email…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={forwardNote}
            onChange={(e) => setForwardNote(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={handleForward}
            disabled={actionBusy || !forwardTo.trim()}
            className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Send forward
          </button>
        </div>
      )}
```

- [ ] **Step 4: Render attachments on each message**

Inside the existing `messages.map((m) => (...))` block, after the body content (`{m.direction === "outbound" && ... : (...)}` block), add:

```jsx
            {m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {m.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/admin/inbox/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-accent-dim hover:underline"
                  >
                    {a.contentType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/admin/inbox/attachments/${a.id}`}
                        alt={a.fileName}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : null}
                    <span>
                      {a.fileName} ({Math.round(a.sizeBytes / 1024)}KB)
                    </span>
                  </a>
                ))}
              </div>
            )}
```

- [ ] **Step 5: Verify locally**

Run: `npm run dev`, open a thread in `/admin/inbox`, confirm the action bar renders, Mark unread/Archive/Delete/Block/Unsubscribe each work (check the DB directly for the expected column change after each), and Forward sends a real email (verify via a test address) with the original message quoted.

- [ ] **Step 6: Commit**

```bash
git add components/InboxThread.tsx
git commit -m "Add thread action bar, attachment display, and forward"
```
