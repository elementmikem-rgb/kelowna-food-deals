import { db, specials, venues } from "@/db";
import { and, desc, eq, isNull, isNotNull, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { SpecialCategory } from "@/db/schema";

export interface SpecialWithVenue {
  id: number;
  venueId: number;
  venueName: string;
  venueCity: string | null;
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
  venueCity: venues.city,
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

const MAX_PREVIOUS_PER_VENUE = 4;

export async function getPreviousSpecials(limit = 30): Promise<PreviousSpecial[]> {
  // The nightly cron re-archives and re-inserts a venue's entire special set on any
  // content-hash change, so a still-running special routinely lands in the archive
  // alongside its identical live twin. Exclude any archived row whose full identity
  // still exists as an active row for the same venue -- otherwise "Previously
  // Featured" advertises specials that are live on the board directly above it.
  const live = alias(specials, "live_specials");
  const rows = await db
    .select({ ...baseColumns, archivedAt: specials.archivedAt })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        isNotNull(specials.archivedAt),
        notExists(
          db
            .select({ one: sql`1` })
            .from(live)
            .where(
              and(
                eq(live.venueId, specials.venueId),
                isNull(live.archivedAt),
                // IS NOT DISTINCT FROM, not =, so two NULL descriptions/prices/times
                // count as the same special instead of silently never matching.
                sql`${live.title} IS NOT DISTINCT FROM ${specials.title}`,
                sql`${live.description} IS NOT DISTINCT FROM ${specials.description}`,
                sql`${live.priceCents} IS NOT DISTINCT FROM ${specials.priceCents}`,
                sql`${live.category} IS NOT DISTINCT FROM ${specials.category}`,
                sql`${live.startTime} IS NOT DISTINCT FROM ${specials.startTime}`,
                sql`${live.endTime} IS NOT DISTINCT FROM ${specials.endTime}`
              )
            )
        )
      )
    )
    .orderBy(desc(specials.archivedAt))
    // Over-fetch so the per-venue cap below still has `limit` rows to work with
    // after one churny venue's surplus is trimmed away.
    .limit(limit * 5);

  const perVenue = new Map<number, number>();
  const capped: PreviousSpecial[] = [];
  for (const row of rows as PreviousSpecial[]) {
    const seen = perVenue.get(row.venueId) ?? 0;
    if (seen >= MAX_PREVIOUS_PER_VENUE) continue;
    perVenue.set(row.venueId, seen + 1);
    capped.push(row);
    if (capped.length >= limit) break;
  }

  return capped;
}
