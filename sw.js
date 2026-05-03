// ════════════════════════════════════════════════════════════
//  ARKANA PANCABHUTA — Service Worker
//  Cache Strategy: Cache-First for static assets
// ════════════════════════════════════════════════════════════

const CACHE_NAME = 'arkana-v1';
const DYNAMIC_CACHE = 'arkana-dynamic-v1';

// Mendaftarkan file HTML, Manifest, dan semua MP3 agar bisa Offline
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Welcome.mp3',
  './Water Drop with original Sound(MP3_160K).mp3',
  './suara api no copyright  __ Fire sound effect (no copyright) _firesounds _firesoundseffect(MP3_160K).mp3',
  './Lightning sound ⚡_thunder and lightning sound effects(MP3_160K).mp3',
  './Tanah retak(MP3_160K).mp3',
  './Wind howl sound effect (HD) The sound of howling wind(MP3_160K).mp3'
];

// External CDN assets
const CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
  'actions.google.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  if (CDN_PATTERNS.some(pattern => url.hostname.includes(pattern))) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      fetchAndUpdate(request, cache);
      return cached;
    }
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return offlineFallback();
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    return cached || offlineFallback();
  }
}

async function fetchAndUpdate(request, cache) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put(request, response);
    }
  } catch (_) {}
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Arkana Offline</title><style>body{background:#080c12;color:#c9a227;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;font-family:serif;}</style></head><body><div><h1>◆ GERBANG TERTUTUP ◆</h1><p>Koneksi terputus. Energi tetap tersimpan.</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
  );
}
