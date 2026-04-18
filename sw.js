/* ===== TimeFlow Service Worker — Notification Fix ===== */
const CACHE_NAME = 'timeflow-v4';
const ASSETS = [
  '/', '/index.html', '/css/style.css',
  '/js/firebase-config.js', '/js/auth.js', '/js/storage.js',
  '/js/tasks.js', '/js/calendar.js', '/js/analytics.js', '/js/app.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install',  e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('gstatic')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

/* Notification click */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(cs => {
      const ex = cs.find(c => c.url.includes(self.location.origin));
      return ex ? ex.focus() : clients.openWindow('/');
    })
  );
});

/* Background sync */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(
      clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type:'SYNC_TASKS' })))
    );
  }
});

/* ── NOTIFICATION ALARM STORE ──
   Store alarms in IndexedDB so they survive SW idle/restart */
function openAlarmDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('timeflow-alarms', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('alarms', { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e);
  });
}

async function saveAlarm(alarm) {
  const db    = await openAlarmDB();
  const tx    = db.transaction('alarms', 'readwrite');
  tx.objectStore('alarms').put(alarm);
}

async function getAllAlarms() {
  const db = await openAlarmDB();
  return new Promise(resolve => {
    const tx  = db.transaction('alarms', 'readonly');
    const req = tx.objectStore('alarms').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function deleteAlarm(id) {
  const db = await openAlarmDB();
  const tx = db.transaction('alarms', 'readwrite');
  tx.objectStore('alarms').delete(id);
}

/* Check alarms every 60 seconds using a periodic check */
async function checkAlarms() {
  const alarms = await getAllAlarms();
  const now    = Date.now();
  for (const alarm of alarms) {
    if (now >= alarm.fireAt) {
      await self.registration.showNotification('⏰ TimeFlow Reminder', {
        body:    `"${alarm.taskName}" starts in ${alarm.minutesBefore} minutes!`,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-192.png',
        tag:     alarm.id,
        vibrate: [300,100,300,100,300],
        requireInteraction: true,
        data:    { url: '/' },
        actions: [
          { action:'open',    title:'📋 View Task' },
          { action:'dismiss', title:'✕ Dismiss'    }
        ]
      });
      await deleteAlarm(alarm.id);
    }
  }
}

/* Heartbeat — wake SW every minute to check alarms */
self.addEventListener('message', async e => {
  if (e.data?.type === 'HEARTBEAT') {
    await checkAlarms();
  }

  if (e.data?.type === 'SCHEDULE_REMINDER') {
    const { taskName, minutesBefore, fireAt } = e.data;
    const id = `${taskName}-${minutesBefore}-${fireAt}`;
    await saveAlarm({ id, taskName, minutesBefore, fireAt });
  }

  if (e.data?.type === 'CLEAR_REMINDERS') {
    const db    = await openAlarmDB();
    const tx    = db.transaction('alarms', 'readwrite');
    tx.objectStore('alarms').clear();
  }
});
