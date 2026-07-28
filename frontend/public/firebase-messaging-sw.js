// Firebase Cloud Messaging service worker — handles push notifications when
// the app isn't the active tab (or is fully closed). Foreground messages
// while the tab IS active are handled in src/lib/firebase.js instead.
//
// Runs outside the Vite build (plain script, no bundler, no env vars) so the
// web config below is duplicated from VITE_FIREBASE_* rather than imported —
// it's all public config, never a secret, so hardcoding it here is safe.
// IMPORTANT: keep these values in sync with frontend/.env's VITE_FIREBASE_*.
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_VITE_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_VITE_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "New message";
  self.registration.showNotification(title, {
    body: payload.notification?.body || "You have a new message.",
    icon: "/assets/icon-192.png",
    data: { conversationId: payload.data?.conversationId, type: payload.data?.type },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId;
  const targetUrl = conversationId ? `/messages?conversation=${conversationId}` : "/messages";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    }),
  );
});
