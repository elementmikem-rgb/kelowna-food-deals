"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingBooking } from "@/lib/bookings-data";
import { formatPrice } from "@/lib/format";

export function PendingBookingsPanel({ pending }: { pending: PendingBooking[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: number, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Pending bookings</h2>
      <p className="text-sm text-muted">Paid, awaiting your approval before they go live.</p>

      {pending.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing pending.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground/90">
                    {b.productType} — {b.venueName ?? b.specialTitle ?? b.category}
                  </span>
                  <span className="text-xs text-muted-2">
                    {b.startDate} to {b.endDate} · {formatPrice(b.priceCents)} · {b.buyerEmail}
                  </span>
                  {b.conflictDetected && (
                    <span className="text-xs text-stale">
                      Conflict: another booking now overlaps these dates — check before approving.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(b.id, "approve")}
                    disabled={busyId === b.id}
                    className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act(b.id, "reject")}
                    disabled={busyId === b.id}
                    className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}
