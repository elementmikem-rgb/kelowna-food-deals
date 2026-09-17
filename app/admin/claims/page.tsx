import { db, venueClaimRequests, venues, venueOwners, venueOwnerVenues, venueChains } from "@/db";
import { and, asc, eq, inArray, ne, or, sql, isNotNull } from "drizzle-orm";
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
      venueChainId: venues.chainId,
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

  // Suggestion hints only -- informational for the human reviewer, never gate or
  // auto-approve anything. See the moat-layer-3 plan this shipped from.
  const rowsWithSuggestions = await Promise.all(
    rows.map(async (r) => {
      let chainSuggestion: { chainName: string; otherClaimedVenues: string[] } | null = null;
      if (r.venueChainId) {
        const [chain] = await db
          .select({ canonicalName: venueChains.canonicalName })
          .from(venueChains)
          .where(eq(venueChains.id, r.venueChainId))
          .limit(1);
        const siblings = await db
          .select({ name: venues.name })
          .from(venues)
          .where(
            and(
              eq(venues.chainId, r.venueChainId),
              ne(venues.id, r.venueId),
              isNotNull(venues.claimedAt)
            )
          );
        if (chain && siblings.length > 0) {
          chainSuggestion = { chainName: chain.canonicalName, otherClaimedVenues: siblings.map((s) => s.name) };
        }
      }

      let ownerMatch: { id: number; name: string; venues: string[] } | null = null;
      const [matchedOwner] = await db
        .select({ id: venueOwners.id, name: venueOwners.name })
        .from(venueOwners)
        .where(
          or(
            sql`lower(${venueOwners.email}) = lower(${r.email})`,
            r.phone ? and(isNotNull(venueOwners.phone), eq(venueOwners.phone, r.phone)) : sql`false`
          )
        )
        .limit(1);
      if (matchedOwner) {
        const ownedVenues = await db
          .select({ name: venues.name })
          .from(venueOwnerVenues)
          .innerJoin(venues, eq(venues.id, venueOwnerVenues.venueId))
          .where(eq(venueOwnerVenues.venueOwnerId, matchedOwner.id));
        ownerMatch = { id: matchedOwner.id, name: matchedOwner.name, venues: ownedVenues.map((v) => v.name) };
      }

      return { ...r, chainSuggestion, ownerMatch };
    })
  );

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
          {rowsWithSuggestions.map((r) => (
            <AdminClaimRow key={r.id} claim={{ ...r, createdAt: r.createdAt.toISOString() }} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
