import { getAllSpecialsWithVenue } from "@/lib/data";
import { getActiveCategorySponsors } from "@/lib/sponsored-data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { SpecialsBoard } from "@/components/SpecialsBoard";
import { TipJar } from "@/components/TipJar";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AboutSection } from "@/components/AboutSection";
import { HomeIntroCallout } from "@/components/HomeIntroCallout";
import { buildSpecialsJsonLd } from "@/lib/seo";

// Per-region correctness requires reading the request's own domain
// (getCurrentRegion, via proxy.ts's x-region-id header) rather than a single
// static "primary" region -- this necessarily forces dynamic rendering
// (no ISR) now that a second region is genuinely live. See lib/regions.ts.
export const dynamic = "force-dynamic";

export default async function Home() {
  const region = await getCurrentRegion();
  const { timezone } = await getRegionContext(region);
  const [specials, categorySponsors] = await Promise.all([
    getAllSpecialsWithVenue(region.id),
    // categorySponsors has no region column yet -- sponsorships are currently
    // site-wide across all regions. Flagged as a follow-up, not part of this fix.
    getActiveCategorySponsors(),
  ]);

  const jsonLd = buildSpecialsJsonLd(specials, region.brandName);
  const areas = Array.from(
    new Set(specials.map((s) => s.venueCity).filter((c): c is string => !!c))
  ).sort();

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6 gap-5 sm:gap-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader
        active="specials"
        subtitle="What's actually on today — verified, not guessed."
      />

      <HomeIntroCallout />

      <SpecialsBoard specials={specials} categorySponsors={categorySponsors} timezone={timezone} />

      <TipJar />
      <AboutSection brandName={region.brandName} areas={areas} />
      <SiteFooter />
    </div>
  );
}
