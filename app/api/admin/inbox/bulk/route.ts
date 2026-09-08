import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails, outreachSends } from "@/db";
import { eq, isNull, and } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const bulkSchema = z.object({
  keys: z.array(z.string()).min(1).max(200),
  action: z.enum(["archive", "unarchive", "delete"]),
});

// A malformed key (bad %-encoding, non-numeric venue id, unrecognized prefix)
// must not abort the rest of the batch -- returns null to signal "skip this
// key" instead of throwing mid-loop.
function keyToInboundCondition(key: string) {
  if (key.startsWith("v")) {
    const venueId = Number(key.slice(1));
    return Number.isInteger(venueId) ? eq(inboundEmails.venueId, venueId) : null;
  }
  if (!key.startsWith("u")) return null;
  try {
    const email = decodeURIComponent(key.slice(1));
    return and(isNull(inboundEmails.venueId), eq(inboundEmails.fromEmail, email));
  } catch {
    return null;
  }
}

function keyToSendsCondition(key: string) {
  if (key.startsWith("v")) {
    const venueId = Number(key.slice(1));
    return Number.isInteger(venueId) ? eq(outreachSends.venueId, venueId) : null;
  }
  if (!key.startsWith("u")) return null;
  try {
    const email = decodeURIComponent(key.slice(1));
    return and(isNull(outreachSends.venueId), eq(outreachSends.toEmail, email));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const failedKeys: string[] = [];

  for (const key of parsed.data.keys) {
    const condition = keyToInboundCondition(key);
    if (!condition) {
      failedKeys.push(key);
      continue;
    }

    try {
      if (parsed.data.action === "delete") {
        await db.delete(inboundEmails).where(condition);
        // getInboxThreads() also builds a thread entry from outreachSends
        // alone -- deleting only inboundEmails would leave the thread
        // reappearing with just its outbound copies. Hidden, not deleted --
        // see the comment in app/api/admin/inbox/delete/route.ts for why a
        // hard delete here would break the outreach "already sent" guard.
        const sendsCondition = keyToSendsCondition(key);
        if (sendsCondition) {
          await db.update(outreachSends).set({ hiddenFromInbox: true }).where(sendsCondition);
        }
      } else {
        await db
          .update(inboundEmails)
          .set({ archivedAt: parsed.data.action === "archive" ? new Date() : null })
          .where(condition);
      }
    } catch (err) {
      console.error(`bulk ${parsed.data.action} failed for key ${key}:`, err);
      failedKeys.push(key);
    }
  }

  if (failedKeys.length > 0) {
    return NextResponse.json({ ok: false, failedKeys }, { status: 207 });
  }
  return NextResponse.json({ ok: true });
}
