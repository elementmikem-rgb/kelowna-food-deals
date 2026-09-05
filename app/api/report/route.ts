import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, events, venues } from "@/db";
import { eq, sql } from "drizzle-orm";
import { sendReportEmail } from "@/lib/brevo";

const reportSchema = z.object({
  specialId: z.number().int().positive(),
  venueId: z.number().int().positive().nullable(),
  kind: z.enum(["special", "event"]).default("special"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { specialId, venueId, kind } = parsed.data;

  const rows =
    kind === "event"
      ? await db
          .select({
            itemTitle: events.title,
            venueName: venues.name,
            locationName: events.locationName,
          })
          .from(events)
          .leftJoin(venues, eq(events.venueId, venues.id))
          .where(eq(events.id, specialId))
          .limit(1)
      : await db
          .select({ itemTitle: specials.title, venueName: venues.name, locationName: sql`null` })
          .from(specials)
          .innerJoin(venues, eq(specials.venueId, venues.id))
          .where(eq(specials.id, specialId))
          .limit(1);

  const row = rows[0];
  const label = kind === "event" ? "Event" : "Special";
  const placeName = row?.venueName ?? row?.locationName ?? "unknown";

  try {
    await sendReportEmail({
      subject: `${label} report: ${placeName}`,
      textContent: [
        `Venue: ${placeName}${venueId ? ` (id ${venueId})` : ""}`,
        `${label}: ${row?.itemTitle ?? "unknown"} (id ${specialId})`,
        "Reported as incorrect via the public site.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send report email:", err);
    return NextResponse.json({ error: "failed to send report" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
