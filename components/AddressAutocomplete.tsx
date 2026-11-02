"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/places-autocomplete";

// A text box that suggests addresses as you type (Google Places, through our own /api/places/autocomplete
// so the API key stays on the server). If suggestions are switched off (no key) or fail, it is just a
// normal text box: typing and submitting work exactly as before.
export function AddressAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const disabled = useRef(false);
  const session = useRef<string>("");
  const skipNext = useRef(false); // set after picking a suggestion so we do not immediately re-search
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled.current || skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) return; // the list is hidden below 3 characters (see render)
    if (!session.current) session.current = crypto.randomUUID();
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}&s=${session.current}`, { signal: ctl.signal });
        if (res.status === 503) {
          disabled.current = true; // suggestions are not configured; stop asking
          return;
        }
        if (!res.ok) return;
        const json = (await res.json()) as { suggestions?: AddressSuggestion[] };
        setItems(json.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // aborted or offline: keep the plain box
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(s: AddressSuggestion) {
    skipNext.current = true;
    onChange(s.text.replace(/,\s*Canada$/, ""));
    setItems([]);
    setOpen(false);
    session.current = ""; // a new typing session starts with the next search
  }

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && value.trim().length >= 3 && items.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {items.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-accent/10" : ""}`}
            >
              <span className="text-foreground">{s.main}</span>
              {s.secondary && <span className="text-muted-2"> {s.secondary}</span>}
            </li>
          ))}
          {/* Google requires its attribution next to Autocomplete suggestions shown outside a Google map. */}
          <li role="presentation" className="px-3 py-1 text-right text-[10px] text-muted-2">
            Google Maps
          </li>
        </ul>
      )}
    </div>
  );
}
