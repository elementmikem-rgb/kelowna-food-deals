import Link from "next/link";
import { getCurrentRegion } from "@/lib/regions";
import { t, getEffectiveLanguage } from "@/lib/i18n";

// "blog" has no nav tab of its own — it just means neither tab is the active one.
// "monthly" isn't a tab here either -- it moved to a chip at the end of the
// category filter row on the Specials page (CategoryFilter.tsx) so it's not
// mixed in among the two most-used tabs; the /monthly page itself is unchanged.
export async function SiteNav({ active }: { active: "specials" | "events" | "monthly" | "blog" }) {
  const region = await getCurrentRegion();
  const nav = t(await getEffectiveLanguage(region)).nav;
  const base = `/${region.slug}`;
  return (
    <nav className="flex gap-2">
      <Link
        href={base}
        data-selected={active === "specials"}
        className={`press-pill rounded-full px-4 py-1.5 text-sm border ${
          active === "specials"
            ? "bg-accent text-background border-accent"
            : "bg-transparent text-muted border-border hover:border-muted"
        }`}
      >
        {nav.specials}
      </Link>
      <Link
        href={`${base}/events`}
        data-selected={active === "events"}
        className={`press-pill rounded-full px-4 py-1.5 text-sm border ${
          active === "events"
            ? "bg-accent text-background border-accent"
            : "bg-transparent text-muted border-border hover:border-muted"
        }`}
      >
        {nav.events}
      </Link>
    </nav>
  );
}
