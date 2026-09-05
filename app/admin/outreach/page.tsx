import Link from "next/link";
import { db, venues, outreachSends } from "@/db";
import { eq, isNotNull, desc } from "drizzle-orm";
import { AdminOutreachRow } from "@/components/AdminOutreachRow";

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  const venueRows = await db
    .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
    .from(venues)
    .where(isNotNull(venues.contactEmail));

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
    if (!latestSendByVenue.has(s.venueId)) latestSendByVenue.set(s.venueId, s);
  }

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">
          Venue outreach ({venueRows.length})
        </h1>
        <div className="flex gap-3">
          <Link href="/admin/analytics" className="text-sm text-accent-dim underline">
            Analytics
          </Link>
          <Link href="/admin/inbox" className="text-sm text-accent-dim underline">
            Inbox →
          </Link>
        </div>
      </div>

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
    </div>
  );
}
