import Link from "next/link";
import { db, inboundEmails, venues } from "@/db";
import { desc, eq } from "drizzle-orm";
import { AdminInboxRow } from "@/components/AdminInboxRow";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const rows = await db
    .select({
      id: inboundEmails.id,
      venueName: venues.name,
      fromEmail: inboundEmails.fromEmail,
      fromName: inboundEmails.fromName,
      subject: inboundEmails.subject,
      textBody: inboundEmails.textBody,
      read: inboundEmails.read,
      receivedAt: inboundEmails.receivedAt,
    })
    .from(inboundEmails)
    .leftJoin(venues, eq(inboundEmails.venueId, venues.id))
    .orderBy(desc(inboundEmails.receivedAt));

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Inbox ({rows.length})</h1>
        <Link href="/admin/outreach" className="text-sm text-accent-dim underline">
          ← Outreach
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-2 text-sm">No replies yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <AdminInboxRow
              key={r.id}
              email={{ ...r, receivedAt: r.receivedAt.toISOString() }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
