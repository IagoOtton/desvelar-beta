const CACHE_PREFIX = "desvelar-static-";
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`;
const HASHED_ASSET_PATH = /\/assets\/[^/]+-[a-z0-9_-]{8,}\.(?:css|js)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const oldCacheNames = (await caches.keys()).filter(
        (cacheName) =>
          cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
      );
      const obsoleteCacheNames = oldCacheNames.slice(0, -1);
      await Promise.all(
        obsoleteCacheNames.map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !HASHED_ASSET_PATH.test(url.pathname)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (!cacheName.startsWith(CACHE_PREFIX)) continue;
        const cachedResponse = await (await caches.open(cacheName)).match(request);
        if (cachedResponse) return cachedResponse;
      }

      const response = await fetch(request);
      if (response.ok) {
        try {
          const currentCache = await caches.open(CACHE_NAME);
          await currentCache.put(request, response.clone());
        } catch {}
      }
      return response;
    })(),
  );
});
