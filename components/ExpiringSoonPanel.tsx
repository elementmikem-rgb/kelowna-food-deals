import type { ExpiringSoonItem } from "@/lib/sponsored-data";
import { formatCheckedAt } from "@/lib/time";

// Pure visibility, no actions -- renewing still happens through each kind's own panel
// below. Mirrors RefundsNeededPanel.tsx's "needs attention" shape.
export function ExpiringSoonPanel({ items }: { items: ExpiringSoonItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Expiring soon</h2>
      <p className="text-sm text-muted">
        Paid placements lapsing within 3 days -- renew below if you don&rsquo;t want to lose it.
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-stale/40 bg-surface px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground/90">
                {item.venueName}
                {item.detail ? ` -- ${item.detail}` : ""}
              </span>
              <span className="text-xs text-muted-2">{item.kind}</span>
            </div>
            <span className="text-xs text-muted-2 shrink-0">until {formatCheckedAt(item.expiresAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
