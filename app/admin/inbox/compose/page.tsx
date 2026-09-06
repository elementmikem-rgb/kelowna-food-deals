import { db, venues } from "@/db";
import { isNotNull } from "drizzle-orm";
import { ComposeForm } from "@/components/ComposeForm";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const venueRows = await db
    .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
    .from(venues)
    .where(isNotNull(venues.contactEmail));

  return (
    <AdminShell active="inbox" backHref="/admin/inbox" backLabel="Inbox" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">New message</h1>

      {venueRows.length === 0 ? (
        <p className="text-muted-2 text-sm">No venues have a contact email on file yet.</p>
      ) : (
        <ComposeForm
          venues={venueRows.map((v) => ({ id: v.id, name: v.name, contactEmail: v.contactEmail! }))}
        />
      )}
    </AdminShell>
  );
}
