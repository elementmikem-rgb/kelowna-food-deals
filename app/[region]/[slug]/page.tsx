import { areaNameFromBrand } from "@/lib/page-titles";
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
import { AreaLinks } from "@/components/AreaLinks";
import { buildSpecialsJsonLd, buildBreadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { getEffectiveLanguage } from "@/lib/i18n";
import { dayFromSlug, dayLabel } from "@/lib/day-slugs";
import { categoryFromSlug, categoryPageLabel } from "@/lib/category-slugs";
import { getTownsForRegion, townSlug, type Town } from "@/lib/towns";
import { getNearbyRegions } from "@/lib/nearby-regions";
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

// This one folder serves three kinds of SEO landing page -- a day (/kelowna/saturday), a
// category (/kelowna/wing-night) or a town (/kelowna/west-kelowna) -- because Next.js
// only allows a single dynamic segment name per path depth, so [day], [category] and [town]
// can't coexist as sibling folders under app/[region]/. Day and category slugs are checked
// first (lib/day-slugs.ts and lib/category-slugs.ts don't overlap, and lib/towns.ts never
// produces a slug that collides with either), so the already-live URLs stay unchanged.
type SlugKind =
  | { kind: "day"; dow: number }
  | { kind: "category"; category: SpecialCategory }
  | { kind: "town"; town: Town };

type PageRegion = Awaited<ReturnType<typeof getCurrentRegion>>;

async function resolveSlug(slug: string, region: PageRegion): Promise<SlugKind | null> {
  const dow = dayFromSlug(slug);
  if (dow !== null) return { kind: "day", dow };
  const category = categoryFromSlug(slug);
  if (category !== null) return { kind: "category", category };
  const towns = await getTownsForRegion(region.id, region.slug, areaNameFromBrand(region.brandName));
  const town = towns.find((t) => t.slug === slug);
  return town ? { kind: "town", town } : null;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = await getCurrentRegion();
  const resolved = await resolveSlug(slug, region);
  if (!resolved) return {};

  const areaName = areaNameFromBrand(region.brandName);

  let title: string;
  let description: string;
  if (resolved.kind === "day") {
    title = `${areaName} Happy Hour & Food Specials on ${dayLabel(resolved.dow)}`;
    description = `What's actually running on ${dayLabel(resolved.dow)} in ${areaName} -- happy hours and food/drink specials, checked regularly, not a stale list from last year.`;
  } else if (resolved.kind === "category") {
    title = `${areaName} ${categoryPageLabel(resolved.category)} Deals`;
    description = `${categoryPageLabel(resolved.category)} deals actually running in ${areaName} -- checked regularly, pulled from each venue's own menu, not guessed.`;
  } else {
    title = `${resolved.town.city} Happy Hour & Food Specials Today`;
    description = `Happy hours and food/drink specials running today in ${resolved.town.city}: ${resolved.town.venueCount} places, checked regularly and pulled from each venue's own menu, not guessed.`;
  }

  return {
    title,
    description,
    alternates: { canonical: `/${region.slug}/${slug}` },
    openGraph: { title, description, url: `/${region.slug}/${slug}` },
  };
}

function townIntro(
  town: Town,
  venueNames: string[],
  brandName: string,
  lang: string
): string {
  const n = venueNames.length;
  // A name ending in a period ("Lakesider Brewing Co.") would double up with the sentence end.
  const sample = venueNames.slice(0, 3).map((name) => name.replace(/\.+$/, ""));
  const list =
    sample.length === 0
      ? ""
      : sample.length === 1
        ? sample[0]
        : `${sample.slice(0, -1).join(", ")} ${lang === "fr" ? "et" : "and"} ${sample[sample.length - 1]}`;
  if (lang === "fr") {
    return n === 0
      ? `${brandName} suit les promotions de ${town.city}. Rien n'est affiché pour aujourd'hui pour l'instant.`
      : `${n} ${n === 1 ? "endroit" : "endroits"} à ${town.city} ${n === 1 ? "a" : "ont"} des promotions aujourd'hui, dont ${list}. ${brandName} vérifie chacune sur le site ou le menu du commerce.`;
  }
  return n === 0
    ? `${brandName} tracks deals in ${town.city}. Nothing is listed for today yet.`
    : `${n} ${n === 1 ? "place" : "places"} in ${town.city} ${n === 1 ? "has" : "have"} food or drink specials today, including ${list}. ${brandName} checks each one against the venue's own website or menu, so what you see here is what's running.`;
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const region = await getCurrentRegion();
  const resolved = await resolveSlug(slug, region);
  if (!resolved) notFound();

  const lang = await getEffectiveLanguage(region);
  const { timezone, province } = await getRegionContext(region);
  // Category and town pages have no day of their own -- SpecialsBoard defaults selectedDay to
  // "today" whenever initialDay isn't passed, so that's the day actually rendered/hydrated
  // either way. Only a day page (e.g. /kelowna/saturday) overrides this with the specific day
  // the page is about.
  const dayToLoad = resolved.kind === "day" ? resolved.dow : todayDowInRegion(timezone);
  const areaName = areaNameFromBrand(region.brandName);
  const [specials, categorySponsors, towns, nearby] = await Promise.all([
    getSpecialsWithVenueForDay(region.id, dayToLoad),
    getActiveCategorySponsors([region.id]),
    getTownsForRegion(region.id, region.slug, areaName),
    getNearbyRegions(region),
  ]);

  // A town page's structured data lists only that town's specials.
  const pageSpecials =
    resolved.kind === "town"
      ? specials.filter((s) => townSlug(s.venueCity ?? "") === resolved.town.slug)
      : specials;
  const dow = resolved.kind === "day" ? resolved.dow : undefined;
  const jsonLd = buildSpecialsJsonLd(pageSpecials, region.brandName, timezone, province.code, dow);

  const heading =
    resolved.kind === "day"
      ? `${areaName} Happy Hour & Food Specials on ${dayLabel(resolved.dow)}`
      : resolved.kind === "category"
        ? `${areaName} ${categoryPageLabel(resolved.category)} Deals`
        : `${resolved.town.city} Happy Hour & Food Specials`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(SITE_URL, [
    { name: "Home", path: "/" },
    { name: region.brandName, path: `/${region.slug}` },
    { name: heading, path: `/${region.slug}/${slug}` },
  ]);
  const subtitle =
    resolved.kind === "day"
      ? "What's actually running today, verified regularly -- not a stale list."
      : resolved.kind === "category"
        ? "Checked regularly, pulled from each venue's own menu -- not guessed."
        : `What's actually running today in ${resolved.town.city}, verified regularly -- not a stale list.`;

  const townVenueNames =
    resolved.kind === "town"
      ? [...new Set(pageSpecials.map((s) => s.venueName))].sort((a, b) => a.localeCompare(b))
      : [];

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

      {resolved.kind === "town" && (
        <p className="text-sm text-muted -mt-2">{townIntro(resolved.town, townVenueNames, region.brandName, lang)}</p>
      )}

      <SpecialsBoard
        specials={specials}
        categorySponsors={categorySponsors}
        timezone={timezone}
        regionSlug={region.slug}
        lang={lang}
        initialDay={dow}
        initialCategory={resolved.kind === "category" ? resolved.category : undefined}
        initialCity={resolved.kind === "town" ? resolved.town.city : undefined}
        regionLat={region.lat}
        regionLng={region.lng}
      />

      <TipJar regionSlug={region.slug} lang={lang} />
      <AreaLinks
        regionSlug={region.slug}
        regionBrand={region.brandName}
        towns={towns}
        nearby={nearby}
        currentTownSlug={resolved.kind === "town" ? resolved.town.slug : undefined}
        lang={lang}
      />
      <FAQSection lang={lang} />
      <SiteFooter />
    </div>
  );
}
