// ════════════════════════════════════════════════════════════════════════════
//  REAL-TIME LAYER — Socket.IO
//  Handles: conversation rooms (live message delivery), Space presence
//  (listener join/leave broadcasts), and live notification pushes.
//  Auth: mobile app connects with { auth: { token } } using the JWT it holds
//  in secure on-device storage. The web client can't do that (its access
//  token lives in an httpOnly vyl_at cookie, invisible to JS) — it connects
//  with { withCredentials: true } instead, and the token is read straight
//  off the handshake's Cookie header.
// ════════════════════════════════════════════════════════════════════════════
import { Server, Socket } from "socket.io";
import { parseCookie } from "cookie";
import crypto from "../utils/crypto";
import env from "../config/env";
import authCookies from "../utils/authCookies";
import db from "../config/db";

const { verifyJWT } = crypto;

interface AuthedSocket extends Socket {
  userId?: string;
}

function _extractToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return null;
  return parseCookie(rawCookie)[authCookies.ACCESS_COOKIE] || null;
}

function attachSockets(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    const token = _extractToken(socket);
    if (!token) return next(new Error("Missing auth token"));
    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) return next(new Error(result.error || "Invalid token"));
    socket.userId = result.payload.sub;
    next();
  });

  io.on("connection", (socket: AuthedSocket) => {
    db.query(`UPDATE users SET online = TRUE, last_seen = NOW() WHERE id = $1`, [socket.userId]).catch(() => {});

    // ── Conversation rooms (DMs / group chat) ───────────────────────────
    socket.on("conversation:join", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("conversation:typing", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit("conversation:typing", { conversationId, userId: socket.userId });
    });

    // ── Space presence (live audio room) ────────────────────────────────
    socket.on("space:join", async ({ spaceId }: { spaceId: string }) => {
      socket.join(`space:${spaceId}`);
      socket.to(`space:${spaceId}`).emit("space:participant_joined", { spaceId, userId: socket.userId });
    });
    socket.on("space:leave", ({ spaceId }: { spaceId: string }) => {
      socket.leave(`space:${spaceId}`);
      socket.to(`space:${spaceId}`).emit("space:participant_left", { spaceId, userId: socket.userId });
    });
    socket.on("space:hand_raise", ({ spaceId }: { spaceId: string }) => {
      socket.to(`space:${spaceId}`).emit("space:hand_raised", { spaceId, userId: socket.userId });
    });

    // ── Personal notification channel ───────────────────────────────────
    socket.join(`user:${socket.userId}`);

    socket.on("disconnect", () => {
      db.query(`UPDATE users SET online = FALSE, last_seen = NOW() WHERE id = $1`, [socket.userId]).catch(() => {});
    });
  });
}

// Helper other parts of the app can use to push a live notification
function pushNotification(io: Server, userId: string, notification: unknown) {
  io.to(`user:${userId}`).emit("notification:new", notification);
}

export = { attachSockets, pushNotification };
