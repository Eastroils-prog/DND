/* Frindeval service worker: shows notifications sent by the DM.
   It does not store the website offline, so updates always arrive straight away. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Frindeval';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Something new is waiting for you.',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: data.url || 'player.html' }, tag: data.tag || 'frindeval', renotify: true,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url || 'player.html', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
