import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { inArray } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const markReadSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = markReadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await db.update(inboundEmails).set({ read: true }).where(inArray(inboundEmails.id, parsed.data.ids));
  return NextResponse.json({ ok: true });
}
