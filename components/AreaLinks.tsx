import type { Town } from "@/lib/towns";
import type { NearbyRegion } from "@/lib/nearby-regions";
import { areaNameFromBrand } from "@/lib/page-titles";

const COPY = {
  en: { towns: "Browse by town:", nearby: "Also near here:", allOf: (area: string) => `All of ${area}` },
  fr: { towns: "Par ville :", nearby: "Aussi près d'ici :", allOf: (area: string) => `Tout ${area}` },
};

// Real, crawlable links to the town pages of this region and to the neighbouring regions. Server
// rendered on purpose: the board above is client-side, so without these links a search engine
// would only learn the town pages exist from the sitemap, a much weaker signal than a link on the
// page. For a visitor, the neighbouring-region row is the quick way to the next town over.
export function AreaLinks({
  regionSlug,
  regionBrand,
  towns,
  nearby,
  currentTownSlug,
  lang = "en",
}: {
  regionSlug: string;
  regionBrand: string;
  towns: Town[];
  nearby: NearbyRegion[];
  currentTownSlug?: string;
  lang?: string;
}) {
  const tr = lang === "fr" ? COPY.fr : COPY.en;
  const area = areaNameFromBrand(regionBrand);
  if (towns.length === 0 && nearby.length === 0) return null;
  return (
    <nav aria-label="Nearby places" className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted flex flex-col gap-2">
      {towns.length > 0 && (
        <p className="flex flex-wrap gap-x-1.5 gap-y-1">
          <span>{tr.towns}</span>
          {currentTownSlug && (
            <a href={`/${regionSlug}`} className="text-accent-dim underline">
              {tr.allOf(area)}
            </a>
          )}
          {towns
            .filter((t) => t.slug !== currentTownSlug)
            .map((t) => (
              <a key={t.slug} href={`/${regionSlug}/${t.slug}`} className="text-accent-dim underline">
                {t.city}
              </a>
            ))}
        </p>
      )}
      {nearby.length > 0 && (
        <p className="flex flex-wrap gap-x-1.5 gap-y-1">
          <span>{tr.nearby}</span>
          {nearby.map((r) => (
            <a key={r.slug} href={`/${r.slug}`} className="text-accent-dim underline">
              {areaNameFromBrand(r.brandName)}
            </a>
          ))}
        </p>
      )}
    </nav>
  );
}
