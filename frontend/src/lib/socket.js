import { io } from "socket.io-client";
import { api } from "./api.js";

let socket = null;

export function getSocket() { return socket; }

export function connectSocket() {
  const token = api.getToken();
  if (!token || socket?.connected) return;
  socket = io("/", {
    auth: { token },
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
