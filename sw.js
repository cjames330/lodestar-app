/* Lodestar service worker */
const CACHE = "lodestar-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(request).then((hit) =>
      hit ||
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

/* Tapping a reminder opens (or focuses) the app */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* A push from the scheduler shows up as a Lodestar notification.
   The payload carries the list's title (emoji + name), the lesson, and a per-list
   tag so each list stacks on its own. */
self.addEventListener("push", (e) => {
  let p = { title: "Lodestar", body: "A lesson to carry.", tag: "lodestar" };
  try { if (e.data) p = Object.assign(p, e.data.json()); }
  catch { if (e.data) p.body = e.data.text(); }
  e.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      icon: "icon-192.png",
      badge: "favicon-32.png",
      tag: p.tag || "lodestar",
      renotify: true,
      data: { url: p.url || "./" }
    })
  );
});
