"use client";

import { useState } from "react";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, formatPrice } from "@/lib/format";
import { stripeFeeCents } from "@/lib/stripe-fee";
import { daysInclusive } from "@/lib/time";

type ProductType = "featured" | "boost" | "category_sponsor";
type SpecialCategory = "happy_hour" | "food_special" | "wing_night" | "other";
type EventType = "live_music" | "trivia" | "karaoke" | "sports_night" | "other";

const SPECIAL_CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];
const EVENT_TYPES: EventType[] = ["live_music", "trivia", "karaoke", "sports_night", "other"];
const PRODUCT_LABELS: Record<ProductType, string> = {
  featured: "Featured placement",
  boost: "Seasonal boost",
  category_sponsor: "Category sponsorship",
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
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  priceCents: number;
  label: string;
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
}) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((sum, i) => sum + i.priceCents, 0);
  const fee = stripeFeeCents(subtotal);
  const subtotalCredits = subtotal / 100;
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
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
        <span className="text-muted">
          Subtotal {formatPrice(subtotal)}{totalSuffix} + {formatPrice(fee)} card fee
        </span>
        <strong className="text-foreground/90">{formatPrice(subtotal + fee)}{totalSuffix} total</strong>
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
  specials,
  events,
  settings,
  todayISO,
  creditBalance,
}: {
  venueId: number;
  specials: { id: number; title: string }[];
  events: { id: number; title: string }[];
  settings: Record<ProductType, Settings>;
  todayISO: string;
  // Undefined hides the "pay with credits" option entirely rather than showing it
  // disabled at zero -- keeps the cart's default look unchanged for any caller that
  // doesn't pass a balance.
  creditBalance?: number;
}) {
  const [productType, setProductType] = useState<ProductType>("featured");
  const [boostTargetKey, setBoostTargetKey] = useState("");
  const [categoryKind, setCategoryKind] = useState<"special" | "event">("special");
  const [category, setCategory] = useState<SpecialCategory | EventType>("happy_hour");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkingOutKind, setCheckingOutKind] = useState<"oneTime" | "autoRenew" | null>(null);
  const [payingWithCredits, setPayingWithCredits] = useState(false);

  const current = settings[productType];
  const [boostKind, boostIdStr] = boostTargetKey.split(":");
  const boostId = boostIdStr ? Number(boostIdStr) : null;

  function addToCart() {
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

    const targetLabel =
      productType === "boost"
        ? (boostKind === "special" ? specials : events).find((x) => x.id === boostId)?.title
        : productType === "category_sponsor"
          ? (categoryKind === "special" ? CATEGORY_LABELS : EVENT_TYPE_LABELS)[category]
          : null;

    const priceCents = autoRenew ? current.priceCentsPerDay * AUTO_RENEW_DAYS : current.priceCentsPerDay * daysInclusive(startDate, endDate);
    const dateLabel = autoRenew ? `starts ${startDate}, renews monthly` : `${startDate} to ${endDate}`;

    const item: CartItem = {
      key: `${productType}-${Date.now()}`,
      productType,
      venueId,
      specialId: productType === "boost" && boostKind === "special" ? boostId : null,
      eventId: productType === "boost" && boostKind === "event" ? boostId : null,
      category: productType === "category_sponsor" ? category : null,
      categoryKind: productType === "category_sponsor" ? categoryKind : null,
      startDate,
      endDate: autoRenew ? undefined : endDate,
      autoRenew,
      priceCents,
      label: `${PRODUCT_LABELS[productType]}${targetLabel ? ` — ${targetLabel}` : ""} (${dateLabel})`,
    };
    setCart((prev) => [...prev, item]);
    setStartDate("");
    setEndDate("");
    setBoostTargetKey("");
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
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground/90">Promote this venue</span>
        <span className="text-xs text-muted">
          Pin your card to the top, boost a specific special or event, or sponsor a whole category.
        </span>
      </div>

      <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs self-start">
        {(["featured", "boost", "category_sponsor"] as ProductType[]).map((pt) => (
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
        className="press-pill rounded-full border border-border px-3 py-1.5 text-xs text-muted self-start"
      >
        Add to cart
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
      />
      <MiniCart
        title="Auto-renews monthly"
        items={autoRenewItems}
        onRemove={removeFromCart}
        onCheckout={() => checkout("autoRenew")}
        checkingOut={checkingOutKind === "autoRenew"}
        totalSuffix="/mo"
      />
    </section>
  );
}
