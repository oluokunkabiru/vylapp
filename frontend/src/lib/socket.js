import { io } from "socket.io-client";

let socket = null;

export function getSocket() { return socket; }

// The access token lives in an httpOnly cookie now — withCredentials makes
// the browser attach it automatically, no JS-readable token to pass here.
export function connectSocket() {
  if (socket?.connected) return;
  socket = io("/", {
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
