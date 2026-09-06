import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import { PartnersPanel } from "@/components/PartnersPanel";
import { CategorySponsorPanel } from "@/components/CategorySponsorPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getVenueOptions,
  getSpecialOptions,
  getPartnerVenues,
  getActiveCategorySponsors,
} from "@/lib/sponsored-data";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
  const [featuredVenues, boostedSpecials, venueOptions, specialOptions, partnerVenues, categorySponsors] =
    await Promise.all([
      getFeaturedVenues(),
      getBoostedSpecials(),
      getVenueOptions(),
      getSpecialOptions(),
      getPartnerVenues(),
      getActiveCategorySponsors(),
    ]);

  return (
    <AdminShell active="sponsored" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Sponsored</h1>

      <FeaturedVenuesPanel active={featuredVenues} venueOptions={venueOptions} />
      <BoostedSpecialsPanel
        active={boostedSpecials}
        venueOptions={venueOptions}
        specialOptions={specialOptions}
      />
      <PartnersPanel active={partnerVenues} venueOptions={venueOptions} />
      <CategorySponsorPanel active={categorySponsors} />
    </AdminShell>
  );
}
