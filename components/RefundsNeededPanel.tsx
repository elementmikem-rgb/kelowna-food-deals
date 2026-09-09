"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RefundNeeded } from "@/lib/bookings-data";
import { formatPrice } from "@/lib/format";

export function RefundsNeededPanel({ refunds }: { refunds: RefundNeeded[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function markDone(id: number) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/bookings/${id}/mark-refunded`, { method: "POST" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (refunds.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Refunds needed</h2>
      <p className="text-sm text-muted">
        Rejected bookings that were already paid — refund these in Stripe&apos;s dashboard directly,
        then mark done here.
      </p>
      <ul className="flex flex-col gap-2">
        {refunds.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stale/40 bg-surface px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground/90">
                {r.productType} — {formatPrice(r.priceCents)}
              </span>
              <span className="text-xs text-muted-2">
                {r.buyerEmail} · payment intent: {r.stripePaymentIntentId ?? "unknown"}
              </span>
            </div>
            <button
              onClick={() => markDone(r.id)}
              disabled={busyId === r.id}
              className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
            >
              Mark refunded
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
