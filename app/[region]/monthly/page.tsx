import type { Metadata } from "next";
import { getMonthlySpecials } from "@/lib/data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { MonthlySpecials } from "@/components/MonthlySpecials";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";
import { getEffectiveLanguage } from "@/lib/i18n";

// Per-region correctness requires the request's own domain (getCurrentRegion),
// which forces dynamic rendering -- see app/page.tsx's comment.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const areaName = region.brandName.split(" ")[0];
  const title = `${areaName} Monthly Specials`;
  const description = `Deals running all month long at ${areaName} restaurants and bars — not tied to a single day, checked and verified.`;
  return {
    title,
    description,
    alternates: { canonical: `/${region.slug}/monthly` },
    openGraph: { title, description, url: `/${region.slug}/monthly` },
  };
}

export default async function MonthlyPage() {
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const { timezone } = await getRegionContext(region);
  const specials = await getMonthlySpecials(region.id);
  const areaName = region.brandName.split(" ")[0];

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <SiteHeader
        active="monthly"
        heading={`${areaName} Monthly Specials`}
        subtitle="Running all month — not tied to a single day."
      />

      <MonthlySpecials specials={specials} timezone={timezone} regionSlug={region.slug} />

      <TipJar regionSlug={region.slug} lang={lang} />
      <SiteFooter />
    </div>
  );
}
