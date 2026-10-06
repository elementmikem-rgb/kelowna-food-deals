"use client";

import { useState } from "react";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, formatPrice } from "@/lib/format";
import { stripeFeeCents } from "@/lib/stripe-fee";
import { daysInclusive } from "@/lib/time";
import { fileToBase64 } from "@/lib/client-image";

type ProductType = "featured" | "boost" | "category_sponsor" | "chat_term_sponsor" | "map_pin";
type SpecialCategory = "happy_hour" | "food_special" | "wing_night" | "other";
type EventType = "live_music" | "trivia" | "karaoke" | "sports_night" | "other";

const SPECIAL_CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];
const EVENT_TYPES: EventType[] = ["live_music", "trivia", "karaoke", "sports_night", "other"];
const PRODUCT_LABELS: Record<ProductType, string> = {
  featured: "Featured placement",
  boost: "Seasonal boost",
  category_sponsor: "Category sponsorship",
  chat_term_sponsor: "Ask-chat term sponsor",
  map_pin: "Map pin boost",
};
const AUTO_RENEW_DAYS = 30;

interface Settings {
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

interface CartItem {
  key: string;
  productType: ProductType;
  venueId: number;
  specialId: number | null;
  eventId: number | null;
  category: string | null;
  categoryKind: "special" | "event" | null;
  term: string | null;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  priceCents: number;
  label: string;
  // "boost" only -- ported from the public /advertise -> BookingFlow checkout, which
  // already has this working end to end (Stripe, storage on the bookings row, display
  // on the board). This dashboard cart just never grew the same option.
  hasPhotoAddOn: boolean;
  photoData: string | null;
  photoMimeType: string | null;
}

// Two independent lists, not one -- a Stripe Checkout Session is either one-time or a
// subscription, never both, so mixing them in one cart would force two separate
// checkout redirects (see cart-checkout/route.ts's history). Keeping them apart here
// means this component can never construct a request the API would reject.
function MiniCart({
  title,
  items,
  onRemove,
  onCheckout,
  checkingOut,
  totalSuffix,
  creditBalance,
  onCheckoutWithCredits,
  payingWithCredits,
  bundleDiscountTiers,
}: {
  title: string;
  items: CartItem[];
  onRemove: (key: string) => void;
  onCheckout: () => void;
  checkingOut: boolean;
  totalSuffix: string;
  // Only offered on the one-time cart -- credits can't pay for an auto-renewing
  // item (see cart-checkout/route.ts's payWithCredits + autoRenew rejection).
  creditBalance?: number;
  onCheckoutWithCredits?: () => void;
  payingWithCredits?: boolean;
  bundleDiscountTiers: { minVenues: number; discountPercent: number }[];
}) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((sum, i) => sum + i.priceCents, 0);
  // Client-side preview of the same logic cart-checkout/route.ts applies
  // authoritatively -- distinct venues across these items, highest minVenues tier
  // cleared wins. Never trusted for the real charge, just so the total shown here
  // matches what checkout is actually about to charge.
  const distinctVenueCount = new Set(items.map((i) => i.venueId)).size;
  const discountPercent = bundleDiscountTiers
    .filter((t) => t.minVenues <= distinctVenueCount)
    .sort((a, b) => b.minVenues - a.minVenues)[0]?.discountPercent ?? 0;
  const discountedSubtotal = Math.round((subtotal * (100 - discountPercent)) / 100);
  const fee = stripeFeeCents(discountedSubtotal);
  const subtotalCredits = discountedSubtotal / 100;
  const canPayWithCredits = creditBalance !== undefined && creditBalance >= subtotalCredits;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3">
      <span className="text-xs font-medium text-foreground/90">{title}</span>
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-foreground/90">{item.label}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-muted-2 font-mono-tabular">{formatPrice(item.priceCents)}{totalSuffix}</span>
            <button onClick={() => onRemove(item.key)} className="text-muted underline">
              Remove
            </button>
          </div>
        </div>
      ))}
      {discountPercent > 0 && (
        <p className="text-xs text-evergreen">
          Bundle discount: {discountPercent}% off ({distinctVenueCount} venues)
        </p>
      )}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
        <span className="text-muted">
          Subtotal {formatPrice(discountedSubtotal)}{totalSuffix} + {formatPrice(fee)} card fee
        </span>
        <strong className="text-foreground/90">{formatPrice(discountedSubtotal + fee)}{totalSuffix} total</strong>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCheckout}
          disabled={checkingOut || payingWithCredits}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {checkingOut ? "Redirecting…" : "Checkout with card"}
        </button>
        {creditBalance !== undefined && (
          <button
            onClick={onCheckoutWithCredits}
            disabled={!canPayWithCredits || checkingOut || payingWithCredits}
            title={canPayWithCredits ? undefined : `Need ${subtotalCredits} credits, have ${creditBalance}`}
            className="press-pill rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/90 disabled:opacity-40"
          >
            {payingWithCredits ? "Booking…" : `Pay with ${subtotalCredits} credits`}
          </button>
        )}
      </div>
    </div>
  );
}

export function OwnerCart({
  venueId,
  ownedVenues,
  bundleDiscountTiers,
  specials,
  events,
  settings,
  photoAddOn,
  todayISO,
  creditBalance,
}: {
  venueId: number;
  // The owner's full venue list (always includes the current one) -- lets a chain
  // owner apply the same purchase to several of their locations in one checkout
  // instead of repeating the whole flow once per venue. Unused (no picker shown) for
  // an owner with just the one venue, so nothing changes for the common case.
  ownedVenues: { id: number; name: string }[];
  // Informational only -- client-side preview of what the server will actually apply
  // (app/api/owner/cart-checkout/route.ts re-derives and enforces this itself from the
  // same table, never trusts this prop for the real charge).
  bundleDiscountTiers: { minVenues: number; discountPercent: number }[];
  specials: { id: number; title: string }[];
  events: { id: number; title: string }[];
  settings: Record<ProductType, Settings>;
  // "boost" only -- absent means the add-on isn't configured server-side, not $0.
  photoAddOn?: { priceCentsPerDay: number };
  todayISO: string;
  // Undefined hides the "pay with credits" option entirely rather than showing it
  // disabled at zero -- keeps the cart's default look unchanged for any caller that
  // doesn't pass a balance.
  creditBalance?: number;
}) {
  const [productType, setProductType] = useState<ProductType>("featured");
  // Defaults to (and, for "boost", stays locked to) the current venue -- boost targets
  // one specific special/event, and this component only ever has specials/events data
  // for the venue the dashboard page itself is scoped to, so cross-venue boost target
  // selection isn't possible without a bigger data-fetching change.
  const [itemVenueId, setItemVenueId] = useState(venueId);
  const [boostTargetKey, setBoostTargetKey] = useState("");
  const [categoryKind, setCategoryKind] = useState<"special" | "event">("special");
  const [category, setCategory] = useState<SpecialCategory | EventType>("happy_hour");
  const [term, setTerm] = useState("");
  const [wantsPhotoAddOn, setWantsPhotoAddOn] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [checkingOutKind, setCheckingOutKind] = useState<"oneTime" | "autoRenew" | null>(null);
  const [payingWithCredits, setPayingWithCredits] = useState(false);

  const current = settings[productType];
  const [boostKind, boostIdStr] = boostTargetKey.split(":");
  const boostId = boostIdStr ? Number(boostIdStr) : null;

  async function addToCart() {
    setError(null);
    if (!startDate) return setError("Pick a start date.");
    if (!autoRenew) {
      if (!endDate || endDate < startDate) return setError("Pick valid dates.");
      const days = daysInclusive(startDate, endDate);
      if (days < current.minDays || days > current.maxDays) {
        return setError(`Choose between ${current.minDays} and ${current.maxDays} days.`);
      }
    }
    if (productType === "boost" && !boostTargetKey) return setError("Pick a special or event to boost.");
    if (productType === "chat_term_sponsor" && !term.trim()) return setError("Enter a term to sponsor.");
    const wantsPhoto = productType === "boost" && wantsPhotoAddOn;
    if (wantsPhoto && !photoFile) return setError("Choose a photo, or uncheck the photo add-on.");

    setAddingToCart(true);
    try {
      const photo = wantsPhoto && photoFile ? await fileToBase64(photoFile) : null;

      const targetLabel =
        productType === "boost"
          ? (boostKind === "special" ? specials : events).find((x) => x.id === boostId)?.title
          : productType === "category_sponsor"
            ? (categoryKind === "special" ? CATEGORY_LABELS : EVENT_TYPE_LABELS)[category]
            : productType === "chat_term_sponsor"
              ? `"${term.trim()}"`
              : null;

      const addOnPerDay = wantsPhoto && photoAddOn ? photoAddOn.priceCentsPerDay : 0;
      const perDayCents = current.priceCentsPerDay + addOnPerDay;
      const priceCents = autoRenew ? perDayCents * AUTO_RENEW_DAYS : perDayCents * daysInclusive(startDate, endDate);
      const dateLabel = autoRenew ? `starts ${startDate}, renews monthly` : `${startDate} to ${endDate}`;
      // Boost stays locked to the current venue (see itemVenueId's own comment) --
      // every other product can target whichever of the owner's venues is selected.
      const thisItemVenueId = productType === "boost" ? venueId : itemVenueId;
      const venueLabel =
        ownedVenues.length > 1 ? ownedVenues.find((v) => v.id === thisItemVenueId)?.name : undefined;

      const item: CartItem = {
        key: `${productType}-${Date.now()}`,
        productType,
        venueId: thisItemVenueId,
        specialId: productType === "boost" && boostKind === "special" ? boostId : null,
        eventId: productType === "boost" && boostKind === "event" ? boostId : null,
        category: productType === "category_sponsor" ? category : null,
        categoryKind: productType === "category_sponsor" ? categoryKind : null,
        term: productType === "chat_term_sponsor" ? term.trim() : null,
        startDate,
        endDate: autoRenew ? undefined : endDate,
        autoRenew,
        priceCents,
        label: `${PRODUCT_LABELS[productType]}${venueLabel ? ` -- ${venueLabel}` : ""}${targetLabel ? ` (${targetLabel})` : ""}${wantsPhoto ? " +photo" : ""} (${dateLabel})`,
        hasPhotoAddOn: wantsPhoto,
        photoData: photo?.data ?? null,
        photoMimeType: photo?.mimeType ?? null,
      };
      setCart((prev) => [...prev, item]);
      setStartDate("");
      setEndDate("");
      setBoostTargetKey("");
      setTerm("");
      setWantsPhotoAddOn(false);
      setPhotoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that photo.");
    } finally {
      setAddingToCart(false);
    }
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  async function checkout(kind: "oneTime" | "autoRenew") {
    setCheckingOutKind(kind);
    setError(null);
    try {
      const toSend = cart.filter((i) => (kind === "autoRenew" ? i.autoRenew : !i.autoRenew));
      const res = await fetch("/api/owner/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toSend.map(({ key: _key, label: _label, priceCents: _priceCents, ...item }) => item),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setCheckingOutKind(null);
    }
  }

  async function checkoutWithCredits() {
    setPayingWithCredits(true);
    setError(null);
    try {
      const toSend = cart.filter((i) => !i.autoRenew);
      const res = await fetch("/api/owner/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payWithCredits: true,
          items: toSend.map(({ key: _key, label: _label, priceCents: _priceCents, ...item }) => item),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      // No Stripe redirect for a credit-paid cart -- reload so the fresh server
      // render picks up the new (lower) balance and the booking shows as pending.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setPayingWithCredits(false);
    }
  }

  const oneTimeItems = cart.filter((i) => !i.autoRenew);
  const autoRenewItems = cart.filter((i) => i.autoRenew);

  return (
    <section id="promote" className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent-soft/10 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl text-foreground">Promote this venue</h2>
        <span className="text-sm text-muted">
          Pin your card to the top, boost a specific special or event, or sponsor a whole category.
          {creditBalance !== undefined && creditBalance > 0 && (
            <> You have <strong className="text-foreground/90">{creditBalance} credits</strong> (${creditBalance}) ready to spend below.</>
          )}
        </span>
      </div>

      <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs self-start flex-wrap">
        {(["featured", "boost", "category_sponsor", "chat_term_sponsor", "map_pin"] as ProductType[]).map((pt) => (
          <button
            key={pt}
            onClick={() => setProductType(pt)}
            className={`press-pill rounded-full px-3 py-1 ${productType === pt ? "bg-accent text-background" : "text-muted"}`}
          >
            {PRODUCT_LABELS[pt]}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-2 -mt-1">
        {formatPrice(current.priceCentsPerDay)}/day · {current.minDays}–{current.maxDays} days
      </p>

      {ownedVenues.length > 1 && productType !== "boost" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          For which venue?
          <select
            value={itemVenueId}
            onChange={(e) => setItemVenueId(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {ownedVenues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {productType === "boost" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Which special or event?
          <select
            value={boostTargetKey}
            onChange={(e) => setBoostTargetKey(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a special or event…</option>
            {specials.length > 0 && (
              <optgroup label="Specials">
                {specials.map((s) => (
                  <option key={`special:${s.id}`} value={`special:${s.id}`}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            )}
            {events.length > 0 && (
              <optgroup label="Events">
                {events.map((e) => (
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
              setCategoryKind(kind as "special" | "event");
              setCategory(cat as SpecialCategory | EventType);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

      {productType === "map_pin" && (
        <p className="text-xs text-muted-2">
          Your pin on the map view shows larger and highlighted, above regular pins.
        </p>
      )}

      {productType === "chat_term_sponsor" && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Term to sponsor (e.g. &quot;beer&quot;, &quot;trivia&quot;)
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="beer"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-2">
            Whenever someone asks the Ask-chat about this term, your venue is the answer. One
            sponsor per term at a time -- if it&apos;s already taken, checkout will say so.
          </span>
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
        Auto-renew monthly ({formatPrice(current.priceCentsPerDay * AUTO_RENEW_DAYS)}/month) instead of picking an end date
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Start date
          <input
            type="date"
            min={todayISO}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {!autoRenew && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-stale">{error}</p>}

      <button
        onClick={addToCart}
        disabled={addingToCart}
        className="press-pill rounded-full border border-border px-3 py-1.5 text-xs text-muted self-start disabled:opacity-50"
      >
        {addingToCart ? "Adding…" : "Add to cart"}
      </button>

      <MiniCart
        title="One-time"
        items={oneTimeItems}
        onRemove={removeFromCart}
        onCheckout={() => checkout("oneTime")}
        checkingOut={checkingOutKind === "oneTime"}
        totalSuffix=""
        creditBalance={creditBalance}
        onCheckoutWithCredits={checkoutWithCredits}
        payingWithCredits={payingWithCredits}
        bundleDiscountTiers={bundleDiscountTiers}
      />
      <MiniCart
        title="Auto-renews monthly"
        items={autoRenewItems}
        onRemove={removeFromCart}
        onCheckout={() => checkout("autoRenew")}
        checkingOut={checkingOutKind === "autoRenew"}
        totalSuffix="/mo"
        bundleDiscountTiers={bundleDiscountTiers}
      />
    </section>
  );
}
