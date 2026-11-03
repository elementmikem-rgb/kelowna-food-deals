"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isVenueSaved, toggleSavedVenue } from "@/lib/saved-venues";
import { t, type Language } from "@/lib/i18n";

// Reads localStorage in an effect, not during render -- render must match between
// server and this client component's first paint (SSR has no localStorage at all),
// so it starts unsaved and corrects itself on mount, same pattern as
// SpecialsBoard's initialToday/today split for the same SSR-vs-client reason.
// Toast wording is local so it does not touch the shared translation table.
const TOAST_TEXT = {
  en: {
    saved: (name: string) => `Saved ${name}`,
    removed: (name: string) => `Removed ${name}`,
    undo: "Undo",
  },
  fr: {
    saved: (name: string) => `${name} sauvegardé`,
    removed: (name: string) => `${name} retiré`,
    undo: "Annuler",
  },
} as const;

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
  // Which action the undo toast is announcing (null = no toast).
  const [toast, setToast] = useState<"saved" | "removed" | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastText = TOAST_TEXT[lang === "fr" ? "fr" : "en"];

  useEffect(() => {
    setSaved(isVenueSaved(venueId));
  }, [venueId]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(kind: "saved" | "removed") {
    setToast(kind);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  // The state flips immediately (the saved list is local), then a short toast
  // offers to reverse it.
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSavedVenue({ venueId, venueName, regionSlug });
    setSaved(nowSaved);
    showToast(nowSaved ? "saved" : "removed");
  }

  function handleUndo() {
    setSaved(toggleSavedVenue({ venueId, venueName, regionSlug }));
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }

  return (
    <>
    <button
      onClick={handleClick}
      aria-label={saved ? tr.card.removeAriaLabel(venueName) : tr.card.saveAriaLabel(venueName)}
      aria-pressed={saved}
      className={`press-pill hit-44 relative z-10 shrink-0 rounded-full border px-2 py-1 text-xs ${
        saved
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:border-muted hover:text-foreground"
      } ${className}`}
    >
      {saved ? `★ ${tr.card.saved}` : `☆ ${tr.card.save}`}
    </button>
    {toast &&
      createPortal(
        <div
          role="status"
          className="fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground shadow-lg bottom-[calc(5rem+env(safe-area-inset-bottom))] max-w-[calc(100vw-2rem)]"
        >
          <span className="truncate">
            {toast === "saved" ? toastText.saved(venueName) : toastText.removed(venueName)}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="hit-44 shrink-0 font-medium text-accent hover:text-accent-dim"
          >
            {toastText.undo}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
