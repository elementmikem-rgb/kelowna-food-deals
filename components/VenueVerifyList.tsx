"use client";

import { useState } from "react";

interface VerifySpecial {
  id: number;
  title: string;
  description: string | null;
  venueConfirmedAt: Date | null;
}

export function VenueVerifyList({
  venueId,
  token,
  specials,
}: {
  venueId: number;
  token: string;
  specials: VerifySpecial[];
}) {
  const [confirmed, setConfirmed] = useState<Set<number>>(
    new Set(specials.filter((s) => s.venueConfirmedAt !== null).map((s) => s.id))
  );
  const [pending, setPending] = useState<number | null>(null);

  async function confirm(specialId: number) {
    setPending(specialId);
    try {
      const res = await fetch("/api/venue-verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, token, specialId }),
      });
      if (res.ok) setConfirmed((prev) => new Set(prev).add(specialId));
    } finally {
      setPending(null);
    }
  }

  if (specials.length === 0) {
    return <p className="text-sm text-muted">No active specials listed right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-3 w-full max-w-md">
      {specials.map((s) => (
        <li key={s.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{s.title}</p>
            {s.description && <p className="text-xs text-muted">{s.description}</p>}
          </div>
          <button
            onClick={() => confirm(s.id)}
            disabled={confirmed.has(s.id) || pending === s.id}
            className="press-pill shrink-0 rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {confirmed.has(s.id) ? "✓ Confirmed" : pending === s.id ? "…" : "Yes, this is accurate"}
          </button>
        </li>
      ))}
    </ul>
  );
}
