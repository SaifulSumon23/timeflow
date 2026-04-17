// TimeFlow Service Worker v2.0
const CACHE = 'timeflow-v2';
const ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/css/style.css',
  '/js/firebase-config.js', '/js/auth.js', '/js/storage.js',
  '/js/tasks.js', '/js/calendar.js', '/js/analytics.js', '/js/app.js',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.protocol === 'chrome-extension:') return;
  // Network-first for Firebase/Google
  if (url.hostname.includes('google') || url.hostname.includes('firebase') || url.hostname.includes('gstatic')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for app files
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
