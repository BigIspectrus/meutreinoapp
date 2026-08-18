const CACHE_NAME = 'treinoapp-v9-20260818';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(resp => {
      const copy = resp.clone(); caches.open(CACHE_NAME).then(c => c.put('./index.html', copy)); return resp;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      const copy = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy));
    }
    return resp;
  })));
});

let timerId = null;
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'STOP_TIMER') { if (timerId) clearTimeout(timerId); timerId = null; return; }
  if (data.type === 'START_TIMER') {
    if (timerId) clearTimeout(timerId);
    const seconds = Math.max(0, Number(data.seconds) || 0);
    timerId = setTimeout(async () => {
      timerId = null;
      if (self.registration.showNotification) {
        await self.registration.showNotification('TreinoApp', {body:'Descanso concluído. Próxima série.', icon:'./icon-192.png', badge:'./icon-192.png', tag:'rest-timer', renotify:true});
      }
    }, seconds * 1000);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) if ('focus' in client) return client.focus();
    if (clients.openWindow) return clients.openWindow('./');
  }));
});
