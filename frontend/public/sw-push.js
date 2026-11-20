// Handler Web Push untuk service worker yang di-generate vite-plugin-pwa.
// Di-load lewat workbox.importScripts di vite.config.js — tanpa ini, notifikasi
// tidak akan muncul walau browser berhasil subscribe.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: 'Notifikasi', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Kendana';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    tag: payload.tag || 'kendana-notification',
    data: payload.data || {},
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
