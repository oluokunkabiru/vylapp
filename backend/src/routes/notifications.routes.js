const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const NotificationEngine = require("../services/notificationEngine");

const router = express.Router();
router.use(requireAuth);

function shapeNotification(row) {
  return {
    id: row.id, type: row.type, body: row.body, isRead: row.is_read, createdAt: row.created_at,
    actor: row.actor_id ? { id: row.actor_id, handle: row.handle, displayName: row.display_name, avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, verified: row.verified } : null,
    vibeId: row.vibe_id, spaceId: row.space_id, conversationId: row.conversation_id,
  };
}

// ── GET /notifications ───────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT n.*, u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.verified
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const prefs = await db.query(`SELECT * FROM notification_preferences WHERE user_id = $1`, [req.user.id]);
  const ranked = NotificationEngine.rankNotifications(rows.map(shapeNotification), { muted_types: [] });
  const unreadCount = rows.filter(r => !r.is_read).length;
  return ok(res, { notifications: ranked, unreadCount });
}));

// ── POST /notifications/:id/read ─────────────────────────────────────────
router.post("/:id/read", asyncHandler(async (req, res) => {
  await db.query(`UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  return ok(res, { read: true });
}));

// ── POST /notifications/read-all ─────────────────────────────────────────
router.post("/read-all", asyncHandler(async (req, res) => {
  await db.query(`UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`, [req.user.id]);
  return ok(res, { allRead: true });
}));

// ── GET /notifications/digest ─────────────────────────────────────────────
router.get("/digest", asyncHandler(async (req, res) => {
  const u = await db.query(`SELECT connections_count FROM users WHERE id = $1`, [req.user.id]);
  const recentFollowers = await db.query(`SELECT count(*) FROM connections WHERE following_id = $1 AND created_at > NOW() - INTERVAL '7 days'`, [req.user.id]);
  const impressions = await db.query(`SELECT COALESCE(SUM(views_count),0) AS v FROM vibes WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`, [req.user.id]);
  const earnings = await db.query(`SELECT COALESCE(SUM(net_usd),0) AS e FROM transactions WHERE counterparty_id = $1 AND direction = 'debit' AND created_at > NOW() - INTERVAL '7 days'`, [req.user.id]);

  const digest = NotificationEngine.generateDigest({
    new_followers: parseInt(recentFollowers.rows[0].count, 10),
    impressions: parseInt(impressions.rows[0].v, 10),
    earnings: parseFloat(earnings.rows[0].e),
  });
  return ok(res, { digest });
}));

// ── PATCH /notifications/preferences ─────────────────────────────────────
router.patch("/preferences", asyncHandler(async (req, res) => {
  const allowed = ["email_likes", "email_follows", "email_mentions", "email_dms", "push_likes", "push_follows", "push_mentions", "push_dms", "in_app_all"];
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    fields.push(`${key} = $${i++}`);
    values.push(val);
  }
  if (!fields.length) return fail(res, 400, "No valid preference fields");
  values.push(req.user.id);
  await db.query(
    `INSERT INTO notification_preferences (user_id) VALUES ($${i}) ON CONFLICT (user_id) DO NOTHING`,
    [req.user.id]
  );
  await db.query(`UPDATE notification_preferences SET ${fields.join(", ")} WHERE user_id = $${i}`, values);
  return ok(res, { updated: true });
}));

module.exports = router;
