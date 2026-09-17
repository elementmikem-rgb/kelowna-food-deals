"use client";

import { useEffect, useState } from "react";
import type { BookingProductType, SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, formatPrice } from "@/lib/format";
import { stripeFeeCents } from "@/lib/stripe-fee";
import { daysInclusive } from "@/lib/time";
import { fileToBase64 } from "@/lib/client-image";

interface VenueOption {
  id: number;
  name: string;
}
interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}
interface EventOption {
  id: number;
  venueId: number;
  title: string;
}
interface Settings {
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}
interface PhotoAddOn {
  priceCentsPerDay: number;
}

const SPECIAL_CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];
const EVENT_TYPES: EventType[] = ["live_music", "trivia", "karaoke", "sports_night", "other"];


export function BookingFlow({
  productType,
  venues,
  specials,
  events,
  settings,
  photoAddOn,
  initialVerifiedToken,
  todayISO,
  regionSlug,
}: {
  productType: BookingProductType;
  venues: VenueOption[];
  specials: SpecialOption[];
  events: EventOption[];
  settings: Settings;
  // "boost" only -- absent/undefined means the add-on isn't offered (e.g. not yet
  // configured server-side), not just $0.
  photoAddOn?: PhotoAddOn;
  initialVerifiedToken: string | null;
  todayISO: string;
  regionSlug: string;
}) {
  const [open, setOpen] = useState(initialVerifiedToken !== null);
  const [venueId, setVenueId] = useState<number | "">("");
  const [boostTargetKey, setBoostTargetKey] = useState<string>(""); // "special:12" or "event:34"
  const [categoryKind, setCategoryKind] = useState<SponsorCategoryKind>("special");
  const [category, setCategory] = useState<SpecialCategory | EventType>("happy_hour");
  const [wantsPhotoAddOn, setWantsPhotoAddOn] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<"unknown" | "checking" | "available" | "unavailable">("unknown");
  const [step, setStep] = useState<"form" | "sent" | "checkout">(initialVerifiedToken ? "checkout" : "form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const perDayCents = settings.priceCentsPerDay + (wantsPhotoAddOn && photoAddOn ? photoAddOn.priceCentsPerDay : 0);

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
          categoryKind: productType === "category_sponsor" ? categoryKind : null,
          startDate,
          endDate,
          regionSlug,
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
  }, [productType, category, categoryKind, startDate, endDate, regionSlug]);

  const venueSpecials = specials.filter((s) => s.venueId === venueId);
  const venueEvents = events.filter((e) => e.venueId === venueId);
  const [boostKind, boostIdStr] = boostTargetKey.split(":");
  const boostId = boostIdStr ? Number(boostIdStr) : null;

  async function requestVerification() {
    setError(null);
    if (!venueId) return setError("Pick your venue.");
    if (productType === "boost" && !boostTargetKey) return setError("Pick a special or event to boost.");
    if (wantsPhotoAddOn && !photoFile) return setError("Choose a photo, or uncheck the photo add-on.");
    if (!startDate || !endDate || endDate < startDate) return setError("Pick valid dates.");
    if (!email) return setError("Enter your email.");

    setBusy(true);
    try {
      const hasPhotoAddOn = productType === "boost" && wantsPhotoAddOn;
      const photo = hasPhotoAddOn && photoFile ? await fileToBase64(photoFile) : null;
      const res = await fetch("/api/bookings/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          venueId,
          specialId: productType === "boost" && boostKind === "special" ? boostId : null,
          eventId: productType === "boost" && boostKind === "event" ? boostId : null,
          category: productType === "category_sponsor" ? category : null,
          categoryKind: productType === "category_sponsor" ? categoryKind : null,
          hasPhotoAddOn,
          photoData: photo?.data ?? null,
          photoMimeType: photo?.mimeType ?? null,
          startDate,
          endDate,
          buyerEmail: email,
          regionSlug,
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
        body: JSON.stringify({ verifiedToken: initialVerifiedToken, regionSlug }),
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium"
        >
          Get started
        </button>
        <span className="text-xs text-muted-2">
          from {formatPrice(settings.priceCentsPerDay)}/day &middot; {settings.minDays}&ndash;{settings.maxDays} days
        </span>
      </div>
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
      <p className="text-xs text-muted-2 -mb-1">
        {formatPrice(settings.priceCentsPerDay)}/day &middot; {settings.minDays}&ndash;{settings.maxDays}{" "}
        days &middot; exact total shown once you pick dates below.
      </p>
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
          Which special or event?
          <select
            value={boostTargetKey}
            onChange={(e) => setBoostTargetKey(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select a special or event…</option>
            {venueSpecials.length > 0 && (
              <optgroup label="Specials">
                {venueSpecials.map((s) => (
                  <option key={`special:${s.id}`} value={`special:${s.id}`}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            )}
            {venueEvents.length > 0 && (
              <optgroup label="Events">
                {venueEvents.map((e) => (
                  <option key={`event:${e.id}`} value={`event:${e.id}`}>
                    {e.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      {productType === "boost" && photoAddOn && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={wantsPhotoAddOn}
              onChange={(e) => {
                setWantsPhotoAddOn(e.target.checked);
                if (!e.target.checked) setPhotoFile(null);
              }}
            />
            Add a photo or poster (+{formatPrice(photoAddOn.priceCentsPerDay)}/day)
          </label>
          {wantsPhotoAddOn && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted"
            />
          )}
        </div>
      )}

      {productType === "category_sponsor" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Category
          <select
            value={`${categoryKind}:${category}`}
            onChange={(e) => {
              const [kind, cat] = e.target.value.split(":");
              setCategoryKind(kind as SponsorCategoryKind);
              setCategory(cat as SpecialCategory | EventType);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <optgroup label="Specials">
              {SPECIAL_CATEGORIES.map((c) => (
                <option key={`special:${c}`} value={`special:${c}`}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Events">
              {EVENT_TYPES.map((t) => (
                <option key={`event:${t}`} value={`event:${t}`}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
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
        const baseCents = perDayCents * days;
        const feeCents = stripeFeeCents(baseCents);
        return (
          <p className="text-xs text-muted-2">
            Available. {formatPrice(perDayCents)}/day × {days} day{days === 1 ? "" : "s"} ={" "}
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
