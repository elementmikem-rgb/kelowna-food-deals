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
