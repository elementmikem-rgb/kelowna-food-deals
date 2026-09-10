import Link from "next/link";
import { getCurrentRegion } from "@/lib/regions";

// "blog" has no nav tab of its own — it just means neither tab is the active one.
export async function SiteNav({ active }: { active: "specials" | "events" | "monthly" | "blog" }) {
  const region = await getCurrentRegion();
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
        Specials
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
        Events
      </Link>
      <Link
        href={`${base}/monthly`}
        data-selected={active === "monthly"}
        className={`press-pill rounded-full px-4 py-1.5 text-sm border ${
          active === "monthly"
            ? "bg-accent text-background border-accent"
            : "bg-transparent text-muted border-border hover:border-muted"
        }`}
      >
        Monthly
      </Link>
    </nav>
  );
}
