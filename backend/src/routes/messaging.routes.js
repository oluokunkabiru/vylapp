const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function shapeConversation(row) {
  return {
    id: row.id, type: row.type, name: row.name, avatarUrl: row.avatar_url, color: row.color,
    lastMessagePreview: row.last_message_preview, lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count, otherUser: row.other_handle ? {
      id: row.other_user_id, handle: row.other_handle, displayName: row.other_display_name,
      avatarColor: row.other_avatar_color, avatarInitials: row.other_avatar_initials, verified: row.other_verified,
    } : null,
  };
}

// ── GET /messages/conversations ──────────────────────────────────────────
router.get("/conversations", asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*, cm.unread_count,
       ou.id as other_user_id, ou.handle as other_handle, ou.display_name as other_display_name,
       ou.avatar_color as other_avatar_color, ou.avatar_initials as other_avatar_initials, ou.verified as other_verified
     FROM conversation_members cm
     JOIN conversations c ON c.id = cm.conversation_id
     LEFT JOIN conversation_members ocm ON ocm.conversation_id = c.id AND ocm.user_id != $1 AND c.type = 'dm'
     LEFT JOIN users ou ON ou.id = ocm.user_id
     WHERE cm.user_id = $1 AND cm.left_at IS NULL
     ORDER BY c.last_message_at DESC NULLS LAST LIMIT 50`,
    [req.user.id]
  );
  return ok(res, { conversations: rows.map(shapeConversation) });
}));

// ── POST /messages/conversations/dm — get or create a 1:1 conversation ───
router.post("/conversations/dm", asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return fail(res, 400, "userId is required");
  if (userId === req.user.id) return fail(res, 400, "Cannot DM yourself");

  const existing = await db.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
     WHERE c.type = 'dm' LIMIT 1`,
    [req.user.id, userId]
  );
  if (existing.rows.length) return ok(res, { conversationId: existing.rows[0].id, created: false });

  const conv = await db.query(`INSERT INTO conversations (type, created_by) VALUES ('dm', $1) RETURNING id`, [req.user.id]);
  await db.query(`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)`, [conv.rows[0].id, req.user.id, userId]);
  return ok(res, { conversationId: conv.rows[0].id, created: true }, 201);
}));

// ── GET /messages/conversations/:id/messages ─────────────────────────────
router.get("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const member = await db.query(`SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  if (!member.rows.length) return fail(res, 403, "Not a member of this conversation");

  const { rows } = await db.query(
    `SELECT m.*, u.handle, u.display_name, u.avatar_color, u.avatar_initials FROM messages m
     JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = $1 AND m.is_deleted = FALSE
     ORDER BY m.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  await db.query(`UPDATE conversation_members SET unread_count = 0, last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);

  return ok(res, {
    messages: rows.reverse().map(m => ({
      id: m.id, content: m.content, contentType: m.content_type, replyToId: m.reply_to_id,
      sender: { id: m.sender_id, handle: m.handle, displayName: m.display_name, avatarColor: m.avatar_color, avatarInitials: m.avatar_initials },
      createdAt: m.created_at,
    })),
  });
}));

// ── POST /messages/conversations/:id/messages ────────────────────────────
router.post("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const { content, contentType } = req.body;
  if (!content?.trim()) return fail(res, 400, "content is required");

  const member = await db.query(`SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  if (!member.rows.length) return fail(res, 403, "Not a member of this conversation");

  const { rows } = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, content_type) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, req.user.id, content.trim(), contentType || "text"]
  );
  const msg = rows[0];

  await db.query(
    `UPDATE conversations SET last_message_id = $1, last_message_at = NOW(), last_message_preview = $2 WHERE id = $3`,
    [msg.id, content.slice(0, 100), req.params.id]
  );
  await db.query(
    `UPDATE conversation_members SET unread_count = unread_count + 1 WHERE conversation_id = $1 AND user_id != $2`,
    [req.params.id, req.user.id]
  );

  // Notify other members
  const others = await db.query(`SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`, [req.params.id, req.user.id]);
  const NotificationEngine = require("../services/notificationEngine");
  for (const o of others.rows) {
    const body = NotificationEngine.formatBody("dm", req.user.displayName);
    await db.query(`INSERT INTO notifications (user_id, actor_id, type, message_id, conversation_id, body) VALUES ($1,$2,'dm',$3,$4,$5)`,
      [o.user_id, req.user.id, msg.id, req.params.id, body]);
  }

  // Real-time push over Socket.IO if available
  const io = req.app.get("io");
  if (io) io.to(`conversation:${req.params.id}`).emit("message:new", { conversationId: req.params.id, message: { id: msg.id, content: msg.content, senderId: req.user.id, createdAt: msg.created_at } });

  return ok(res, { message: { id: msg.id, content: msg.content, contentType: msg.content_type, createdAt: msg.created_at } }, 201);
}));

module.exports = router;
