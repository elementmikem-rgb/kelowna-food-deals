import { AdminShell } from "@/components/AdminShell";
import { FeaturedVenuesPanel } from "@/components/FeaturedVenuesPanel";
import { BoostedSpecialsPanel } from "@/components/BoostedSpecialsPanel";
import {
  getFeaturedVenues,
  getBoostedSpecials,
  getVenueOptions,
  getSpecialOptions,
} from "@/lib/sponsored-data";

export const dynamic = "force-dynamic";

export default async function AdminSponsoredPage() {
  const [featuredVenues, boostedSpecials, venueOptions, specialOptions] = await Promise.all([
    getFeaturedVenues(),
    getBoostedSpecials(),
    getVenueOptions(),
    getSpecialOptions(),
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
    </AdminShell>
  );
}
