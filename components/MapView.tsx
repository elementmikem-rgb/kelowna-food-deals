"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { SpecialWithVenue } from "@/lib/data";
import type { MapPin as ApiMapPin, EventMapPin as ApiEventMapPin } from "@/lib/map-data";
import { groupByVenue } from "@/lib/group-by-venue";
import { isPromotionActive } from "@/lib/promotion";
import { formatPrice } from "@/lib/format";
import type { SpecialCategory } from "@/db/schema";
import type { Language } from "@/lib/i18n";

// Popups must never grow to fill the screen -- a venue with a big menu (BNA
// Brewing, Cutwater, etc. routinely run 10+ specials, see SpecialVenueGroup's
// own MAX_VISIBLE=5 comment) would otherwise turn one map click into an
// unreadable wall of rows. Smaller cap than the card view's 5: a Leaflet
// popup has far less real screen real estate than a full-width card, and the
// maxHeight+overflow below is a hard backstop even for these 3 if any one
// special's text wraps to several lines.
const MAX_VISIBLE_IN_POPUP = 3;
const POPUP_MAX_HEIGHT_PX = 260;
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
  // Local specials pins only (built from the already-loaded `specials` prop) -- the
  // /api/map-pins route used for remote/cross-region pins doesn't carry flash data,
  // so a flash special only shows this way for the visitor's current region. That
  // matches how the feature is actually used (an urgent, right-now, nearby deal),
  // not a gap worth a second cross-region query for.
  hasFlash: boolean;
  items: PopupItem[];
}

type Layer = "specials" | "events";

// Flash outranks boosted -- a pulsing red pin has to read as "more urgent than paid
// placement" for the same reason flash deals sort above Featured on the list view
// (see SpecialsBoard's grouped.flash comment).
function pinIcon(variant: "regular" | "boosted" | "flash"): L.DivIcon {
  const size = variant === "regular" ? 24 : 34;
  const color = variant === "flash" ? "#a83232" : variant === "boosted" ? "#c14a1f" : "#8a7f5f";
  const pulseClass = variant === "flash" ? "live-dot" : "";
  return L.divIcon({
    className: "",
    html: `<div class="${pulseClass}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fffaf0;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const REGULAR_ICON = pinIcon("regular");
const BOOSTED_ICON = pinIcon("boosted");
const FLASH_ICON = pinIcon("flash");

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

export function MapView({
  specials,
  regionSlug,
  lang: _lang = "en",
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

  const fallbackCenter: [number, number] = [regionLat ?? 49.0, regionLng ?? -119.5];

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
      <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: 480 }}>
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
          <RemotePins
            layer={layer}
            excludeVenueIds={localVenueIds}
            selectedDay={selectedDay}
            selectedCategory={selectedCategory}
            onPins={setRemotePins}
          />
          <MarkerClusterGroup chunkedLoading>
            {allPins.map((pin) => {
                const visible = pin.items.slice(0, MAX_VISIBLE_IN_POPUP);
                const hiddenCount = pin.items.length - visible.length;
                return (
                  <Marker
                    key={pin.venueId}
                    position={[pin.lat, pin.lng]}
                    icon={pin.hasFlash ? FLASH_ICON : pin.boosted ? BOOSTED_ICON : REGULAR_ICON}
                  >
                    <Popup maxWidth={260}>
                      <div className="flex flex-col gap-1.5" style={{ maxWidth: 240 }}>
                        <div className="flex items-center gap-1.5">
                          <strong>{pin.venueName}</strong>
                          {pin.hasFlash ? (
                            <span
                              style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}
                              className="text-danger font-semibold"
                            >
                              Flash deal
                            </span>
                          ) : (
                            pin.boosted && (
                              <span
                                style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}
                                className="text-accent-dim"
                              >
                                Featured
                              </span>
                            )
                          )}
                        </div>
                        <div
                          className="flex flex-col divide-y divide-border"
                          style={{ maxHeight: POPUP_MAX_HEIGHT_PX, overflowY: "auto" }}
                        >
                          {visible.map((item) => (
                            <div key={item.id} className="py-1 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span>{item.title}</span>
                                {formatPrice(item.priceCents) && (
                                  <span className="text-accent-dim font-mono-tabular shrink-0">
                                    {formatPrice(item.priceCents)}
                                  </span>
                                )}
                              </div>
                              {(item.startTime || item.endTime) && (
                                <span className="text-muted-2" style={{ fontSize: 11 }}>
                                  {item.startTime?.slice(0, 5)}
                                  {item.endTime ? `–${item.endTime.slice(0, 5)}` : ""}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {hiddenCount > 0 && (
                          <span className="text-xs text-muted-2">+ {hiddenCount} more</span>
                        )}
                        <Link
                          href={`/${pin.regionSlug}/venues/${pin.venueId}`}
                          className="text-xs text-accent-dim underline"
                        >
                          View full listing →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          </MapContainer>
      </div>
    </div>
  );
}
