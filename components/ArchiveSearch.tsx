"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatVerifiedRelative } from "@/lib/time";
import type { SpecialCategory } from "@/db/schema";

interface ArchiveItem {
  id: number;
  title: string;
  priceCents: number | null;
  category: SpecialCategory;
  dayLabel: string | null;
  archivedAt: Date;
}

export interface ArchiveVenue {
  venueId: number;
  venueName: string;
  items: ArchiveItem[];
}

export function ArchiveSearch({ venues }: { venues: ArchiveVenue[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) => v.venueName.toLowerCase().includes(q));
  }, [venues, query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search venues…"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-2 text-sm">No venues match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((v) => (
            <section key={v.venueId} className="flex flex-col gap-2">
              <h2 className="font-display text-lg text-foreground">
                <Link href={`/venues/${v.venueId}`} className="hover:underline">
                  {v.venueName}
                </Link>
              </h2>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
                {v.items.map((s) => {
                  const price = formatPrice(s.priceCents);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 opacity-70"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-foreground/90 truncate">{s.title}</span>
                        <span className="text-xs text-muted-2">
                          {CATEGORY_LABELS[s.category]}
                          {s.dayLabel && s.dayLabel !== "Daily" ? ` · ${s.dayLabel}` : ""} · retired{" "}
                          {formatVerifiedRelative(s.archivedAt).replace("verified", "")}
                        </span>
                      </div>
                      {price && (
                        <span className="font-mono-tabular text-sm text-muted shrink-0">
                          {price}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
