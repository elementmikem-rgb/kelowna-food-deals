import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db, venues, specials, events, menuItems, venueOwners, monetizationSettings, creditBundles, bookings, venuePhotos } from "@/db";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getOwnerSessionFromCookies } from "@/lib/venue-owner-auth";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { getRegionById, getRegionContext } from "@/lib/regions";
import { regionTodayISODate } from "@/lib/time";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OwnerVenuePage({ params }: PageProps) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();

  const session = await getOwnerSessionFromCookies();
  if (!session || session.venueIds.length === 0) redirect("/owner/login/expired");
  // A logged-in owner only ever sees venues in their own session's list -- never trust
  // the URL's id alone, same posture as every /api/owner/* route.
  if (!session.venueIds.includes(venueId)) redirect(`/owner/venue/${session.venueIds[0]}`);

  const ownedVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId, creditBalance: venues.creditBalance })
    .from(venues)
    .where(inArray(venues.id, session.venueIds));
  const venue = ownedVenues.find((v) => v.id === venueId);
  if (!venue) notFound();

  const [owner] = await db
    .select({
      weeklyDigestOptOut: venueOwners.weeklyDigestOptOut,
      passwordHash: venueOwners.passwordHash,
      onboardingSeenAt: venueOwners.onboardingSeenAt,
    })
    .from(venueOwners)
    .where(eq(venueOwners.id, session.venueOwnerId))
    .limit(1);

  const [venueSpecials, venueEvents, venueMenuItems, promoteSettingsRows, region, creditBundleRows, venueBookings, latestVenuePhoto] = await Promise.all([
    db
      .select()
      .from(specials)
      .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt))),
    db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venueId), isNull(events.archivedAt))),
    db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.venueId, venueId), isNull(menuItems.archivedAt))),
    db.select().from(monetizationSettings),
    getRegionById(venue.regionId),
    db
      .select({ id: creditBundles.id, name: creditBundles.name, priceCents: creditBundles.priceCents, credits: creditBundles.credits })
      .from(creditBundles)
      .where(eq(creditBundles.active, true))
      .orderBy(creditBundles.sortOrder),
    // Every booking this venue has ever placed, most recent first -- excludes only
    // "expired" (an abandoned checkout hold, never a real attempt the owner needs to
    // see again). Without this, spending credits gave the owner zero way to tell
    // whether their purchase actually went anywhere: pending_approval bookings sit
    // invisibly until an admin approves them (confirmed live 2026-09-28), and even an
    // approved one had nothing on the dashboard confirming it.
    db
      .select({
        id: bookings.id,
        productType: bookings.productType,
        status: bookings.status,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        priceCents: bookings.priceCents,
        creditsSpentCents: bookings.creditsSpentCents,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(and(eq(bookings.venueId, venueId), ne(bookings.status, "expired")))
      .orderBy(desc(bookings.createdAt))
      .limit(10),
    // Same "most recent wins" rule as lib/data.ts's venuePhotoId subquery, so the
    // dashboard's preview always matches what's actually showing on the live site.
    db
      .select({ id: venuePhotos.id })
      .from(venuePhotos)
      .where(eq(venuePhotos.venueId, venueId))
      .orderBy(desc(venuePhotos.createdAt))
      .limit(1),
  ]);
  if (!region) notFound();
  const { timezone } = await getRegionContext(region);
  const todayISO = regionTodayISODate(timezone);

  function settingsFor(productType: "featured" | "boost" | "category_sponsor" | "chat_term_sponsor" | "map_pin") {
    const row = promoteSettingsRows.find((r) => r.productType === productType);
    return {
      priceCentsPerDay: row?.priceCentsPerDay ?? 0,
      minDays: row?.minDays ?? 1,
      maxDays: row?.maxDays ?? 30,
    };
  }

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="stamp px-2 py-0.5 text-[10px]">Owner</span>
          {/* Always visible regardless of which tab is selected -- unlike the detailed
              balance inside the Overview tab's Promote card, this is just a persistent
              reminder the owner has value sitting unspent, however deep in "Manage
              listing" or "Account" they are. */}
          <span className="press-pill rounded-full border border-accent/40 bg-accent-soft/15 px-2.5 py-0.5 text-[11px] font-medium text-accent-dim">
            {venue.creditBalance} credit{venue.creditBalance === 1 ? "" : "s"} (${venue.creditBalance})
          </span>
        </div>
        {ownedVenues.length > 1 && (
          <nav className="flex flex-wrap gap-1.5 -mt-1 mb-1">
            {ownedVenues.map((v) => (
              <Link
                key={v.id}
                href={`/owner/venue/${v.id}`}
                className={`press-pill rounded-full border px-3 py-1 text-xs ${
                  v.id === venueId
                    ? "bg-accent text-background border-accent"
                    : "border-border text-muted hover:border-muted hover:text-foreground"
                }`}
              >
                {v.name}
              </Link>
            ))}
          </nav>
        )}
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">{venue.name}</h1>
        <p className="text-sm text-muted">Manage your specials, events, and menu.</p>
      </header>

      <OwnerDashboard
        venueId={venueId}
        currentPhotoId={latestVenuePhoto[0]?.id ?? null}
        specials={venueSpecials
          // Flash specials are managed through their own widget (below), not the
          // general specials list -- a currently-live one would render oddly there
          // (no dayOfWeek/startTime, an "Add new" form that doesn't fit its shape),
          // and an expired-but-not-yet-archived one is nothing the owner needs to
          // see or manage again. Same rows are still in the DB; this is just what
          // this dashboard shows.
          .filter((s) => s.flashExpiresAt === null)
          .map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            priceCents: s.priceCents,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            category: s.category,
          }))}
        liveFlashSpecial={(() => {
          const live = venueSpecials.find((s) => s.flashExpiresAt !== null && s.flashExpiresAt > new Date());
          return live
            ? {
                id: live.id,
                title: live.title,
                priceCents: live.priceCents,
                category: live.category,
                flashExpiresAt: live.flashExpiresAt!,
                flashClaimLimit: live.flashClaimLimit,
                flashClaimCount: live.flashClaimCount,
              }
            : null;
        })()}
        events={venueEvents.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          eventType: e.eventType,
          dayOfWeek: e.dayOfWeek,
          specificDate: e.specificDate,
          startTime: e.startTime,
          endTime: e.endTime,
          coverChargeCents: e.coverChargeCents,
        }))}
        menuItems={venueMenuItems.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          priceCents: m.priceCents,
        }))}
        weeklyDigestOptOut={owner?.weeklyDigestOptOut ?? false}
        hasPassword={owner?.passwordHash != null}
        promoteSettings={{
          featured: settingsFor("featured"),
          boost: settingsFor("boost"),
          category_sponsor: settingsFor("category_sponsor"),
          chat_term_sponsor: settingsFor("chat_term_sponsor"),
          map_pin: settingsFor("map_pin"),
        }}
        todayISO={todayISO}
        creditBalance={venue.creditBalance}
        creditBundles={creditBundleRows}
        bookings={venueBookings}
        showOnboarding={owner?.onboardingSeenAt == null}
      />
    </div>
  );
}
