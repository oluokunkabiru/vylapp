import { io } from "socket.io-client";

let socket = null;

export function getSocket() { return socket; }

// Dev: same-origin, proxied to the backend via vite.config.js's /socket.io
// proxy. Production build: same-origin too when VITE_BACKEND_URL is a
// relative path like /api (public/.htaccess proxies /socket.io) — must
// connect to "/" then, since io("/api") would mean the "/api" namespace,
// not a URL. Only an absolute VITE_BACKEND_URL connects cross-origin.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";
const SOCKET_URL = import.meta.env.DEV || !/^https?:\/\//.test(BACKEND_URL) ? "/" : BACKEND_URL;

// The access token lives in an httpOnly cookie now — withCredentials makes
// the browser attach it automatically, no JS-readable token to pass here.
export function connectSocket() {
  if (socket?.connected) return;
  socket = io(SOCKET_URL, {
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  });
  socket.on("connect_error", (e) => console.warn("[socket]", e.message));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
