import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboxThreadState, inboxThreadStatus } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { parseThreadKey } from "@/lib/inbox-thread-key";
import { buildStateUpsert } from "@/lib/inbox-state";

// Stars, snooze and status for one or more conversations. Upserts into inbox_thread_state, which has a row
// only for a conversation that has been touched. Fields left out of the body are left as they are.
const bodySchema = z
  .object({
    keys: z.array(z.string().min(2).max(300)).min(1).max(200),
    starred: z.boolean().optional(),
    snoozedUntil: z.string().datetime().nullable().optional(),
    status: z.enum(inboxThreadStatus).nullable().optional(),
  })
  .refine((b) => b.starred !== undefined || b.snoozedUntil !== undefined || b.status !== undefined, {
    message: "nothing to update",
  });

function validKey(key: string): boolean {
  try {
    return parseThreadKey(key) !== null;
  } catch {
    return false; // malformed %-encoding
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const { keys, ...patch } = parsed.data;
  const bad = keys.filter((k) => !validKey(k));
  if (bad.length > 0) {
    return NextResponse.json({ error: "invalid thread key", badKeys: bad }, { status: 400 });
  }

  const now = new Date();
  const failedKeys: string[] = [];
  for (const key of keys) {
    const { values, set } = buildStateUpsert(key, patch, now);
    try {
      await db.insert(inboxThreadState).values(values).onConflictDoUpdate({ target: inboxThreadState.threadKey, set });
    } catch (err) {
      console.error(`inbox state update failed for ${key}:`, err);
      failedKeys.push(key);
    }
  }
  if (failedKeys.length > 0) return NextResponse.json({ ok: false, failedKeys }, { status: 207 });
  return NextResponse.json({ ok: true });
}
