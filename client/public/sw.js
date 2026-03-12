const CACHE_NAME = 'swissrh-v1';
const API_CACHE  = 'swissrh-api-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(['/', '/index.html', '/manifest.json'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request.clone()).then(r => {
      if (r.ok && e.request.method === 'GET')
        caches.open(API_CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }

  if (/\.(js|css|png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(c =>
      c || fetch(e.request).then(r => {
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, r.clone()));
        return r;
      })
    ));
    return;
  }

  e.respondWith(fetch(e.request)
    .then(r => { caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; })
    .catch(() => caches.match(e.request) || caches.match('/index.html'))
  );
});

self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(d.title || 'SwissRH', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-72.png',
    data: d.url || '/', tag: d.tag || 'swissrh-notif',
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || '/'));
});
