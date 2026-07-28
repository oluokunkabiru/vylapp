// ════════════════════════════════════════════════════════════════════════════
//  FIREBASE CLOUD MESSAGING — background/closed-app push for chat messages.
//  Real-time in-app updates (badges, live message list) stay on Socket.IO
//  (see lib/socket.js) — this only covers the case Socket.IO physically
//  can't: the tab/app isn't open. All config comes from VITE_FIREBASE_*
//  env vars (see .env.example) — safe to expose to the browser bundle,
//  none of these are secrets (Firebase web config is public by design).
// ════════════════════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { api } from "./api.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

async function getMessagingInstance() {
  if (messaging) return messaging;
  if (!firebaseConfig.apiKey || !("serviceWorker" in navigator)) return null;
  if (!(await isSupported().catch(() => false))) return null;
  app = app || initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  return messaging;
}

// Requests browser notification permission, registers the FCM service
// worker, fetches a device token, and (if new) syncs it to the backend's
// push_tokens table so messages can be pushed to this device. Safe to call
// repeatedly — a no-op once already granted+synced this session.
export async function requestNotificationPermission() {
  const m = await getMessagingInstance();
  if (!m) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;

    if (localStorage.getItem("vyl_fcm_token") !== token) {
      await api.post("/notifications/push-token", { token, platform: "web", deviceName: navigator.userAgent.slice(0, 100) });
      localStorage.setItem("vyl_fcm_token", token);
    }
    return token;
  } catch (err) {
    console.warn("FCM permission/token setup failed:", err);
    return null;
  }
}

// Resolves with each message received while the tab is in the foreground
// (background messages are handled entirely by the service worker instead).
export async function onForegroundMessage(callback) {
  const m = await getMessagingInstance();
  if (!m) return () => {};
  return onMessage(m, callback);
}
