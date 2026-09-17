"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export interface CityOption {
  slug: string;
  brandName: string;
  logoUrl: string;
  accentColor: string;
  provinceName: string;
  provinceCode: string;
}

// BigDataCloud's client-side reverse-geocode endpoint is free, keyless, and
// built for exactly this (browser-side, CORS-enabled) -- no server round trip
// or API key management needed just to turn coordinates into a city name.
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

export default function CityFinder({ regions }: { regions: CityOption[] }) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [nearestSlug, setNearestSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter(
      (r) =>
        r.brandName.toLowerCase().includes(q) || r.provinceName.toLowerCase().includes(q)
    );
  }, [query, regions]);

  const grouped = useMemo(() => {
    const map = new Map<string, CityOption[]>();
    for (const region of filtered) {
      const key = `${region.provinceCode} · ${region.provinceName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(region);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function findNearestRegion(cityName: string): CityOption | null {
    const needle = cityName.toLowerCase();
    const matches = regions.filter((r) => r.brandName.toLowerCase().includes(needle));
    if (matches.length === 0) return null;
    // Prefer the shortest matching name -- e.g. "Calgary Food Deals" over
    // "Calgary NE Food Deals" -- since that's the parent/general region.
    return matches.sort((a, b) => a.brandName.length - b.brandName.length)[0];
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!res.ok) throw new Error("lookup failed");
          const data = await res.json();
          const cityName: string | undefined = data.city || data.locality;
          const match = cityName ? findNearestRegion(cityName) : null;
          if (match) {
            setNearestSlug(match.slug);
            setQuery("");
          } else {
            setLocateError(
              cityName
                ? `We're not in ${cityName} yet — browse the list below.`
                : "Couldn't match your location to a city we cover yet."
            );
          }
        } catch {
          setLocateError("Couldn't look up your location — try searching instead.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError("Location access was blocked — try searching instead.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  const nearestRegion = nearestSlug ? regions.find((r) => r.slug === nearestSlug) : null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl pt-2">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNearestSlug(null);
          }}
          placeholder="Search your city…"
          aria-label="Search your city"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-full sm:w-64"
        />
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={locating}
          className="press-pill rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-foreground hover:border-muted disabled:opacity-60 whitespace-nowrap"
        >
          {locating ? "Finding you…" : "📍 Use my location"}
        </button>
      </div>

      {locateError && <p className="text-sm text-stale text-center -mt-4">{locateError}</p>}

      {nearestRegion && (
        <Link
          href={`/${nearestRegion.slug}`}
          className="pin-card press-pill flex items-center gap-3 rounded-2xl border-2 border-accent bg-surface px-5 py-4 self-center hover:border-accent-dim"
        >
          <span
            className="flex items-center justify-center rounded-full p-0.5 shrink-0"
            style={{ boxShadow: `0 0 0 2px ${nearestRegion.accentColor}` }}
          >
            <Image
              src={nearestRegion.logoUrl}
              alt={`${nearestRegion.brandName} logo`}
              width={40}
              height={40}
              className="rounded-full w-10 h-10"
            />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-[11px] uppercase tracking-wide text-accent-dim">
              Closest to you
            </span>
            <span className="font-display text-base text-foreground">
              {nearestRegion.brandName}
            </span>
          </span>
        </Link>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center">
          No city matches &ldquo;{query}&rdquo; yet — we&apos;re adding new ones all the time.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(([provinceKey, provinceRegions]) => (
            <div key={provinceKey} className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted text-left">
                {provinceKey}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {provinceRegions.map((region, i) => (
                  <Link
                    key={region.slug}
                    href={`/${region.slug}`}
                    className={`pin-card ${i % 2 === 0 ? "tilt-a" : "tilt-b"} press-pill flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 hover:border-muted`}
                  >
                    <span
                      className="flex items-center justify-center rounded-full p-0.5 shrink-0"
                      style={{ boxShadow: `0 0 0 2px ${region.accentColor}` }}
                    >
                      <Image
                        src={region.logoUrl}
                        alt={`${region.brandName} logo`}
                        width={40}
                        height={40}
                        className="rounded-full w-10 h-10"
                      />
                    </span>
                    <span className="font-display text-base text-foreground text-left">
                      {region.brandName}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
