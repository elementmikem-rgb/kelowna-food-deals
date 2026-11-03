import { areaNameFromBrand } from "@/lib/page-titles";
import type { Metadata } from "next";
import { getNightlife } from "@/lib/nightlife-data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { NightlifeBoard } from "@/components/NightlifeBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";
import { FAQSection } from "@/components/FAQSection";
import { getEffectiveLanguage } from "@/lib/i18n";
import { buildBreadcrumbJsonLd, SITE_URL, regionOgImages } from "@/lib/seo";

// Per-region correctness requires the request's own domain (getCurrentRegion),
// which forces dynamic rendering -- see app/[region]/events/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const { timezone } = await getRegionContext(region);
  const areaName = areaNameFromBrand(region.brandName);
  const { weekly, upcoming } = await getNightlife(region.id, timezone);
  const title = lang === "fr" ? `Vie nocturne à ${areaName} ce soir` : `${areaName} Nightlife Tonight`;
  const description =
    lang === "fr"
      ? `Spéciaux de fin de soirée, musique live, karaoké et DJ à ${areaName}, par soir.`
      : `Late-night drink specials, live music, karaoke and DJ nights in ${areaName}, night by night.`;
  return {
    title,
    description,
    alternates: { canonical: `/${region.slug}/nightlife` },
    openGraph: { title, description, url: `/${region.slug}/nightlife`, images: regionOgImages(region.slug) },
    // A region with nothing late listed stays out of the index so Google never sees an empty page.
    robots: weekly.length + upcoming.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function NightlifePage() {
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const { timezone } = await getRegionContext(region);
  const areaName = areaNameFromBrand(region.brandName);
  const { weekly, upcoming } = await getNightlife(region.id, timezone);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(SITE_URL, [
    { name: "Home", path: "/" },
    { name: region.brandName, path: `/${region.slug}` },
    { name: "Nightlife", path: `/${region.slug}/nightlife` },
  ]);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader
        active="nightlife"
        heading={lang === "fr" ? `Vie nocturne à ${areaName}` : `${areaName} Nightlife Tonight`}
        subtitle={
          lang === "fr"
            ? "Spéciaux de fin de soirée, musique live, karaoké et DJ -- vérifiés, pas devinés."
            : "Late-night specials, live music, karaoke and DJ nights -- verified, not guessed."
        }
      />

      <NightlifeBoard weekly={weekly} upcoming={upcoming} timezone={timezone} regionSlug={region.slug} lang={lang} />

      <TipJar regionSlug={region.slug} lang={lang} />
      <FAQSection lang={lang} />
      <SiteFooter />
    </div>
  );
}
