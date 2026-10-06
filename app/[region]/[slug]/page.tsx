import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpecialsWithVenueForDay } from "@/lib/data";
import { todayDowInRegion } from "@/lib/time";
import { getActiveCategorySponsors } from "@/lib/sponsored-data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { SpecialsBoard } from "@/components/SpecialsBoard";
import { TipJar } from "@/components/TipJar";
import { FAQSection } from "@/components/FAQSection";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { buildSpecialsJsonLd, buildBreadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { getEffectiveLanguage } from "@/lib/i18n";
import { dayFromSlug, dayLabel } from "@/lib/day-slugs";
import { categoryFromSlug, categoryPageLabel } from "@/lib/category-slugs";
import type { SpecialCategory } from "@/db/schema";

// Same per-request region resolution as the home page (app/[region]/page.tsx)
// -- getCurrentRegion() reads the x-region-id header proxy.ts sets from the
// URL's first segment, so this works identically whether the URL is
// /kelowna/saturday, /kelowna/wing-night, or /kelowna. Also forces dynamic
// rendering for the same reason the home page does.
export const dynamic = "force-dynamic";

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

// This one folder serves two different kinds of SEO landing page -- a day
// (/kelowna/saturday) or a category (/kelowna/wing-night) -- because Next.js
// only allows a single dynamic segment name per path depth, so [day] and
// [category] can't coexist as sibling folders under app/[region]/. Checking
// both slug sets here (day first, arbitrary but doesn't matter since
// lib/day-slugs.ts and lib/category-slugs.ts don't overlap) keeps the
// already-live /kelowna/saturday URLs unchanged while adding category pages.
type SlugKind = { kind: "day"; dow: number } | { kind: "category"; category: SpecialCategory };

function resolveSlug(slug: string): SlugKind | null {
  const dow = dayFromSlug(slug);
  if (dow !== null) return { kind: "day", dow };
  const category = categoryFromSlug(slug);
  if (category !== null) return { kind: "category", category };
  return null;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) return {};

  const region = await getCurrentRegion();
  const areaName = region.brandName.split(" ")[0];

  const title =
    resolved.kind === "day"
      ? `${areaName} Happy Hour & Food Specials on ${dayLabel(resolved.dow)}`
      : `${areaName} ${categoryPageLabel(resolved.category)} Deals`;
  const description =
    resolved.kind === "day"
      ? `What's actually running on ${dayLabel(resolved.dow)} in ${areaName} -- happy hours and food/drink specials, checked regularly, not a stale list from last year.`
      : `${categoryPageLabel(resolved.category)} deals actually running in ${areaName} -- checked regularly, pulled from each venue's own menu, not guessed.`;

  return {
    title,
    description,
    alternates: { canonical: `/${region.slug}/${slug}` },
    openGraph: { title, description, url: `/${region.slug}/${slug}` },
  };
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) notFound();

  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const { timezone, province } = await getRegionContext(region);
  // Category pages (e.g. /kelowna/wing-night) have no day of their own -- SpecialsBoard
  // defaults selectedDay to "today" whenever initialDay isn't passed, so that's the day
  // actually rendered/hydrated either way. Only a day page (e.g. /kelowna/saturday)
  // overrides this with the specific day the page is about.
  const dayToLoad = resolved.kind === "day" ? resolved.dow : todayDowInRegion(timezone);
  const [specials, categorySponsors] = await Promise.all([
    getSpecialsWithVenueForDay(region.id, dayToLoad),
    getActiveCategorySponsors([region.id]),
  ]);

  const areaName = region.brandName.split(" ")[0];
  const dow = resolved.kind === "day" ? resolved.dow : undefined;
  const jsonLd = buildSpecialsJsonLd(specials, region.brandName, timezone, province.code, dow);

  const heading =
    resolved.kind === "day"
      ? `${areaName} Happy Hour & Food Specials on ${dayLabel(resolved.dow)}`
      : `${areaName} ${categoryPageLabel(resolved.category)} Deals`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(SITE_URL, [
    { name: "Home", path: "/" },
    { name: region.brandName, path: `/${region.slug}` },
    { name: heading, path: `/${region.slug}/${slug}` },
  ]);
  const subtitle =
    resolved.kind === "day"
      ? "What's actually running today, verified regularly -- not a stale list."
      : "Checked regularly, pulled from each venue's own menu -- not guessed.";

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6 gap-5 sm:gap-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader active="specials" heading={heading} subtitle={subtitle} />

      <SpecialsBoard
        specials={specials}
        categorySponsors={categorySponsors}
        timezone={timezone}
        regionSlug={region.slug}
        lang={lang}
        initialDay={dow}
        initialCategory={resolved.kind === "category" ? resolved.category : undefined}
        regionLat={region.lat}
        regionLng={region.lng}
      />

      <TipJar regionSlug={region.slug} lang={lang} />
      <FAQSection lang={lang} />
      <SiteFooter />
    </div>
  );
}
