import type { GuideLink } from "@/lib/guide-links";

const COPY = {
  en: { lead: (n: number) => (n === 1 ? "Read our guide:" : "Read our guides:") },
  fr: { lead: (n: number) => (n === 1 ? "Lire notre guide :" : "Lire nos guides :") },
};

// Plain server-rendered links to the region's guides. Kept as real anchors, like AreaLinks, so a
// crawler sees the link without running the client-side board above.
export function GuideLinks({ links, lang = "en" }: { links: GuideLink[]; lang?: string }) {
  if (links.length === 0) return null;
  const tr = lang === "fr" ? COPY.fr : COPY.en;
  return (
    <nav aria-label="Guides" className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted flex flex-col gap-2">
      <p>{tr.lead(links.length)}</p>
      <ul className="flex flex-col gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="text-accent-dim underline">
              {l.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
