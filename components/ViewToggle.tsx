"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Language } from "@/lib/i18n";
import { chatText } from "@/lib/chat-text";

// List/Map switch. The board that owns the `view` state renders this, but the
// buttons are portalled into the header's #view-toggle-slot (see SiteHeader) so
// they sit in the top pill row, just before Share. If the slot isn't on the page
// (or before hydration) it renders in place, so the toggle never disappears.
export function ViewToggle({ view, onChange, lang = "en" }: { view: "list" | "map"; onChange: (v: "list" | "map") => void; lang?: Language }) {
  const c = chatText(lang);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("view-toggle-slot"));
  }, []);

  const toggle = (
    <div className="flex gap-1 rounded-full border border-border p-1 text-sm self-start">
      {(["list", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`press-pill rounded-full px-4 py-1.5 font-medium capitalize ${
            view === v ? "bg-accent text-background" : "text-muted"
          }`}
        >
          {v === "list" ? c.list : c.map}
        </button>
      ))}
    </div>
  );

  return slot ? createPortal(toggle, slot) : toggle;
}
