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
  // Every town this region's own venues are actually in (e.g. Kelowna's region
  // covers West Kelowna, Lake Country, Peachland). Lets a visitor searching a
  // town name that isn't itself a region -- "West Kelowna" -- still find the
  // region that covers them, instead of being wrongly told we don't cover them.
  cities: string[];
  // This region's own town center, geocoded once from its name (see
  // scripts/_geocode-regions.ts) -- not a per-venue location. Null for the
  // rare region that failed to geocode; "Use my location" just skips those.
  lat: number | null;
  lng: number | null;
  // Live count of active, unarchived specials in this region -- the one thing
  // that actually differs card to card, since every region shares the same
  // generic logoUrl today. See app/page.tsx's specialCountBySlug comment.
  specialCount: number;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Beyond this, the nearest region is too far to be a real "your area" match --
// show the "not covered yet" message instead of a misleading suggestion.
const MAX_REGION_DISTANCE_KM = 100;
// A second region within this much extra distance of the nearest one is
// offered as an alternative -- e.g. Peachland sits ~21km from Kelowna's
// center and ~32km from Penticton's, both real options for that visitor.
const ALTERNATIVE_MARGIN_KM = 20;

// BigDataCloud's client-side reverse-geocode endpoint is free, keyless, and
// CORS-enabled -- used only to name the area in the "not covered yet" message
// when no region is close enough to match; the actual region match below is
// real lat/lng distance, not this.
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

export default function CityFinder({ regions }: { regions: CityOption[] }) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [nearby, setNearby] = useState<CityOption[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter(
      (r) =>
        r.brandName.toLowerCase().includes(q) ||
        r.provinceName.toLowerCase().includes(q) ||
        r.cities.some((city) => city.toLowerCase().includes(q))
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

  async function reverseGeocodeCityName(latitude: number, longitude: number): Promise<string | null> {
    try {
      const res = await fetch(
        `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.city || data.locality || null;
    } catch {
      return null;
    }
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
          const withDistance = regions
            .filter((r): r is CityOption & { lat: number; lng: number } => r.lat !== null && r.lng !== null)
            .map((r) => ({ region: r, distanceKm: haversineKm({ lat: latitude, lng: longitude }, r) }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

          const nearest = withDistance[0];
          if (!nearest || nearest.distanceKm > MAX_REGION_DISTANCE_KM) {
            const cityName = await reverseGeocodeCityName(latitude, longitude);
            setLocateError(
              cityName
                ? `We're not in ${cityName} yet -- browse the list below.`
                : "Couldn't match your location to a city we cover yet."
            );
            return;
          }

          // Any other region within a reasonable extra distance of the
          // nearest one is a real second option -- e.g. Peachland is close
          // to both Kelowna and Penticton's centers, not just the nearer one.
          const alternatives = withDistance
            .slice(1)
            .filter((r) => r.distanceKm - nearest.distanceKm <= ALTERNATIVE_MARGIN_KM);
          setNearby([nearest.region, ...alternatives.map((a) => a.region)]);
          setQuery("");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError("Location access was blocked -- try searching instead.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl pt-2">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNearby([]);
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

      {nearby.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {nearby.map((region, i) => (
            <Link
              key={region.slug}
              href={`/${region.slug}`}
              className="pin-card press-pill flex items-center gap-3 rounded-2xl border-2 border-accent bg-surface px-5 py-4 hover:border-accent-dim"
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
              <span className="flex flex-col text-left">
                <span className="text-[11px] uppercase tracking-wide text-accent-dim">
                  {i === 0 ? "Closest to you" : "Also nearby"}
                </span>
                <span className="font-display text-base text-foreground">{region.brandName}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center">
          No city matches &ldquo;{query}&rdquo; yet -- we&apos;re adding new ones all the time.
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
                    className={`pin-card ${i % 2 === 0 ? "tilt-a" : "tilt-b"} press-pill flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 hover:border-muted overflow-hidden`}
                  >
                    {/* A colored top bar in the region's own accentColor, not the
                        shared generic icon (regions.logoUrl is identical across
                        all 97 regions today) -- this is what actually makes one
                        card look different from the next. */}
                    <span
                      className="block h-1.5 -mx-4 -mt-4 rounded-t-2xl"
                      style={{ backgroundColor: region.accentColor }}
                    />
                    <span className="font-display text-base text-foreground text-left">
                      {region.brandName}
                    </span>
                    {region.specialCount > 0 && (
                      <span className="text-xs text-muted-2">
                        {region.specialCount} special{region.specialCount === 1 ? "" : "s"} tonight
                      </span>
                    )}
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
