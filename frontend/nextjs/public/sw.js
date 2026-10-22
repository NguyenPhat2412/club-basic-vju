const IMAGE_CACHE = "vju-image-cache-v1";
const MAX_CACHED_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("vju-image-cache-") && name !== IMAGE_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.destination !== "image") return;

  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        event.waitUntil((async () => {
          await cache.put(request, response.clone());
          const requests = await cache.keys();
          const excess = requests.length - MAX_CACHED_IMAGES;
          if (excess > 0) await Promise.all(requests.slice(0, excess).map((oldRequest) => cache.delete(oldRequest)));
        })());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
