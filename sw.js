// sw.js — service worker for offline support.
// Cache-first for the app shell so Mystery works without a network.
const CACHE = "mystery-v2";
const CARD_IDS = [
  "fool", "magician", "high-priestess", "empress", "emperor", "hierophant",
  "lovers", "chariot", "strength", "hermit", "wheel-of-fortune", "justice",
  "hanged-man", "death", "temperance", "devil", "tower", "star", "moon",
  "sun", "judgement", "world",
];
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./cards.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...CARD_IDS.map((id) => `./cards/${id}.jpg`),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Same-origin: cache-first, falling back to network and caching the result.
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((resp) => {
              const copy = resp.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
              return resp;
            })
            .catch(() => cached)
      )
    );
    return;
  }

  // Cross-origin (e.g. Google Fonts): network-first, fall back to cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
