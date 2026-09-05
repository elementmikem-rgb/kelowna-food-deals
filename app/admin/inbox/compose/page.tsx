import Link from "next/link";
import { db, venues } from "@/db";
import { isNotNull } from "drizzle-orm";
import { ComposeForm } from "@/components/ComposeForm";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const venueRows = await db
    .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
    .from(venues)
    .where(isNotNull(venues.contactEmail));

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <div>
        <Link href="/admin/inbox" className="text-sm text-accent-dim underline">
          ← Inbox
        </Link>
      </div>

      <h1 className="font-display text-2xl text-foreground">New message</h1>

      {venueRows.length === 0 ? (
        <p className="text-muted-2 text-sm">No venues have a contact email on file yet.</p>
      ) : (
        <ComposeForm
          venues={venueRows.map((v) => ({ id: v.id, name: v.name, contactEmail: v.contactEmail! }))}
        />
      )}
    </div>
  );
}
