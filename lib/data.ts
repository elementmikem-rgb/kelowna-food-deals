import { db, specials, venues } from "@/db";
import { eq } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";

export interface SpecialWithVenue {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  category: SpecialCategory;
  lastVerifiedAt: Date;
  confidence: number;
}

export async function getAllSpecialsWithVenue(): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select({
      id: specials.id,
      venueId: specials.venueId,
      venueName: venues.name,
      title: specials.title,
      description: specials.description,
      priceCents: specials.priceCents,
      dayOfWeek: specials.dayOfWeek,
      startTime: specials.startTime,
      endTime: specials.endTime,
      category: specials.category,
      lastVerifiedAt: specials.lastVerifiedAt,
      confidence: specials.confidence,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(eq(venues.active, true));

  return rows as SpecialWithVenue[];
}
