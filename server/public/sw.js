// Solutions Hub - Web Push Service Worker
// Handles background push notifications, click deep linking, and interactive notification actions.

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Solutions Hub',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Solutions Hub Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icon-192.png',
    badge: data.badge || '/assets/badge-72.png',
    tag: data.tag || 'solutions-hub-' + Date.now(),
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open Solution' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked Dismiss, simply close
  if (event.action === 'dismiss') {
    return;
  }

  const notifData = event.notification.data || {};
  const solutionId = notifData.solutionId || '';
  const targetPath = solutionId ? `/?solutionId=${encodeURIComponent(solutionId)}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and notify the app
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus().then(() => {
            if (solutionId) {
              client.postMessage({
                type: 'NAVIGATE_SOLUTION',
                solutionId: solutionId
              });
            }
          });
        }
      }

      // No open window found, open a new window with deep link
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});
