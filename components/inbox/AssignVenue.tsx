"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Found {
  id: number;
  name: string;
  address: string;
  city: string | null;
}

// Shown on a conversation from a sender that is not matched to any venue. Pick the venue, confirm, and the
// sender's messages move onto it (with the venue panel and apply buttons), and future mail from that address
// lands there too. It never changes the venue's contact email.
export function AssignVenue({ email }: { email: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(value: string) {
    setQ(value);
    setError(null);
    if (value.trim().length < 2) {
      setFound([]);
      return;
    }
    const res = await fetch(`/api/admin/inbox/venue-search?q=${encodeURIComponent(value.trim())}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;
    setFound(Array.isArray(data?.venues) ? data.venues : []);
  }

  async function assign(v: Found) {
    if (!window.confirm(`Assign ${email} to ${v.name}? Its messages move into that venue's conversation, and future mail from this address lands there too. The venue's contact email is not changed.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/inbox/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, venueId: v.id }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError("Could not assign. Try again.");
      return;
    }
    router.replace(`/admin/inbox/t/v${v.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm">
      <p className="font-medium text-foreground">This sender is not matched to a venue</p>
      <p className="text-xs text-muted-2">Search for the venue this is about, to get its panel and apply buttons.</p>
      <input
        value={q}
        onChange={(e) => void search(e.target.value)}
        placeholder="Venue name"
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent-dim"
      />
      {found.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
          {found.map((v) => (
            <li key={v.id}>
              <button
                disabled={busy}
                onClick={() => void assign(v)}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent-soft/30 disabled:opacity-50"
              >
                <span className="text-foreground">{v.name}</span>
                <span className="text-xs text-muted-2">{v.city ? `${v.city}, ` : ""}{v.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-stale">{error}</p>}
    </div>
  );
}
