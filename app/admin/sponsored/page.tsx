import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import { BoostedEventsPanel } from "@/components/BoostedEventsPanel";
import { PartnersPanel } from "@/components/PartnersPanel";
import { CategorySponsorPanel } from "@/components/CategorySponsorPanel";
import { PendingBookingsPanel } from "@/components/PendingBookingsPanel";
import { RefundsNeededPanel } from "@/components/RefundsNeededPanel";
import { MonetizationSettingsPanel } from "@/components/MonetizationSettingsPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getBoostedEvents,
  getVenueOptions,
  getSpecialOptions,
  getEventOptions,
  getPartnerVenues,
  getActiveCategorySponsors,
  getRegionOptions,
} from "@/lib/sponsored-data";
import { getPendingApprovalBookings, getRefundsNeeded } from "@/lib/bookings-data";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { db, monetizationSettings } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
  const { regionIds } = await getSelectedAdminScope();

  const [
    featuredVenues,
    boostedSpecials,
    boostedEvents,
    venueOptions,
    specialOptions,
    eventOptions,
    partnerVenues,
    categorySponsors,
    regionOptions,
    pendingBookings,
    refundsNeeded,
    settingsRows,
  ] = await Promise.all([
    getFeaturedVenues(regionIds),
    getBoostedSpecials(regionIds),
    getBoostedEvents(regionIds),
    getVenueOptions(regionIds),
    getSpecialOptions(regionIds),
    getEventOptions(regionIds),
    getPartnerVenues(regionIds),
    getActiveCategorySponsors(regionIds),
    getRegionOptions(regionIds),
    getPendingApprovalBookings(regionIds),
    getRefundsNeeded(regionIds),
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
      <BoostedEventsPanel
        active={boostedEvents}
        venueOptions={venueOptions}
        eventOptions={eventOptions}
      />
      <PartnersPanel active={partnerVenues} venueOptions={venueOptions} />
      <CategorySponsorPanel active={categorySponsors} regionOptions={regionOptions} />
      <MonetizationSettingsPanel initial={settingsRows} />
    </AdminShell>
  );
}
