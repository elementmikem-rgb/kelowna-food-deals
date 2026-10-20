"use client";

import { useEffect, useState } from "react";

// Re-shown after this long if dismissed without installing -- long enough to not
// nag every visit, short enough that a visitor who comes back a few weeks later
// (rather than never) gets asked again instead of being permanently opted out by
// one tap.
const DISMISS_SNOOZE_DAYS = 14;
const STORAGE_KEY = "todaystab_install_dismissed_at";

type Eligibility = { kind: "android"; prompt: () => void } | { kind: "ios" } | null;

// Chrome/Android's real install prompt -- not in the standard lib.dom.d.ts
// typings, so this is typed by hand from the (stable, long-shipped) event shape.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

// track.js loads after hydration, so window.kdsTrack can still be undefined when this
// component's first effect runs -- retry briefly rather than silently losing the event.
function track(eventType: string, label: string, triesLeft = 6) {
  if (window.kdsTrack) {
    window.kdsTrack(eventType, label);
  } else if (triesLeft > 0) {
    setTimeout(() => track(eventType, label, triesLeft - 1), 1000);
  }
}

// Once per browser session, so a visitor tapping around the site doesn't inflate
// banner-shown / app-open counts with every page they land on.
function trackOncePerSession(eventType: string, label: string) {
  try {
    const key = `todaystab_tracked_${eventType}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked: fall through and track anyway.
  }
  track(eventType, label);
}

function isStandaloneAlready(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's own non-standard flag -- matchMedia alone doesn't catch
      // an iOS home-screen install.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Date.now() - dismissedAt < DISMISS_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false; // private-browsing/blocked storage -- fail open, just show it
  }
}

// Mobile only, per an explicit ask -- Chrome also fires beforeinstallprompt on
// desktop (it supports installing a PWA as a desktop app too), so without this
// check a desktop visitor would see it as well. A simple UA sniff rather than a
// screen-width check: a desktop browser resized narrow shouldn't get a mobile
// "add to home screen" prompt that makes no sense on desktop.
function isMobileDevice(): boolean {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Sits outside any one page (mounted in app/layout.tsx) so it can appear on
// whatever page a mobile visitor happens to land on first, not just the home
// page. Renders nothing on desktop, nothing if already installed, and nothing
// for DISMISS_SNOOZE_DAYS after being dismissed once.
export function InstallPrompt() {
  const [eligible, setEligible] = useState<Eligibility>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const platform = isIOS ? "ios" : "android";

    // Opened from the home-screen icon. This is the only install signal iOS gives us
    // (there is no appinstalled event there): a visit in standalone mode means the
    // site was added to the home screen. Counted before the early returns below,
    // since an installed app should never show the banner.
    if (isMobileDevice() && isStandaloneAlready()) {
      trackOncePerSession("pwa_app_open", platform);
      return;
    }
    if (!isMobileDevice() || recentlyDismissed()) return;

    // iOS Safari has no programmatic install trigger at all -- only Share menu
    // → "Add to Home Screen", done by the person, never by a script. Show the
    // instructional banner immediately rather than waiting for an event that
    // will never fire on this platform.
    if (isIOS) {
      setEligible({ kind: "ios" });
      setVisible(true);
      trackOncePerSession("pwa_banner_shown", "ios");
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      // Stops Chrome's own default mini-infobar so this banner is the only
      // install prompt shown -- two competing install UIs would be confusing.
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setEligible({
        kind: "android",
        // Fires only on an actual "Install" tap in Chrome's own native dialog --
        // dismissing that dialog (as opposed to dismissing this banner without
        // ever opening it) does NOT fire appinstalled, so this stays accurate
        // even though prompt()'s own userChoice result is discarded below.
        prompt: () => void evt.prompt(),
      });
      setVisible(true);
      trackOncePerSession("pwa_banner_shown", "android");
    }
    // The only reliable "they actually installed it" signal that exists for any
    // platform -- iOS has no equivalent event at all (see isStandaloneAlready's
    // comment), so install tracking is Android-only by platform limitation, not
    // an oversight. Listened for globally (not just while this banner is open)
    // since Chrome's own mini-infobar or address-bar install icon can also
    // trigger a real install without this banner ever being shown.
    function onAppInstalled() {
      track("pwa_install", "android");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function close() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Nothing to do if storage is blocked -- it just shows again next visit.
    }
  }

  function dismiss() {
    track("pwa_banner_dismiss", eligible?.kind ?? "unknown");
    close();
  }

  function install() {
    if (eligible?.kind === "android") {
      track("pwa_install_tap", "android");
      eligible.prompt();
    }
    close();
  }

  if (!visible || !eligible) return null;

  return (
    // bottom-20 (not bottom-3) so this clears RegionChatBox's own fixed bottom-5
    // right-5 h-12 chat bubble -- both are bottom-fixed and full-width-ish on
    // mobile, so without the extra offset the chat bubble sits on top of this
    // banner's corner instead of floating cleanly above it.
    <div className="sm:hidden fixed inset-x-3 bottom-20 z-40 rounded-2xl border border-border bg-surface shadow-[0_4px_20px_rgba(42,40,24,0.18)] p-3 flex items-center gap-3">
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        {eligible.kind === "ios" ? (
          <p className="text-xs text-foreground/90">
            Install this app: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="text-xs text-foreground/90">Add this to your home screen for quick access.</p>
        )}
      </div>
      {eligible.kind === "android" && (
        <button
          onClick={install}
          className="press-pill shrink-0 rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium"
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted hover:text-foreground text-sm px-1"
      >
        ✕
      </button>
    </div>
  );
}
