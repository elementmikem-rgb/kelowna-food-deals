"use client";

import { useEffect, useState } from "react";
import { pushSupported, subscribeToPush, getExistingPushSubscription } from "@/lib/push-client";

// Re-shown after this long if dismissed without subscribing -- same reasoning as
// InstallPrompt's own snooze.
const DISMISS_SNOOZE_DAYS = 14;
const STORAGE_KEY = "todaystab_push_dismissed_at";

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Sits on the Specials page (has direct exposure to flash deals). Renders nothing
// until every gate passes: browser support, permission not already denied, not
// already subscribed, not recently dismissed, and -- the one gate unique to this
// feature -- the server actually has VAPID keys configured (see
// app/api/push/vapid-public-key/route.ts). That last one lets this ship disabled
// (silently invisible) before Mike pastes the real keys into Railway, no separate
// feature flag needed.
export function PushOptIn({ regionId }: { regionId: number }) {
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "subscribing" | "subscribed" | "error">("idle");

  useEffect(() => {
    async function check() {
      if (!pushSupported()) return;
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
      if (recentlyDismissed()) return;
      if (await getExistingPushSubscription()) return;

      const res = await fetch("/api/push/vapid-public-key").catch(() => null);
      if (!res?.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;

      setVapidPublicKey(publicKey);
      setVisible(true);
    }
    check();
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Nothing to do if storage is blocked.
    }
  }

  async function subscribe() {
    if (!vapidPublicKey) return;
    setState("subscribing");
    try {
      await subscribeToPush(vapidPublicKey, regionId);
      setState("subscribed");
      setTimeout(() => setVisible(false), 2000);
    } catch {
      setState("error");
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90">
          Get notified when a flash deal drops nearby -- no spam, just the urgent ones.
        </p>
        {state === "error" && (
          <p className="text-xs text-danger mt-0.5">Couldn't turn on notifications -- try again.</p>
        )}
      </div>
      <button
        onClick={subscribe}
        disabled={state === "subscribing" || state === "subscribed"}
        className="press-pill shrink-0 rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {state === "idle" && "Notify me"}
        {state === "subscribing" && "Turning on…"}
        {state === "subscribed" && "You're in!"}
        {state === "error" && "Try again"}
      </button>
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
