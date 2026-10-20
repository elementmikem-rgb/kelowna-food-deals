"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { headingDiff, headingFromOrientation, type OrientationLike } from "@/lib/compass";

type Status = "idle" | "locating" | "on" | "blocked" | "error";

const COPY = {
  en: {
    button: "Show my location",
    blocked: "Location is blocked. Allow it in your browser settings.",
    error: "Couldn't find your location. Try again.",
  },
  fr: {
    button: "Afficher ma position",
    blocked: "La localisation est bloquée. Autorisez-la dans les réglages du navigateur.",
    error: "Impossible de trouver votre position. Réessayez.",
  },
};

const LOCATE_ZOOM = 16;
// A turn smaller than this is sensor jitter, not the visitor turning; skipping it keeps the
// arrow steady and the marker from re-rendering dozens of times a second.
const MIN_HEADING_CHANGE_DEG = 4;
const MESSAGE_MS = 4500;

// The visitor's own spot: blue dot, a faint accuracy circle, and (when the phone's compass
// answers) a small blue arrow for the direction they face. The button asks for location once;
// everything stays in this browser and is never sent anywhere.
function youIcon(heading: number | null): L.DivIcon {
  const arrow =
    heading === null
      ? ""
      : `<div style="position:absolute;inset:0;transform:rotate(${heading}deg);transform-origin:50% 50%;">
           <svg width="52" height="52" viewBox="0 0 52 52">
             <path d="M26 2 L34 18 L26 14.5 L18 18 Z" fill="#1a73e8" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
           </svg>
         </div>`;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:52px;height:52px;">
      ${arrow}
      <div style="position:absolute;left:15px;top:15px;width:22px;height:22px;border-radius:50%;
        background:#1a73e8;border:3px solid #ffffff;box-sizing:border-box;
        box-shadow:0 0 0 1px rgba(0,0,0,0.2),0 1px 5px rgba(0,0,0,0.45);"></div>
    </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

export function MapLocateControl({ lang = "en" }: { lang?: "en" | "fr" }) {
  const map = useMap();
  const tr = COPY[lang];
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const watchId = useRef<number | null>(null);
  const compassOn = useRef(false);
  const lastHeading = useRef<number | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Taps and drags on the button must not also pan or zoom the map underneath it.
  useEffect(() => {
    if (buttonRef.current) {
      L.DomEvent.disableClickPropagation(buttonRef.current);
      L.DomEvent.disableScrollPropagation(buttonRef.current);
    }
  }, []);

  function onOrient(e: Event) {
    const ev = e as unknown as OrientationLike & DeviceOrientationEvent;
    const angle = typeof window !== "undefined" ? (window.screen?.orientation?.angle ?? 0) : 0;
    const h = headingFromOrientation(ev, angle);
    if (h === null) return;
    if (lastHeading.current !== null && headingDiff(lastHeading.current, h) < MIN_HEADING_CHANGE_DEG) return;
    lastHeading.current = h;
    setHeading(h);
  }

  // iOS only shows the compass permission prompt for a call made straight from a tap, so
  // this runs first thing in the click handler. Elsewhere the listener just attaches.
  function startCompass() {
    if (compassOn.current) return;
    const attach = () => {
      compassOn.current = true;
      window.addEventListener("deviceorientationabsolute", onOrient, true);
      window.addEventListener("deviceorientation", onOrient, true);
    };
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<"granted" | "denied"> }
      | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((r) => {
          if (r === "granted") attach();
        })
        .catch(() => {
          // Compass declined: the dot still works without the arrow.
        });
    } else {
      attach();
    }
  }

  function flash(text: string) {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), MESSAGE_MS);
  }

  function handleClick() {
    if (!navigator.geolocation) {
      setStatus("error");
      flash(tr.error);
      return;
    }
    startCompass();
    // Already tracking: just fly back to the latest known spot.
    if (pos && watchId.current !== null) {
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), LOCATE_ZOOM), { duration: 0.8 });
      return;
    }
    setStatus("locating");
    let first = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setPos(next);
        setStatus("on");
        if (first) {
          first = false;
          map.flyTo([next.lat, next.lng], Math.max(map.getZoom(), LOCATE_ZOOM), { duration: 1 });
        }
      },
      (err) => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        const denied = err.code === err.PERMISSION_DENIED;
        setStatus(denied ? "blocked" : "error");
        flash(denied ? tr.blocked : tr.error);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  }

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (compassOn.current) {
        window.removeEventListener("deviceorientationabsolute", onOrient, true);
        window.removeEventListener("deviceorientation", onOrient, true);
      }
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  // Rounded so a one-degree wobble doesn't build a new icon every time.
  const icon = useMemo(() => youIcon(heading === null ? null : Math.round(heading / 3) * 3), [heading]);
  const active = status === "on";

  return (
    <>
      {pos && (
        <>
          {pos.accuracy < 500 && (
            <Circle
              center={[pos.lat, pos.lng]}
              radius={pos.accuracy}
              interactive={false}
              pathOptions={{ color: "#1a73e8", weight: 1, opacity: 0.35, fillColor: "#1a73e8", fillOpacity: 0.1 }}
            />
          )}
          <Marker position={[pos.lat, pos.lng]} icon={icon} interactive={false} zIndexOffset={2000} />
        </>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-label={tr.button}
        title={tr.button}
        style={{
          position: "absolute",
          top: 88,
          left: 10,
          zIndex: 1000,
          width: 34,
          height: 34,
          borderRadius: 4,
          border: "2px solid rgba(0,0,0,0.2)",
          background: "#fff",
          backgroundClip: "padding-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: status === "locating" ? 0.6 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1a73e8" : "#333"} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" fill={active ? "#1a73e8" : "none"} />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
      {message && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 88,
            left: 52,
            zIndex: 1000,
            maxWidth: 220,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(42,40,24,0.92)",
            color: "#fffaf0",
            fontSize: 12,
            lineHeight: 1.3,
          }}
        >
          {message}
        </div>
      )}
    </>
  );
}
