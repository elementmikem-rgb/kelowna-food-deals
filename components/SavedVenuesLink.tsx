"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedVenues } from "@/lib/saved-venues";
import { t, type Language } from "@/lib/i18n";

// Small header link to "My Spots" -- starts at 0 (no localStorage during SSR/first
// paint) and corrects on mount, same SSR-vs-client pattern as SaveVenueButton.
// Re-reads on window focus so returning from a venue page where something was just
// saved/removed updates the count without a full page reload.
export function SavedVenuesLink({ regionSlug, lang = "en" }: { regionSlug: string; lang?: Language }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function refresh() {
      setCount(getSavedVenues().length);
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href={`/${regionSlug}/saved`}
      className="press-pill inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-muted hover:text-foreground shrink-0"
    >
      {t(lang).nav.mySpots(count)}
    </Link>
  );
}
