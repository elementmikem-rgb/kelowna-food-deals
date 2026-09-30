"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedVenues, toggleSavedVenue, type SavedVenue } from "@/lib/saved-venues";

// Pure client component -- localStorage doesn't exist during SSR, so this renders
// nothing useful server-side and fills in on mount, same pattern as SaveVenueButton.
export function SavedVenuesBoard() {
  const [venues, setVenues] = useState<SavedVenue[] | null>(null);

  useEffect(() => {
    setVenues(getSavedVenues());
  }, []);

  function remove(v: SavedVenue) {
    toggleSavedVenue(v);
    setVenues(getSavedVenues());
  }

  if (venues === null) return null; // brief flash before mount -- avoids an "empty" flicker

  if (venues.length === 0) {
    return (
      <p className="text-muted-2 text-sm py-8 text-center">
        Nothing saved yet -- tap ☆ Save on any venue to keep it here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {venues.map((v) => (
        <li key={v.venueId} className="flex items-center justify-between gap-3 py-3">
          <Link
            href={`/${v.regionSlug}/venues/${v.venueId}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {v.venueName}
          </Link>
          <button
            onClick={() => remove(v)}
            className="press-pill shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-muted hover:text-foreground"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
