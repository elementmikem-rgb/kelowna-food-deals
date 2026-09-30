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
    if (!isMobileDevice() || isStandaloneAlready() || recentlyDismissed()) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // iOS Safari has no programmatic install trigger at all -- only Share menu
    // → "Add to Home Screen", done by the person, never by a script. Show the
    // instructional banner immediately rather than waiting for an event that
    // will never fire on this platform.
    if (isIOS) {
      setEligible({ kind: "ios" });
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      // Stops Chrome's own default mini-infobar so this banner is the only
      // install prompt shown -- two competing install UIs would be confusing.
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setEligible({ kind: "android", prompt: () => void evt.prompt() });
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Nothing to do if storage is blocked -- it just shows again next visit.
    }
  }

  function install() {
    if (eligible?.kind === "android") eligible.prompt();
    dismiss();
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
