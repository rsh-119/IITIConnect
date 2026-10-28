// Only this static explanation is cached; authenticated responses stay network-only.
const OFFLINE_CACHE = "iiticonnect-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add("/offline.html"))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("iiticonnect-offline-") && key !== OFFLINE_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const fallback = await caches.match("/offline.html");
      return fallback ?? Response.error();
    }),
  );
});
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    /* Discard malformed payload. */
  }
  const title =
    typeof payload.title === "string" ? payload.title : "IITIConnect update";
  const target =
    typeof payload.path === "string" && payload.path.startsWith("/community/")
      ? payload.path
      : "/community/notifications";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: "Open IITIConnect to view your update.",
      data: { target },
      tag: payload.tag ?? "iiticonnect-update",
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.target ?? "/community/notifications";
  event.waitUntil(self.clients.openWindow(target));
});
