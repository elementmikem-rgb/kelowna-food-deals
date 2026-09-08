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
