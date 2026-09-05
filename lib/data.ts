import { db, specials, venues } from "@/db";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";

export interface SpecialWithVenue {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  isMonthly: boolean;
  startTime: string | null;
  endTime: string | null;
  category: SpecialCategory;
  lastVerifiedAt: Date;
  confidence: number;
}

export interface PreviousSpecial extends SpecialWithVenue {
  archivedAt: Date;
}

const baseColumns = {
  id: specials.id,
  venueId: specials.venueId,
  venueName: venues.name,
  title: specials.title,
  description: specials.description,
  priceCents: specials.priceCents,
  dayOfWeek: specials.dayOfWeek,
  isMonthly: specials.isMonthly,
  startTime: specials.startTime,
  endTime: specials.endTime,
  category: specials.category,
  lastVerifiedAt: specials.lastVerifiedAt,
  confidence: specials.confidence,
};

export async function getAllSpecialsWithVenue(): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select(baseColumns)
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(venues.active, true), isNull(specials.archivedAt)));

  return rows as SpecialWithVenue[];
}

export async function getMonthlySpecials(): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select(baseColumns)
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(eq(venues.active, true), isNull(specials.archivedAt), eq(specials.isMonthly, true))
    );

  return rows as SpecialWithVenue[];
}

export async function getPreviousSpecials(limit = 30): Promise<PreviousSpecial[]> {
  const rows = await db
    .select({ ...baseColumns, archivedAt: specials.archivedAt })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(venues.active, true), isNotNull(specials.archivedAt)))
    .orderBy(desc(specials.archivedAt))
    .limit(limit);

  return rows as PreviousSpecial[];
}
