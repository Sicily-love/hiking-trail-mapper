const CACHE_PREFIX = 'outdoor-route-studio-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/app-icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(SHELL_FILES))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if(response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;
  if(request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if(url.pathname.endsWith('/manifest.webmanifest') || url.pathname.includes('/icons/')) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
