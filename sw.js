const CACHE_NAME = 'treino-app-v10';
const ASSETS = ['./', './index.html'];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (offline-first) ────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Timer em background ──────────────────────────────────
let timerAlarm = null;

self.addEventListener('message', e => {
  if (e.data?.type === 'START_TIMER') {
    const ms = e.data.seconds * 1000;
    clearTimeout(timerAlarm);
    timerAlarm = setTimeout(() => {
      // Dispara 3 notificações com vibração crescente
    const msgs = [
      { body: '⏰ Descanso acabou! Hora da próxima série! 💪', vibrate: [300,100,300] },
      { body: '💪 Bora! Próxima série te esperando!', vibrate: [300,100,300,100,300] },
      { body: '🔥 Vamos lá! Não deixa esfriar!', vibrate: [500,100,500,100,500] },
    ];
    msgs.forEach((m, i) => {
      setTimeout(() => {
        self.registration.showNotification('🏋️ TreinoApp — Descanse acabou!', {
          body: m.body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: m.vibrate,
          tag: `rest-timer-${i}`,
          renotify: true,
          requireInteraction: i === 2, // última fica até dispensar
          silent: false
        });
      }, i * 4000);
    });
    }, ms);
  }

  if (e.data?.type === 'STOP_TIMER') {
    clearTimeout(timerAlarm);
  }
});

// ── Clique na notificação abre o app ────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});
