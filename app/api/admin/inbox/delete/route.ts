import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails, outreachSends } from "@/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const deleteSchema = z
  .object({
    // Empty when the thread has no inbound messages yet (outbound-only) --
    // still valid as long as venueId/contactEmail give something to delete.
    ids: z.array(z.number().int().positive()).max(200).default([]),
    // getInboxThreads() also builds a thread entry from outreachSends alone, so
    // deleting only inboundEmails leaves the thread reappearing with just the
    // outbound copies. Pass the thread's venueId/contactEmail so the matching
    // sends get removed too, matching what "Delete" looks like it does.
    venueId: z.number().int().positive().nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
  })
  .refine((v) => v.ids.length > 0 || v.venueId || v.contactEmail, {
    message: "nothing to delete",
  });

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { ids, venueId, contactEmail } = parsed.data;

  // ON DELETE CASCADE on email_attachments.inbound_email_id (Task 1) means
  // this also removes any attachments on the deleted messages.
  if (ids.length > 0) {
    await db.delete(inboundEmails).where(inArray(inboundEmails.id, ids));
  }

  if (venueId) {
    await db.delete(outreachSends).where(eq(outreachSends.venueId, venueId));
  } else if (contactEmail) {
    await db
      .delete(outreachSends)
      .where(and(isNull(outreachSends.venueId), eq(outreachSends.toEmail, contactEmail)));
  }

  return NextResponse.json({ ok: true });
}
