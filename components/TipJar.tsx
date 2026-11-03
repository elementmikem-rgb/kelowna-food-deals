"use client";

import { useEffect, useState } from "react";
import { t, type Language } from "@/lib/i18n";

// The tip jar is styled as a printed bar tab: the site is called TodaysTab, so
// a tip reads as "putting one on the tab". $5 is preselected (anchoring on the
// middle option) and a single big button replaces three equal-weight ones.
// Only the look changed; the checkout request and tracking event are the same.
const AMOUNTS = [
  { cents: 300, en: "A coffee", fr: "Un café" },
  { cents: 500, en: "A pint", fr: "Une pinte" },
  { cents: 1000, en: "A burger", fr: "Un burger" },
];
const DEFAULT_CENTS = 500;

export type TabStats = {
  specials: number;
  places: number;
  cheapestCents: number | null;
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0">{label}</span>
      <span aria-hidden className="flex-1 border-b border-dotted border-foreground/30 translate-y-[-3px]" />
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

export function TipJar({
  regionSlug,
  lang = "en",
  stats,
}: {
  regionSlug: string;
  lang?: Language;
  stats?: TabStats;
}) {
  const tip = t(lang).tip;
  const fr = lang === "fr";
  const [selected, setSelected] = useState(DEFAULT_CENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Printed client-side only so the server render never disagrees with the
  // visitor's clock.
  const [stamp, setStamp] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setStamp(
      now
        .toLocaleString(fr ? "fr-CA" : "en-CA", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toUpperCase(),
    );
  }, [fr]);

  async function startCheckout() {
    setError(null);
    setLoading(true);
    window.kdsTrack?.("tip_click", String(selected));
    try {
      const res = await fetch("/api/tip/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: selected, regionSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Something went wrong");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const perks = fr
    ? ["Gratuit pour tous, sans inscription", "Chaque offre vérifiée à la source", "Paiement sécurisé, en 20 secondes"]
    : ["Free for everyone, no sign-up", "Every deal checked at the source", "Secure checkout, takes 20 seconds"];

  return (
    <section
      id="tip-jar"
      className="relative overflow-hidden rounded-2xl bg-foreground text-background scroll-mt-4"
    >
      {/* warm glow, same family as the live "right now" panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
      />
      <div className="relative grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_minmax(0,22rem)] md:items-center">
        <div className="flex flex-col gap-4">
          <p className="font-mono-tabular text-[11px] tracking-[0.2em] uppercase text-accent-soft">
            {fr ? "Pourboire" : "Tip jar"}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl leading-[1.05]">
            {fr ? (
              <>Mettez-en un sur <span className="text-accent-soft italic">l&apos;ardoise</span>.</>
            ) : (
              <>Put one on <span className="text-accent-soft italic">the tab</span>.</>
            )}
          </h2>
          <p className="text-sm sm:text-base text-background/70 max-w-md">{tip.body}</p>
          <ul className="flex flex-col gap-1.5 text-sm text-background/80">
            {perks.map((p) => (
              <li key={p} className="flex items-baseline gap-2">
                <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-soft translate-y-[-1px]" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* The receipt */}
        <div className="relative md:rotate-[1.5deg] transition-transform hover:rotate-0">
          <div
            className="bg-[#fffdf6] text-[#2a2818] font-mono-tabular text-[12px] leading-relaxed px-5 pt-5 pb-8 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]"
            style={{
              // zig-zag tear along the bottom edge
              WebkitMask:
                "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%",
              mask: "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%",
            }}
          >
            <div className="text-center flex flex-col gap-0.5">
              <span className="font-display text-xl tracking-tight">TodaysTab</span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted">
                {regionSlug} · {stamp ?? (fr ? "AUJOURD'HUI" : "TODAY")}
              </span>
            </div>
            <div className="my-3 border-t border-dashed border-foreground/40" />

            {stats && (
              <>
                <div className="flex flex-col gap-0.5 text-muted">
                  <Line label={fr ? "Offres vérifiées" : "Deals checked"} value={String(stats.specials)} />
                  <Line label={fr ? "Endroits couverts" : "Places covered"} value={String(stats.places)} />
                  {stats.cheapestCents != null && (
                    <Line label={fr ? "Bouchée la moins chère" : "Cheapest bite"} value={dollars(stats.cheapestCents)} />
                  )}
                  <Line label={fr ? "Coût pour vous" : "Cost to you"} value="$0.00" />
                </div>
                <div className="my-3 border-t border-dashed border-foreground/40" />
              </>
            )}

            <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
              {fr ? "Ajouter à l'ardoise" : "Add to the tab"}
            </p>
            <div role="radiogroup" aria-label={fr ? "Montant" : "Tip amount"} className="grid grid-cols-3 gap-2">
              {AMOUNTS.map((a) => {
                const on = a.cents === selected;
                return (
                  <button
                    key={a.cents}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSelected(a.cents)}
                    disabled={loading}
                    className={`relative flex flex-col items-center gap-0.5 rounded-lg border-2 px-1 py-3 transition-all ${
                      on
                        ? "border-accent bg-accent/10 -translate-y-0.5 shadow-[0_4px_0_0_var(--accent)]"
                        : "border-foreground/15 hover:border-foreground/40"
                    }`}
                  >
                    {a.cents === DEFAULT_CENTS && (
                      <span className="absolute -top-2 rounded-full bg-foreground text-background px-1.5 text-[8px] tracking-widest uppercase">
                        {fr ? "Classique" : "The usual"}
                      </span>
                    )}
                    <span className="text-lg font-semibold">${a.cents / 100}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted">{fr ? a.fr : a.en}</span>
                  </button>
                );
              })}
            </div>

            <div className="my-3 border-t border-dashed border-foreground/40" />
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span>TOTAL</span>
              <span className="tabular-nums text-lg">{dollars(selected)}</span>
            </div>

            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="press-pill mt-3 w-full rounded-full bg-accent text-background py-3 font-body text-base font-semibold disabled:opacity-60"
            >
              {loading ? "…" : fr ? `Offrir ${dollars(selected)} →` : `Put ${dollars(selected)} on the tab →`}
            </button>
            {error && <p className="mt-2 text-xs text-stale text-center">{error}</p>}
            <p className="mt-3 text-center text-[10px] tracking-[0.2em] uppercase text-muted">
              {fr ? "Merci, à la prochaine" : "Thank you, come again"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
