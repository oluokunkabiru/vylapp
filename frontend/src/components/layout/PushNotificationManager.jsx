import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { requestNotificationPermission, onForegroundMessage } from "../../lib/firebase.js";

// Headless: registers this device for FCM push (background/closed-app chat
// notifications) once a user is signed in, and surfaces foreground pushes
// as a toast. Renders nothing — mount once near the app root.
export default function PushNotificationManager() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Slight delay so it doesn't compete with the initial app mount/paint.
    const t = setTimeout(() => requestNotificationPermission(), 2500);

    let unsubscribe = () => {};
    onForegroundMessage((payload) => {
      toast(payload.notification?.body || "New message");
    }).then(fn => { unsubscribe = fn; });

    const handleSWMessage = (event) => {
      if (event.data?.type === "NAVIGATE") navigate(event.data.url);
    };
    navigator.serviceWorker?.addEventListener?.("message", handleSWMessage);

    return () => {
      clearTimeout(t);
      unsubscribe();
      navigator.serviceWorker?.removeEventListener?.("message", handleSWMessage);
    };
  }, [user, navigate, toast]);

  return null;
}
