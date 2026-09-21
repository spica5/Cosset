/* Cosset PWA service worker — installable app + push notifications */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Chromium installability requires a fetch handler. Do not intercept requests:
// calling respondWith(fetch(...)) rejects on aborted navigations (e.g. Next.js
// route changes) and floods the console with "Failed to fetch" / network errors.
self.addEventListener('fetch', () => {});

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Cosset',
    body: 'Something new is happening on Cosset.',
    url: '/dashboard/community/cinema',
    tag: 'cosset',
    image: '',
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) payload.body = text;
    } catch {
      // keep defaults
    }
  }

  const origin = self.location.origin;
  const icon = `${origin}/icons/cosset-192.png`;
  const title = stripHtml(payload.title) || 'Cosset';
  const body = stripHtml(payload.body) || 'Something new is happening on Cosset.';
  const image = typeof payload.image === 'string' && payload.image.trim() ? payload.image.trim() : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      image,
      tag: payload.tag || 'cosset',
      renotify: true,
      vibrate: [120, 60, 120],
      requireInteraction: false,
      data: { url: payload.url || '/dashboard/community/cinema' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/dashboard/community/cinema';
  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : `${self.location.origin}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
      return undefined;
    }),
  );
});
