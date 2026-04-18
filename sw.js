/* ===== TimeFlow Service Worker ===== */
const CACHE_NAME = 'timeflow-v3';
const ASSETS = [
  '/', '/index.html', '/css/style.css',
  '/js/firebase-config.js', '/js/auth.js', '/js/storage.js',
  '/js/tasks.js', '/js/calendar.js', '/js/analytics.js', '/js/app.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
];

/* Install — cache all assets */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* Activate — clean old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch — cache first, network fallback */
self.addEventListener('fetch', e => {
  // Skip Firebase/API requests — always go to network
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('gstatic')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

/* Push notification */
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'TimeFlow Reminder', {
      body:    data.body  || 'You have an upcoming task!',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     data.tag   || 'timeflow-reminder',
      data:    { url: '/' },
      actions: [
        { action: 'open',    title: '📋 Open App' },
        { action: 'dismiss', title: '✕ Dismiss'   }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});

/* Notification click */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});

/* Background sync — fires when back online */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(syncTasksToFirebase());
  }
});

async function syncTasksToFirebase() {
  const allClients = await clients.matchAll();
  allClients.forEach(client => client.postMessage({ type: 'SYNC_TASKS' }));
}

/* Task reminder alarm — triggered by main thread */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_REMINDER') {
    const { taskName, minutesBefore, delayMs } = e.data;
    setTimeout(() => {
      self.registration.showNotification('⏰ Task Reminder — TimeFlow', {
        body:    `"${taskName}" starts in ${minutesBefore} minutes!`,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-192.png',
        tag:     `reminder-${taskName}-${minutesBefore}`,
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        actions: [
          { action: 'open',    title: '📋 View Task' },
          { action: 'dismiss', title: '✕ Dismiss'    }
        ]
      });
    }, delayMs);
  }
});
