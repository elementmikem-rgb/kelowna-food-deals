import { notFound, redirect } from "next/navigation";
import { db, venues, specials, events, menuItems } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
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
  if (!session) redirect("/owner/login/expired");
  // A logged-in owner only ever sees their own venue -- never trust the URL's id over
  // the session's, same posture as every /api/owner/* route.
  if (session.venueId !== venueId) redirect(`/owner/venue/${session.venueId}`);

  const [venue] = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) notFound();

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
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">{venue.name}</h1>
        <p className="text-sm text-muted">Manage your specials, events, and menu.</p>
      </header>

      <OwnerDashboard
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
      />
    </div>
  );
}
