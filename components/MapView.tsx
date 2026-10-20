"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { SpecialWithVenue } from "@/lib/data";
import type { MapPin as ApiMapPin, EventMapPin as ApiEventMapPin } from "@/lib/map-data";
import { groupByVenue } from "@/lib/group-by-venue";
import { isPromotionActive } from "@/lib/promotion";
import { MapVenueStrip, type StripVenue } from "./MapVenueStrip";
import { pickStripPins, type StripBounds } from "@/lib/map-strip";
import { getSavedVenues, toggleSavedVenue } from "@/lib/saved-venues";
import type { SpecialCategory } from "@/db/schema";
import type { Language } from "@/lib/i18n";

// How long to wait after the visitor stops panning/zooming before fetching
// pins for the new viewport -- long enough that a quick pan-past doesn't fire
// a request that's immediately thrown away, short enough that panning still
// feels responsive.
const PAN_DEBOUNCE_MS = 500;

// Normalized shape both layers render into -- a special's price and an
// event's cover charge are the same "optional dollar amount" slot, so one
// popup renderer serves both instead of two near-duplicate ones.
interface PopupItem {
  id: number;
  title: string;
  priceCents: number | null;
  startTime: string | null;
  endTime: string | null;
}

interface Pin {
  venueId: number;
  venueName: string;
  regionSlug: string;
  lat: number;
  lng: number;
  boosted: boolean;
  photoId: number | null;
  // Local specials pins only (built from the already-loaded `specials` prop) -- the
  // /api/map-pins route used for remote/cross-region pins doesn't carry flash data,
  // so a flash special only shows this way for the visitor's current region. That
  // matches how the feature is actually used (an urgent, right-now, nearby deal),
  // not a gap worth a second cross-region query for.
  hasFlash: boolean;
  items: PopupItem[];
}

type Layer = "specials" | "events";

type PinVariant = "regular" | "boosted" | "flash";

// Flash outranks boosted -- a pulsing red pin has to read as "more urgent than paid
// placement" for the same reason flash deals sort above Featured on the list view
// (see SpecialsBoard's grouped.flash comment). A saved venue ("My Spots") is a solid,
// non-pulsing red with a heart, so it never reads as an urgent flash deal; the selected
// venue (the card showing in the strip) is bigger with a dark ring.
function pinIcon(variant: PinVariant, saved: boolean, selected: boolean): L.DivIcon {
  const base = variant === "regular" && !saved ? 24 : 34;
  const size = selected ? base + 8 : base;
  const color =
    variant === "flash" ? "#a83232" : saved ? "#d62839" : variant === "boosted" ? "#c14a1f" : "#8a7f5f";
  const pulseClass = variant === "flash" ? "live-dot" : "";
  // Saved shows a heart; boosted gets a star glyph on top of the bigger/orange circle -- same
  // star the "Featured" section header on the list view uses, so the two paid-placement
  // signals read as visually related. Without a glyph a boosted pin was only
  // distinguishable from a regular one by size/color, easy to miss at a glance
  // and indistinguishable once zoomed out enough to shrink both equally.
  const glyph = saved
    ? '<span style="color:#fffaf0;font-size:17px;line-height:1;">♥</span>'
    : variant === "boosted"
      ? '<span style="color:#fffaf0;font-size:16px;line-height:1;">★</span>'
      : "";
  const ring = selected ? "0 0 0 3px #2a2818, 0 2px 8px rgba(0,0,0,0.5)" : "0 1px 4px rgba(0,0,0,0.35)";
  return L.divIcon({
    className: "",
    html: `<div class="${pulseClass}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fffaf0;
      box-shadow:${ring};
      display:flex;align-items:center;justify-content:center;
    ">${glyph}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const iconCache = new Map<string, L.DivIcon>();
function iconFor(pin: { hasFlash: boolean; boosted: boolean }, saved: boolean, selected: boolean): L.DivIcon {
  const variant: PinVariant = pin.hasFlash ? "flash" : pin.boosted ? "boosted" : "regular";
  const key = `${variant}-${saved}-${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = pinIcon(variant, saved, selected);
    iconCache.set(key, icon);
  }
  return icon;
}

// Lives inside <MapContainer> (needs the Leaflet map context from
// useMapEvents/useMap, which only exists inside one). For the Specials layer,
// this fetches OTHER regions' venues as the visitor pans/zooms (the current
// region's own specials pins come from the already-loaded `specials` prop and
// never need this fetch). For the Events layer there's no equivalent
// pre-loaded prop, so this fetches every venue in view, current region
// included -- see MapView's layer switch below.
function RemotePins({
  layer,
  excludeVenueIds,
  selectedDay,
  selectedCategory,
  onPins,
}: {
  layer: Layer;
  excludeVenueIds: Set<number>;
  selectedDay: number;
  selectedCategory: SpecialCategory | "all";
  onPins: (pins: Pin[]) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = useMapEvents({
    moveend: () => scheduleFetch(),
    zoomend: () => scheduleFetch(),
  });

  function scheduleFetch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPins, PAN_DEBOUNCE_MS);
  }

  async function fetchPins() {
    // Below this zoom, the viewport is wide enough that the API route itself
    // refuses it (see app/api/map-pins/route.ts's 15-degree cap) -- skip the
    // request entirely rather than firing one that always comes back empty.
    if (map.getZoom() < 7) return;
    const b = map.getBounds();
    const params = new URLSearchParams({
      north: String(b.getNorth()),
      south: String(b.getSouth()),
      east: String(b.getEast()),
      west: String(b.getWest()),
      day: String(selectedDay),
      kind: layer,
    });
    if (layer === "specials" && selectedCategory !== "all") params.set("category", selectedCategory);
    try {
      const res = await fetch(`/api/map-pins?${params}`);
      if (!res.ok) return;
      if (layer === "specials") {
        const data: { pins: ApiMapPin[] } = await res.json();
        onPins(
          data.pins
            .filter((p) => !excludeVenueIds.has(p.venueId))
            .map((p) => ({
              venueId: p.venueId,
              venueName: p.venueName,
              regionSlug: p.regionSlug,
              lat: p.lat,
              lng: p.lng,
              boosted: p.boosted,
              photoId: p.photoId,
              hasFlash: false,
              items: p.specials,
            }))
        );
      } else {
        const data: { pins: ApiEventMapPin[] } = await res.json();
        onPins(
          data.pins.map((p) => ({
            venueId: p.venueId,
            venueName: p.venueName,
            regionSlug: p.regionSlug,
            lat: p.lat,
            lng: p.lng,
            boosted: p.boosted,
            photoId: p.photoId,
            hasFlash: false,
            items: p.events.map((e) => ({
              id: e.id,
              title: e.title,
              priceCents: e.coverChargeCents,
              startTime: e.startTime,
              endTime: e.endTime,
            })),
          }))
        );
      }
    } catch {
      // A dropped pan-triggered fetch just means fewer pins show up this time --
      // there's nothing useful to show the visitor for it, and the next pan/
      // zoom, or the layer-change effect below, retries anyway.
    }
  }

  // Fetch on mount and every time the layer/day/category changes, in case the
  // visitor's very first view is already zoomed out past the current region,
  // or they just switched from Specials to Events.
  useEffect(() => {
    scheduleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, selectedDay, selectedCategory]);

  return null;
}

// Reports the map's visible area after every user-driven pan/zoom, so the card strip can list
// the venues in view. A move the strip itself caused (swiping to a card pans the map to it)
// is ignored -- re-sorting the strip under the visitor's thumb would make the card they just
// landed on jump away.
function ViewTracker({
  onView,
  quiet,
  mapRef,
}: {
  onView: (view: { center: { lat: number; lng: number }; bounds: StripBounds }) => void;
  quiet: React.MutableRefObject<boolean>;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    report();
    return () => {
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  function report() {
    const c = map.getCenter();
    const b = map.getBounds();
    onView({
      center: { lat: c.lat, lng: c.lng },
      bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
    });
  }

  useMapEvents({
    moveend: () => {
      if (quiet.current) return;
      report();
    },
  });
  return null;
}

export function MapView({
  specials,
  regionSlug,
  lang = "en",
  regionLat,
  regionLng,
  selectedDay,
  selectedCategory,
  // Which layer(s) this instance may show. A single-item array (the normal
  // case: the Specials page's map only ever shows specials, the Events page's
  // map only ever shows events -- see "Should we be inside the events tab"
  // decision) hides the internal Specials/Events toggle entirely and locks to
  // that one layer, since there's nothing to switch between. Only pass both
  // if a page genuinely wants the visitor to flip between them in place.
  allowedLayers = ["specials"],
}: {
  specials: SpecialWithVenue[];
  regionSlug: string;
  lang?: Language;
  regionLat: number | null;
  regionLng: number | null;
  selectedDay: number;
  selectedCategory: SpecialCategory | "all";
  allowedLayers?: Layer[];
}) {
  const [layer, setLayer] = useState<Layer>(allowedLayers[0]!);
  const [remotePins, setRemotePins] = useState<Pin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectSource, setSelectSource] = useState<"map" | "strip" | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [view, setView] = useState<{ center: { lat: number; lng: number }; bounds: StripBounds } | null>(null);
  // Bumped on every user pan/zoom so the strip jumps back to the start of its new list.
  const [resetTick, setResetTick] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const quiet = useRef(false);

  // Saved venues live in localStorage (lib/saved-venues.ts, the same "My Spots" list the
  // venue pages use), so they're read after mount rather than during render, and again on
  // focus so a save made on another page shows up when the visitor comes back.
  useEffect(() => {
    function refreshSaved() {
      setSavedIds(new Set(getSavedVenues().map((v) => v.venueId)));
    }
    refreshSaved();
    window.addEventListener("focus", refreshSaved);
    return () => window.removeEventListener("focus", refreshSaved);
  }, []);

  const localSpecialsPins = useMemo<Pin[]>(() => {
    const groups = groupByVenue(specials);
    const pins: Pin[] = [];
    for (const g of groups) {
      if (g.venueId === null) continue;
      const first = g.items[0]!;
      // approxCoords venues are pinned at their region's center, not their own
      // address -- showing one there would put a pin on the wrong building, so
      // these are skipped entirely rather than plotted misleadingly.
      if (first.venueLat === null || first.venueLng === null || first.venueApproxCoords) continue;
      pins.push({
        venueId: g.venueId,
        venueName: g.venueName,
        regionSlug,
        lat: first.venueLat,
        lng: first.venueLng,
        boosted: isPromotionActive(first.venueMapPinBoostedUntil),
        photoId: first.venuePhotoId,
        hasFlash: g.items.some((s) => s.flashExpiresAt !== null),
        items: g.items.map((s) => ({
          id: s.id,
          title: s.title,
          priceCents: s.priceCents,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }
    return pins;
  }, [specials, regionSlug]);

  // Only the Specials layer has a pre-loaded local baseline -- the Events
  // layer has no equivalent prop (events aren't fetched by the page this
  // board renders on), so it's purely API-driven, current region included.
  const localVenueIds = useMemo(
    () => (layer === "specials" ? new Set(localSpecialsPins.map((p) => p.venueId)) : new Set<number>()),
    [layer, localSpecialsPins]
  );

  // Clear stale remote pins whenever the layer or filters change -- otherwise
  // switching from Specials to Events (or "Saturday" to "Monday") would leave
  // the previous layer/day's pins on screen until the next pan.
  useEffect(() => setRemotePins([]), [layer, selectedDay, selectedCategory]);

  const allPins = useMemo(() => {
    if (layer === "events") return remotePins;
    return [...localSpecialsPins, ...remotePins.filter((p) => !localVenueIds.has(p.venueId))];
  }, [layer, localSpecialsPins, remotePins, localVenueIds]);

  // Split so flash/boosted pins (see the MarkerClusterGroup comment below) never end up
  // folded into a cluster count bubble -- only plain pins get clustered. Saved and selected
  // pins stay out of clusters too: a venue the visitor saved, or is looking at the card of,
  // must never be hidden inside a count bubble.
  const clusteredPins = useMemo(
    () => allPins.filter((p) => !(p.hasFlash || p.boosted || savedIds.has(p.venueId) || p.venueId === selectedId)),
    [allPins, savedIds, selectedId]
  );
  const standalonePins = useMemo(
    () => allPins.filter((p) => p.hasFlash || p.boosted || savedIds.has(p.venueId) || p.venueId === selectedId),
    [allPins, savedIds, selectedId]
  );

  const stripPins = useMemo(() => pickStripPins(allPins, view, selectedId), [allPins, view, selectedId]);
  const stripVenues = useMemo<StripVenue[]>(
    () =>
      stripPins.map((p) => ({
        venueId: p.venueId,
        venueName: p.venueName,
        regionSlug: p.regionSlug,
        photoId: p.photoId,
        items: p.items,
      })),
    [stripPins]
  );

  const fallbackCenter: [number, number] = [regionLat ?? 49.0, regionLng ?? -119.5];

  // The visitor panned or zoomed: show the venues now nearest the middle of the screen,
  // starting at the first card, which is also selected (a "map" selection, so it highlights
  // the pin without panning the map again). Without this the previously selected card stays
  // pinned to the front of the list and the strip looks like it never changed.
  function handleView(v: { center: { lat: number; lng: number }; bounds: StripBounds }) {
    setView(v);
    const first = pickStripPins(allPins, v, null)[0];
    setSelectedId(first ? first.venueId : null);
    setSelectSource("map");
    setResetTick((t) => t + 1);
  }

  function select(venueId: number, source: "map" | "strip") {
    setSelectedId(venueId);
    setSelectSource(source);
    if (source === "strip") {
      const pin = allPins.find((p) => p.venueId === venueId);
      const map = mapRef.current;
      if (pin && map) {
        // The pan below fires its own moveend; keep it from re-sorting the strip.
        quiet.current = true;
        setTimeout(() => {
          quiet.current = false;
        }, 1200);
        map.panTo([pin.lat, pin.lng], { animate: true });
      }
    }
  }

  function toggleSave(v: StripVenue) {
    const nowSaved = toggleSavedVenue({ venueId: v.venueId, venueName: v.venueName, regionSlug: v.regionSlug });
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(v.venueId);
      else next.delete(v.venueId);
      return next;
    });
  }

  function renderPin(pin: Pin) {
    const saved = savedIds.has(pin.venueId);
    const selected = pin.venueId === selectedId;
    return (
      <Marker
        key={pin.venueId}
        position={[pin.lat, pin.lng]}
        icon={iconFor(pin, saved, selected)}
        zIndexOffset={selected ? 1000 : saved ? 500 : 0}
        eventHandlers={{ click: () => select(pin.venueId, "map") }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Only rendered when a page genuinely offers both layers to flip
          between -- the normal case (Specials page passes
          allowedLayers=["specials"], Events page passes ["events"]) has
          nothing to toggle, so the pill row would be pointless chrome. */}
      {allowedLayers.length > 1 && (
        <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs self-start">
          {allowedLayers.map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`press-pill rounded-full px-3 py-1 capitalize ${
                layer === l ? "bg-accent text-background" : "text-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* MapContainer stays mounted even when allPins is momentarily empty --
          switching layers (or the RemotePins effect below) clears remotePins
          synchronously, before the async fetch resolves, and unmounting the
          map here would also unmount RemotePins, whose useEffect is what
          actually fires that fetch. Instead the empty state overlays the
          still-live map so it can populate itself once data arrives. */}
      <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: 520 }}>
        {allPins.length === 0 && (
          <p className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface/90 text-muted-2 text-sm px-8 text-center">
            {layer === "events"
              ? "No recurring events with a known location on this day yet."
              : "No venues with a known location to show on the map for this filter yet."}
          </p>
        )}
        <MapContainer
          center={fallbackCenter}
          zoom={12}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ViewTracker onView={handleView} quiet={quiet} mapRef={mapRef} />
          <RemotePins
            layer={layer}
            excludeVenueIds={localVenueIds}
            selectedDay={selectedDay}
            selectedCategory={selectedCategory}
            onPins={setRemotePins}
          />
          <MarkerClusterGroup chunkedLoading>
            {clusteredPins.map((pin) => renderPin(pin))}
          </MarkerClusterGroup>
          {/* Flash, boosted, saved and selected pins render OUTSIDE the cluster group -- a paid
              map-pin boost (or an urgent flash deal) that's buried inside a cluster count bubble
              defeats the point of paying for it. cap_count on the map_pin product keeps
              this to at most a handful of standalone pins per region at once, so this
              can't itself turn into visual clutter. */}
          {standalonePins.map((pin) => renderPin(pin))}
        </MapContainer>
        <MapVenueStrip
          venues={stripVenues}
          selectedId={selectedId}
          selectSource={selectSource}
          resetTick={resetTick}
          savedIds={savedIds}
          onSelect={select}
          onToggleSave={toggleSave}
          lang={lang === "fr" ? "fr" : "en"}
        />
      </div>
    </div>
  );
}
