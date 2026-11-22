import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { assignSenderToVenue } from "@/lib/sender-alias";

const schema = z.object({ email: z.string().min(3).max(320), venueId: z.number().int().positive() });

// Moves an unmatched sender's messages onto a venue and remembers the address for next time. It never changes
// the venue's contact email (that decides who we send outreach to).
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const [venue] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, parsed.data.venueId)).limit(1);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });

  const result = await assignSenderToVenue(parsed.data.email, parsed.data.venueId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, venueId: parsed.data.venueId, movedReplies: result.movedReplies, movedSent: result.movedSent });
}
