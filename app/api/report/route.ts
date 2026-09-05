import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, venues } from "@/db";
import { eq } from "drizzle-orm";
import { sendReportEmail } from "@/lib/brevo";

const reportSchema = z.object({
  specialId: z.number().int().positive(),
  venueId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { specialId, venueId } = parsed.data;

  const rows = await db
    .select({
      specialTitle: specials.title,
      venueName: venues.name,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(eq(specials.id, specialId))
    .limit(1);

  const row = rows[0];

  try {
    await sendReportEmail({
      subject: `Specials report: ${row?.venueName ?? `venue #${venueId}`}`,
      textContent: [
        `Venue: ${row?.venueName ?? "unknown"} (id ${venueId})`,
        `Special: ${row?.specialTitle ?? "unknown"} (id ${specialId})`,
        "Reported as incorrect via the public site.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send report email:", err);
    return NextResponse.json({ error: "failed to send report" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
