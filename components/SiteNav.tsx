import Link from "next/link";

export function SiteNav({ active }: { active: "specials" | "events" }) {
  return (
    <nav className="flex gap-2">
      <Link
        href="/"
        className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
          active === "specials"
            ? "bg-accent text-background border-accent"
            : "bg-transparent text-muted border-border hover:border-muted"
        }`}
      >
        Specials
      </Link>
      <Link
        href="/events"
        className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
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
