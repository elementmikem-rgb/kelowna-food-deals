import { db, bookings, venues, specials, categorySponsors } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";
import { endOfDayPacific, pacificTodayISODate } from "@/lib/time";

export interface PendingBooking {
  id: number;
  productType: string;
  venueId: number | null;
  venueName: string | null;
  specialId: number | null;
  specialTitle: string | null;
  category: SpecialCategory | null;
  startDate: string;
  endDate: string;
  priceCents: number;
  buyerEmail: string;
  conflictDetected: boolean;
}

export async function getPendingApprovalBookings(regionId?: number): Promise<PendingBooking[]> {
  const rows = await db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      venueId: bookings.venueId,
      venueName: venues.name,
      specialId: bookings.specialId,
      specialTitle: specials.title,
      category: bookings.category,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      conflictDetected: bookings.conflictDetected,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .leftJoin(specials, eq(bookings.specialId, specials.id))
    .where(
      and(
        eq(bookings.status, "pending_approval"),
        regionId === undefined ? undefined : eq(venues.regionId, regionId)
      )
    )
    .orderBy(asc(bookings.createdAt));
  return rows;
}

export interface RefundNeeded {
  id: number;
  productType: string;
  priceCents: number;
  buyerEmail: string;
  stripePaymentIntentId: string | null;
}

export async function getRefundsNeeded(regionId?: number): Promise<RefundNeeded[]> {
  return db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .where(
      and(
        eq(bookings.status, "rejected"),
        eq(bookings.refundNeeded, true),
        regionId === undefined ? undefined : eq(venues.regionId, regionId)
      )
    )
    .orderBy(asc(bookings.reviewedAt));
}

// True when the live column already covers at least as long as this booking would
// set it -- i.e. writing would either change nothing or *shorten* a window someone
// (an admin via the manual panels, or an overlapping booking) deliberately granted.
// Either way there is nothing for this activation to do.
function alreadyCovered(current: Date | null, until: Date): boolean {
  return current !== null && current.getTime() >= until.getTime();
}

// Writes an approved booking's dates into the existing "live now" columns that every
// render path already reads. Used both when an admin approves a booking whose range
// already covers today, and by the daily sync job (Task 11) for a future-dated
// approved booking on the day its range starts.
//
// Every branch reads the current live value and writes only when it would actually
// change something. That matters because the sync job re-runs this nightly for the
// whole life of a booking, not just on its start date: without the read-before-write
// it would churn the category_sponsors row (delete+insert) every night, destroying
// any sponsor an admin set by hand and resetting the row's id/createdAt, and it would
// silently truncate a longer featuredUntil/boostedUntil window an admin granted
// manually. The spec's promise that the existing manual admin panels "keep working
// exactly as they do today" depends on this being a genuine no-op once applied.
export async function activateBooking(bookingId: number): Promise<void> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;
  const until = endOfDayPacific(booking.endDate);

  if (booking.productType === "featured" && booking.venueId !== null) {
    const [venue] = await db
      .select({ featuredUntil: venues.featuredUntil })
      .from(venues)
      .where(eq(venues.id, booking.venueId));
    if (!venue || alreadyCovered(venue.featuredUntil, until)) return;
    await db.update(venues).set({ featuredUntil: until }).where(eq(venues.id, booking.venueId));
  } else if (booking.productType === "boost" && booking.specialId !== null) {
    const [special] = await db
      .select({ boostedUntil: specials.boostedUntil })
      .from(specials)
      .where(eq(specials.id, booking.specialId));
    if (!special || alreadyCovered(special.boostedUntil, until)) return;
    await db.update(specials).set({ boostedUntil: until }).where(eq(specials.id, booking.specialId));
  } else if (booking.productType === "category_sponsor" && booking.category !== null && booking.venueId !== null) {
    const [venue] = await db.select().from(venues).where(eq(venues.id, booking.venueId));
    const sponsorName = venue?.name ?? "Sponsor";
    const sponsorUrl = venue?.website ?? null;

    const [existing] = await db
      .select()
      .from(categorySponsors)
      .where(eq(categorySponsors.category, booking.category));
    // Already this booking's sponsor, running at least as long as this booking would
    // set it -- leave the row (and its id/createdAt) exactly where it is.
    if (
      existing &&
      existing.sponsorName === sponsorName &&
      existing.sponsorUrl === sponsorUrl &&
      alreadyCovered(existing.sponsorUntil, until)
    ) {
      return;
    }

    await db.delete(categorySponsors).where(eq(categorySponsors.category, booking.category));
    await db.insert(categorySponsors).values({
      category: booking.category,
      sponsorName,
      sponsorUrl,
      sponsorUntil: until,
    });
  }
}

// Returns the booking's venueId (or null) so the caller can revalidate that venue's
// detail page too -- every product type sets venueId (see Task 1's schema note), so
// this is non-null whenever the approved booking affects a real venue's page.
export async function approveBooking(bookingId: number): Promise<{ venueId: number | null }> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking || booking.status !== "pending_approval") return { venueId: null };

  await db
    .update(bookings)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  const today = pacificTodayISODate();
  if (booking.startDate <= today && today <= booking.endDate) {
    await activateBooking(bookingId);
  }

  return { venueId: booking.venueId };
}

export async function rejectBooking(bookingId: number): Promise<void> {
  await db
    .update(bookings)
    .set({ status: "rejected", refundNeeded: true, reviewedAt: new Date() })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending_approval")));
}

export async function markRefunded(bookingId: number): Promise<void> {
  await db.update(bookings).set({ refundNeeded: false }).where(eq(bookings.id, bookingId));
}
