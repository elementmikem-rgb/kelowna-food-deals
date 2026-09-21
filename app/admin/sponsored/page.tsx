import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import { BoostedEventsPanel } from "@/components/BoostedEventsPanel";
import { ChatBoostedSpecialsPanel } from "@/components/ChatBoostedSpecialsPanel";
import { ChatBoostedEventsPanel } from "@/components/ChatBoostedEventsPanel";
import { ChatTermSponsorsPanel } from "@/components/ChatTermSponsorsPanel";
import { ExpiringSoonPanel } from "@/components/ExpiringSoonPanel";
import { PartnersPanel } from "@/components/PartnersPanel";
import { CategorySponsorPanel } from "@/components/CategorySponsorPanel";
import { PendingBookingsPanel } from "@/components/PendingBookingsPanel";
import { RefundsNeededPanel } from "@/components/RefundsNeededPanel";
import { MonetizationSettingsPanel } from "@/components/MonetizationSettingsPanel";
import { CreditBundleSettingsPanel } from "@/components/CreditBundleSettingsPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getBoostedEvents,
  getChatBoostedSpecials,
  getChatBoostedEvents,
  getChatTermSponsors,
  getExpiringSoon,
  getVenueOptions,
  getSpecialOptions,
  getEventOptions,
  getPartnerVenues,
  getActiveCategorySponsors,
  getRegionOptions,
} from "@/lib/sponsored-data";
import { getPendingApprovalBookings, getRefundsNeeded } from "@/lib/bookings-data";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { db, monetizationSettings, creditBundles } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
  const { regionIds } = await getSelectedAdminScope();

  const [
    featuredVenues,
    boostedSpecials,
    boostedEvents,
    chatBoostedSpecials,
    chatBoostedEvents,
    chatTermSponsors,
    expiringSoon,
    venueOptions,
    specialOptions,
    eventOptions,
    partnerVenues,
    categorySponsors,
    regionOptions,
    pendingBookings,
    refundsNeeded,
    settingsRows,
    creditBundleRows,
  ] = await Promise.all([
    getFeaturedVenues(regionIds),
    getBoostedSpecials(regionIds),
    getBoostedEvents(regionIds),
    getChatBoostedSpecials(regionIds),
    getChatBoostedEvents(regionIds),
    getChatTermSponsors(regionIds),
    getExpiringSoon(regionIds),
    getVenueOptions(regionIds),
    getSpecialOptions(regionIds),
    getEventOptions(regionIds),
    getPartnerVenues(regionIds),
    getActiveCategorySponsors(regionIds),
    getRegionOptions(regionIds),
    getPendingApprovalBookings(regionIds),
    getRefundsNeeded(regionIds),
    db.select().from(monetizationSettings),
    db.select().from(creditBundles).orderBy(creditBundles.sortOrder),
  ]);

  return (
    <AdminShell active="sponsored" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Sponsored</h1>

      <ExpiringSoonPanel items={expiringSoon} />
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
      <ChatBoostedSpecialsPanel
        active={chatBoostedSpecials}
        venueOptions={venueOptions}
        specialOptions={specialOptions}
      />
      <ChatBoostedEventsPanel
        active={chatBoostedEvents}
        venueOptions={venueOptions}
        eventOptions={eventOptions}
      />
      <ChatTermSponsorsPanel
        active={chatTermSponsors}
        regionOptions={regionOptions}
        venueOptions={venueOptions}
        priceCentsPerDay={
          settingsRows.find((r) => r.productType === "chat_term_sponsor")?.priceCentsPerDay ?? 100
        }
      />
      <PartnersPanel active={partnerVenues} venueOptions={venueOptions} />
      <CategorySponsorPanel active={categorySponsors} regionOptions={regionOptions} />
      <MonetizationSettingsPanel initial={settingsRows} />
      <CreditBundleSettingsPanel initial={creditBundleRows} />
    </AdminShell>
  );
}
