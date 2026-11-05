"use client";

import { useMemo, useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import type { Language } from "@/lib/i18n";
import { liveStatus } from "@/lib/live-status";
import { tagSpecial, type SpecialTag } from "@/lib/special-tags";
import { SpecialRow } from "./SpecialRow";
import { TagChipRow, usefulTags } from "./TagChipRow";

// Above this many, a venue's card starts crowding out everyone else's on the board (BNA Brewing and
// Cutwater Brewing both run past 10) -- the rest are one click away on the venue's own page. The chips
// let a visitor narrow a long card to what they came for (just the beer, just the food) without leaving.
const MAX_VISIBLE = 5;
// On now first, then coming up, then untimed, then finished (a stable sort keeps the board's own order inside each band).
const STATUS_ORDER = { live: 0, soon: 1, allday: 2, ended: 3 } as const;

export function VenueCardSpecials({
  specials,
  lang = "en",
  nowMin = null,
}: {
  specials: SpecialWithVenue[];
  lang?: Language;
  nowMin?: number | null;
}) {
  const [tag, setTag] = useState<SpecialTag | "all">("all");
  const tagged = useMemo(() => specials.map((s) => ({ s, tags: tagSpecial(s) })), [specials]);
  const chips = useMemo(() => usefulTags(tagged.map((x) => x.tags)), [tagged]);

  const shown = tagged.filter((x) => tag === "all" || x.tags.includes(tag)).map((x) => x.s);
  const ordered =
    nowMin === null
      ? shown
      : shown
          .map((s) => ({ s, k: STATUS_ORDER[liveStatus(s.startTime, s.endTime, nowMin).kind] }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.s);
  const visible = ordered.slice(0, MAX_VISIBLE);
  const hiddenCount = ordered.length - visible.length;

  return (
    <>
      {/* The card is one big link to the venue page; this row sits above it (z-10) so the chips can be tapped. */}
      <TagChipRow tags={chips} selected={tag} onSelect={setTag} lang={lang} className="relative z-10 mb-1.5" />

      <ul className="flex flex-col divide-y divide-border">
        {visible.map((s) => (
          <SpecialRow key={s.id} special={s} lang={lang} nowMin={nowMin} />
        ))}
      </ul>

      {hiddenCount > 0 && (
        <p className="relative z-10 pointer-events-none mt-1 pt-2 border-t border-dashed border-border text-xs font-medium text-accent-dim">
          + {hiddenCount} more -- view all {specials.length} specials →
        </p>
      )}
    </>
  );
}
