import { db, venueClaimRequests, venues } from "@/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AdminClaimRow } from "@/components/AdminClaimRow";
import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const { regionIds } = await getSelectedAdminScope();

  const rows = await db
    .select({
      id: venueClaimRequests.id,
      venueId: venueClaimRequests.venueId,
      venueName: venues.name,
      // On-file contact email (scraped/known, the same address outreach emails go to) --
      // shown next to the claim's self-reported email so a reviewer can catch a claim
      // submitted with an attacker's own address before approving it grants that address
      // control of the listing.
      venueContactEmail: venues.contactEmail,
      name: venueClaimRequests.name,
      email: venueClaimRequests.email,
      phone: venueClaimRequests.phone,
      role: venueClaimRequests.role,
      message: venueClaimRequests.message,
      createdAt: venueClaimRequests.createdAt,
    })
    .from(venueClaimRequests)
    .innerJoin(venues, eq(venueClaimRequests.venueId, venues.id))
    .where(
      and(
        eq(venueClaimRequests.status, "pending"),
        regionIds === "all" ? undefined : inArray(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venueClaimRequests.createdAt));

  return (
    <AdminShell active="claims" maxWidth="max-w-3xl">
      <h1 className="font-display text-2xl text-foreground">
        Venue claims
        {rows.length > 0 && <span className="text-accent"> ({rows.length})</span>}
      </h1>

      {rows.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing waiting — you&apos;re caught up.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <AdminClaimRow key={r.id} claim={{ ...r, createdAt: r.createdAt.toISOString() }} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
