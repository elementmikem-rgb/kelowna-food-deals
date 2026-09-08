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
