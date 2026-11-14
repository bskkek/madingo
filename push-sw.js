// Madingo push notifications — service-worker side.
// Imported into the generated service worker via workbox `importScripts`
// (see vite.config.ts). This file lives in public/ so it is copied to the
// build output as-is and imported by sw.js as `push-sw.js`.
//
// Two events:
//   * 'push' — the server sent an encrypted payload; show it as a
//     notification (title/body/icon from the payload, deep link in data.url).
//   * 'notificationclick' — tapping the notification opens (or focuses +
//     navigates) the app at the deep link: the Road for level reminders,
//     the verb window for the verb of the day.
// Test hook: a 'message' event {type:'madingo-test-push', payload:{...}}
// shows a notification through the same code path as a real push. It lets
// the browser test harness prove the SW displays the notification and the
// tap opens the deep link without a real push service. Harmless in
// production — only the app's own pages can reach its own SW.
function showPushNotification(data) {
  const scope = self.registration.scope;
  const title = data.title || 'madingo';
  const url = data.url || scope;
  const options = {
    body: data.body || '',
    tag: data.tag || 'madingo',
    icon: data.icon || new URL('pwa-192x192.png', scope).href,
    badge: new URL('icon.svg', scope).href,
    data: { url },
    renotify: false,
    requireInteraction: false,
  };
  return self.registration.showNotification(title, options);
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // A push with no/invalid payload: show a generic reminder instead of
    // nothing (a push without showNotification is dropped by the browser).
    data = {};
  }
  event.waitUntil(showPushNotification(data));
});

self.addEventListener('message', (event) => {
  const data = event && event.data;
  if (data && data.type === 'madingo-test-push' && data.payload) {
    event.waitUntil(showPushNotification(data.payload));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        try {
          if (new URL(client.url).origin === self.location.origin) {
            await client.navigate(url);
            return client.focus();
          }
        } catch (e) {
          // fall through to openWindow
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
