"use client";

import { useEffect, useState } from "react";
import type { BookingProductType, SpecialCategory } from "@/db/schema";
import { CATEGORY_LABELS, formatPrice } from "@/lib/format";
import { stripeFeeCents } from "@/lib/stripe-fee";
import { daysInclusive } from "@/lib/time";

interface VenueOption {
  id: number;
  name: string;
}
interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}
interface Settings {
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

const CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];

export function BookingFlow({
  productType,
  venues,
  specials,
  settings,
  initialVerifiedToken,
  todayISO,
}: {
  productType: BookingProductType;
  venues: VenueOption[];
  specials: SpecialOption[];
  settings: Settings;
  initialVerifiedToken: string | null;
  todayISO: string;
}) {
  const [open, setOpen] = useState(initialVerifiedToken !== null);
  const [venueId, setVenueId] = useState<number | "">("");
  const [specialId, setSpecialId] = useState<number | "">("");
  const [category, setCategory] = useState<SpecialCategory>("happy_hour");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<"unknown" | "checking" | "available" | "unavailable">("unknown");
  const [step, setStep] = useState<"form" | "sent" | "checkout">(initialVerifiedToken ? "checkout" : "form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) {
      setAvailability("unknown");
      return;
    }
    setAvailability("checking");
    const controller = new AbortController();
    // Debounced: the date inputs fire on every change, and without this a buyer
    // scrubbing through dates burns one request per keystroke and trips the
    // endpoint's rate limit on their own legitimate browsing.
    const timer = setTimeout(() => {
      fetch("/api/bookings/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          category: productType === "category_sponsor" ? category : null,
          startDate,
          endDate,
        }),
        signal: controller.signal,
      })
        .then(async (r) => {
          // A 429 or a 5xx is not a "sold out" answer. Treating it as one used to
          // disable the purchase button on a product that may well be available.
          // "unknown" leaves the button live; checkout re-checks authoritatively
          // inside its transaction anyway, so nothing can oversell.
          if (!r.ok) return setAvailability("unknown");
          const data = await r.json();
          setAvailability(data.available ? "available" : "unavailable");
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [productType, category, startDate, endDate]);

  const venueSpecials = specials.filter((s) => s.venueId === venueId);

  async function requestVerification() {
    setError(null);
    if (!venueId) return setError("Pick your venue.");
    if (productType === "boost" && !specialId) return setError("Pick which special to boost.");
    if (!startDate || !endDate || endDate < startDate) return setError("Pick valid dates.");
    if (!email) return setError("Enter your email.");

    setBusy(true);
    try {
      const res = await fetch("/api/bookings/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          venueId,
          specialId: productType === "boost" ? specialId : null,
          category: productType === "category_sponsor" ? category : null,
          startDate,
          endDate,
          buyerEmail: email,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function goToCheckout() {
    if (!initialVerifiedToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedToken: initialVerifiedToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start"
      >
        Get started
      </button>
    );
  }

  if (step === "checkout") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
        <p className="text-sm text-foreground/90">Email verified — ready to pay.</p>
        {error && <p className="text-sm text-stale">{error}</p>}
        <button
          onClick={goToCheckout}
          disabled={busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start disabled:opacity-50"
        >
          {busy ? "Redirecting…" : "Continue to payment"}
        </button>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <p className="text-sm text-muted">
        Check {email} for a confirmation link — it expires in 15 minutes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Venue
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Select a venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>

      {productType === "boost" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Which special?
          <select
            value={specialId}
            onChange={(e) => setSpecialId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select a special…</option>
            {venueSpecials.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {productType === "category_sponsor" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SpecialCategory)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Start date
          <input
            type="date"
            min={todayISO}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>

      {availability === "checking" && <p className="text-xs text-muted-2">Checking availability…</p>}
      {availability === "unavailable" && (
        <p className="text-xs text-stale">Not available for those dates — try a different range.</p>
      )}
      {availability === "available" && startDate && endDate && (() => {
        const days = daysInclusive(startDate, endDate);
        const baseCents = settings.priceCentsPerDay * days;
        const feeCents = stripeFeeCents(baseCents);
        return (
          <p className="text-xs text-muted-2">
            Available. {formatPrice(settings.priceCentsPerDay)}/day × {days} day{days === 1 ? "" : "s"} ={" "}
            {formatPrice(baseCents)} + {formatPrice(feeCents)} card processing fee ={" "}
            <strong className="text-foreground/80">{formatPrice(baseCents + feeCents)} total</strong>
            {" "}(between {settings.minDays} and {settings.maxDays} days).
          </p>
        );
      })()}

      <label className="flex flex-col gap-1 text-sm text-muted">
        Your email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourvenue.com"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        onClick={requestVerification}
        disabled={busy || availability === "unavailable"}
        className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium self-start disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send verification email"}
      </button>
    </div>
  );
}
