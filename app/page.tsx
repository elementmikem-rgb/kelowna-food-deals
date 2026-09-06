import { getAllSpecialsWithVenue, getMonthlySpecials } from "@/lib/data";
import { SpecialsBoard } from "@/components/SpecialsBoard";
import { MonthlySpecials } from "@/components/MonthlySpecials";
import { TipJar } from "@/components/TipJar";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AboutSection } from "@/components/AboutSection";
import { HomeIntroCallout } from "@/components/HomeIntroCallout";
import { buildSpecialsJsonLd } from "@/lib/seo";

export const revalidate = 3600; // ISR: refresh at most once an hour

export default async function Home() {
  const [specials, monthlySpecials] = await Promise.all([
    getAllSpecialsWithVenue(),
    getMonthlySpecials(),
  ]);

  const jsonLd = buildSpecialsJsonLd(specials);

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

      <SpecialsBoard specials={specials} />
      <MonthlySpecials specials={monthlySpecials} />

      <TipJar />
      <AboutSection />
      <SiteFooter />
    </div>
  );
}
