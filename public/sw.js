// Minimal service worker whose only job is Web Push -- no offline caching/asset
// interception, since this site doesn't need offline support and a caching SW is a
// much bigger, riskier thing to get right (stale content, cache invalidation on every
// deploy) than this feature actually needs. Bump this version comment (or the file's
// content) whenever it changes, so browsers pick up the new script promptly. v1

self.addEventListener("push", (event) => {
  let data = { title: "TodaysTab", body: "New deal near you", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed/non-JSON payload -- fall back to the generic message above rather
    // than showing no notification at all.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an already-open tab on the same origin instead of always opening a new
      // one -- a visitor who already has the site open shouldn't end up with two tabs.
      for (const client of clientsList) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
