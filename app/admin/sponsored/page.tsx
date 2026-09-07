import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import { PartnersPanel } from "@/components/PartnersPanel";
import { CategorySponsorPanel } from "@/components/CategorySponsorPanel";
import { PendingBookingsPanel } from "@/components/PendingBookingsPanel";
import { RefundsNeededPanel } from "@/components/RefundsNeededPanel";
import { MonetizationSettingsPanel } from "@/components/MonetizationSettingsPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getVenueOptions,
  getSpecialOptions,
  getPartnerVenues,
  getActiveCategorySponsors,
} from "@/lib/sponsored-data";
import { getPendingApprovalBookings, getRefundsNeeded } from "@/lib/bookings-data";
import { getSelectedAdminRegionId } from "@/lib/admin-region";
import { db, monetizationSettings } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
  const selectedRegionId = await getSelectedAdminRegionId();
  const regionFilter = selectedRegionId === "all" ? undefined : selectedRegionId;

  const [
    featuredVenues,
    boostedSpecials,
    venueOptions,
    specialOptions,
    partnerVenues,
    categorySponsors,
    pendingBookings,
    refundsNeeded,
    settingsRows,
  ] = await Promise.all([
    getFeaturedVenues(regionFilter),
    getBoostedSpecials(regionFilter),
    getVenueOptions(regionFilter),
    getSpecialOptions(regionFilter),
    getPartnerVenues(regionFilter),
    getActiveCategorySponsors(),
    getPendingApprovalBookings(regionFilter),
    getRefundsNeeded(regionFilter),
    db.select().from(monetizationSettings),
  ]);

  return (
    <AdminShell active="sponsored" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Sponsored</h1>

      <PendingBookingsPanel pending={pendingBookings} />
      <RefundsNeededPanel refunds={refundsNeeded} />
      <FeaturedVenuesPanel active={featuredVenues} venueOptions={venueOptions} />
      <BoostedSpecialsPanel
        active={boostedSpecials}
        venueOptions={venueOptions}
        specialOptions={specialOptions}
      />
      <PartnersPanel active={partnerVenues} venueOptions={venueOptions} />
      <CategorySponsorPanel active={categorySponsors} />
      <MonetizationSettingsPanel initial={settingsRows} />
    </AdminShell>
  );
}
