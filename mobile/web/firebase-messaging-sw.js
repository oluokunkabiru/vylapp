// ════════════════════════════════════════════════════════════════════════════
//  firebase-messaging-sw.js
//  Firebase Cloud Messaging service worker for web push notifications.
//
//  SETUP:
//    1. Replace the firebaseConfig values below with your project's config
//       from the Firebase console (Project Settings → Your apps → Web app).
//    2. This file must live at /web/firebase-messaging-sw.js (the root of
//       your web server). Flutter's web build copies /web/ to the output.
//    3. The VAPID key for web push is set in NotificationService.initialise()
//       on the Dart side: await _messaging.getToken(vapidKey: 'YOUR_VAPID_KEY')
//
//  HOW IT WORKS:
//    - The service worker runs in the background even when the tab is closed.
//    - FCM calls this worker when a message arrives for a web user.
//    - We show a browser notification using the Web Notifications API.
//    - When the user taps the notification, we post a message to the main
//      Flutter window so GoRouter can navigate to the correct screen.
// ════════════════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// ── Replace these with your Firebase project config ───────────────────────────
firebase.initializeApp({
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
  measurementId:     "REPLACE_WITH_YOUR_MEASUREMENT_ID",
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────────
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || 'Vylapp';
  const notificationOptions = {
    body:    payload.notification?.body || '',
    icon:    '/icons/Icon-192.png',
    badge:   '/icons/Icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      type:      payload.data?.type || 'system',
      entity_id: payload.data?.entity_id || '',
      route:     payload.data?.route || '/',
      url:       self.registration.scope,
    },
    actions: [
      { action: 'open', title: 'Open Vylapp' },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const route = event.notification.data?.route || '/';
  const urlToOpen = new URL(route, self.registration.scope).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If a tab is already open, focus it and post the navigation message
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: event.notification.data,
            });
            return client.focus();
          }
        }
        // No tab open — open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
