import { db, venues, outreachSends } from "@/db";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { AdminOutreachRow } from "@/components/AdminOutreachRow";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  const venueRows = await db
    .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
    .from(venues)
    // Deactivated venues 404 on /venues/[id], so outreach referencing one would send
    // a dead link to a real business.
    .where(and(isNotNull(venues.contactEmail), eq(venues.active, true)));

  const sendRows = await db
    .select({
      venueId: outreachSends.venueId,
      status: outreachSends.status,
      sentAt: outreachSends.sentAt,
    })
    .from(outreachSends)
    .orderBy(desc(outreachSends.createdAt));

  const latestSendByVenue = new Map<number, (typeof sendRows)[number]>();
  for (const s of sendRows) {
    // A reply to an unmatched sender (e.g. a sponsor inquiry auto-reply) has no
    // venue to attribute here -- this page is specifically venue outreach status.
    if (s.venueId === null) continue;
    if (!latestSendByVenue.has(s.venueId)) latestSendByVenue.set(s.venueId, s);
  }

  return (
    <AdminShell active="outreach" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">
        Venue outreach <span className="text-muted-2 font-body text-lg">({venueRows.length})</span>
      </h1>

      {venueRows.length === 0 ? (
        <p className="text-muted-2 text-sm">
          No venues have a contact email on file yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {venueRows.map((v) => (
            <AdminOutreachRow
              key={v.id}
              venueId={v.id}
              venueName={v.name}
              contactEmail={v.contactEmail!}
              lastSend={
                latestSendByVenue.has(v.id)
                  ? {
                      status: latestSendByVenue.get(v.id)!.status,
                      sentAt: latestSendByVenue.get(v.id)!.sentAt?.toISOString() ?? null,
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
