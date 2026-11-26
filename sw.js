// Keeps CIG Timepieces working offline. Bump VERSION after changing any file.
const VERSION = "cig-timepieces-v7";
const FILES = ["./", "index.html", "app.css", "app.js", "catalog.js", "docs.js", "manifest.webmanifest", "icon-64.png", "icon-180.png", "logo-ink.png", "logo-silver.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the phone's 10-minute hold so the new version is stored fresh.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cig-timepieces") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Network first so updates arrive; cached copy when offline.
// cache: "no-cache" asks the server whether each file changed (a quick check) instead of reusing a held copy.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
