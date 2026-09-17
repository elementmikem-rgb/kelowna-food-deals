import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendVenueOutreachEmail } from "@/lib/outreach-send";

const sendSchema = z.object({ venueId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const result = await sendVenueOutreachEmail(parsed.data.venueId);
  if (!result.ok) {
    const status = result.reason?.includes("already sent") ? 409
      : result.reason?.includes("no contact email") || result.reason?.includes("unsubscribed") || result.reason?.includes("no valid region") ? 400
      : 502;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
