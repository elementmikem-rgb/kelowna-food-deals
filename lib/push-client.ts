"use client";

// Standard boilerplate for PushManager.subscribe's applicationServerKey -- the Push API
// requires a Uint8Array, VAPID public keys are handed out URL-safe base64.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// Registers the SW if not already, subscribes to push with the given VAPID key, and
// POSTs the subscription to the backend scoped to regionId. Throws on any failure
// (permission denied, subscribe rejected, etc.) -- callers decide how to surface that.
export async function subscribeToPush(vapidPublicKey: string, regionId: number): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permission denied");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // Uint8Array's ArrayBufferLike generic doesn't structurally satisfy the DOM lib's
    // BufferSource type in some TypeScript/lib combinations (Railway's build caught
    // this even though it type-checked clean locally) -- .buffer is a real
    // ArrayBuffer at runtime, this cast just settles the generic mismatch.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regionId, endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) throw new Error("subscribe request failed");
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}
