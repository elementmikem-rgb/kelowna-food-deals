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
