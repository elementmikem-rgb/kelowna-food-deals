"use client";

import { useEffect, useState } from "react";
import { isVenueSaved, toggleSavedVenue } from "@/lib/saved-venues";
import { t, type Language } from "@/lib/i18n";

// Reads localStorage in an effect, not during render -- render must match between
// server and this client component's first paint (SSR has no localStorage at all),
// so it starts unsaved and corrects itself on mount, same pattern as
// SpecialsBoard's initialToday/today split for the same SSR-vs-client reason.
export function SaveVenueButton({
  venueId,
  venueName,
  regionSlug,
  className = "",
  lang = "en",
}: {
  venueId: number;
  venueName: string;
  regionSlug: string;
  className?: string;
  lang?: Language;
}) {
  const tr = t(lang);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isVenueSaved(venueId));
  }, [venueId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleSavedVenue({ venueId, venueName, regionSlug }));
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? tr.card.removeAriaLabel(venueName) : tr.card.saveAriaLabel(venueName)}
      aria-pressed={saved}
      className={`press-pill relative z-10 shrink-0 rounded-full border px-2 py-1 text-xs ${
        saved
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:border-muted hover:text-foreground"
      } ${className}`}
    >
      {saved ? `★ ${tr.card.saved}` : `☆ ${tr.card.save}`}
    </button>
  );
}
