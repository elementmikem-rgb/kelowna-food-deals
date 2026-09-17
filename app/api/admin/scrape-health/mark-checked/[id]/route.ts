import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const actionSchema = z.object({
  action: z.enum(["confirm", "undo"]),
  note: z.string().trim().max(280).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  await db
    .update(venues)
    .set(
      parsed.data.action === "confirm"
        ? { checkedNoListingsAt: new Date(), checkedNoListingsNote: parsed.data.note ?? null }
        : { checkedNoListingsAt: null, checkedNoListingsNote: null }
    )
    .where(eq(venues.id, venueId));

  return NextResponse.json({ ok: true });
}
