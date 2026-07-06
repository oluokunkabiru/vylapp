// ════════════════════════════════════════════════════════════════════════════
//  REAL-TIME LAYER — Socket.IO
//  Handles: conversation rooms (live message delivery), Space presence
//  (listener join/leave broadcasts), and live notification pushes.
//  Auth: client connects with { auth: { token } } using the same JWT
//  issued by /auth/login — no separate session system needed.
// ════════════════════════════════════════════════════════════════════════════
const { verifyJWT } = require("../utils/crypto");
const env = require("../config/env");
const db = require("../config/db");

function attachSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) return next(new Error(result.error || "Invalid token"));
    socket.userId = result.payload.sub;
    next();
  });

  io.on("connection", (socket) => {
    db.query(`UPDATE users SET online = TRUE, last_seen = NOW() WHERE id = $1`, [socket.userId]).catch(() => {});

    // ── Conversation rooms (DMs / group chat) ───────────────────────────
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("conversation:typing", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("conversation:typing", { conversationId, userId: socket.userId });
    });

    // ── Space presence (live audio room) ────────────────────────────────
    socket.on("space:join", async ({ spaceId }) => {
      socket.join(`space:${spaceId}`);
      socket.to(`space:${spaceId}`).emit("space:participant_joined", { spaceId, userId: socket.userId });
    });
    socket.on("space:leave", ({ spaceId }) => {
      socket.leave(`space:${spaceId}`);
      socket.to(`space:${spaceId}`).emit("space:participant_left", { spaceId, userId: socket.userId });
    });
    socket.on("space:hand_raise", ({ spaceId }) => {
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
function pushNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit("notification:new", notification);
}

module.exports = { attachSockets, pushNotification };
