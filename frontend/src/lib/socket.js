import { io } from "socket.io-client";

let socket = null;

export function getSocket() { return socket; }

// Dev: same-origin, proxied to the backend via vite.config.js's /socket.io
// proxy. Production build: connects to the backend directly at
// VITE_SOCKET_URL — the API goes through public/api/index.php, but PHP can't
// proxy websockets, so the socket stays cross-origin. Falls back to
// VITE_BACKEND_URL only when that's absolute: io("/api") would mean the
// "/api" namespace, not a URL.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";
const SOCKET_URL = import.meta.env.DEV ? "/"
  : (import.meta.env.VITE_SOCKET_URL || (/^https?:\/\//.test(BACKEND_URL) ? BACKEND_URL : "/"));

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
