import Link from "next/link";

// "blog" has no nav tab of its own — it just means neither tab is the active one.
export function SiteNav({ active }: { active: "specials" | "events" | "blog" }) {
  return (
    <nav className="flex gap-2">
      <Link
        href="/"
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
        href="/events"
        data-selected={active === "events"}
        className={`press-pill rounded-full px-4 py-1.5 text-sm border ${
          active === "events"
            ? "bg-accent text-background border-accent"
            : "bg-transparent text-muted border-border hover:border-muted"
        }`}
      >
        Events
      </Link>
    </nav>
  );
}
