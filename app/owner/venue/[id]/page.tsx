import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db, venues, specials, events, menuItems, venueOwners } from "@/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getOwnerSessionFromCookies } from "@/lib/venue-owner-auth";
import { OwnerDashboard } from "@/components/OwnerDashboard";

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
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(inArray(venues.id, session.venueIds));
  const venue = ownedVenues.find((v) => v.id === venueId);
  if (!venue) notFound();

  const [owner] = await db
    .select({ weeklyDigestOptOut: venueOwners.weeklyDigestOptOut })
    .from(venueOwners)
    .where(eq(venueOwners.id, session.venueOwnerId))
    .limit(1);

  const [venueSpecials, venueEvents, venueMenuItems] = await Promise.all([
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
  ]);

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <header className="flex flex-col gap-1">
        <span className="stamp px-2 py-0.5 text-[10px] self-start">Owner</span>
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
        specials={venueSpecials.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          priceCents: s.priceCents,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          category: s.category,
        }))}
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
      />
    </div>
  );
}
