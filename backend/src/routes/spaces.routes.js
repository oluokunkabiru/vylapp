const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const SpacesEngine = require("../services/spacesEngine");
const NotificationEngine = require("../services/notificationEngine");

const router = express.Router();

function shapeSpace(row) {
  return {
    id: row.id, title: row.title, description: row.description, category: row.category,
    tags: row.tags, color: row.color, isVideo: row.is_video, isTicketed: row.is_ticketed,
    ticketPriceUsd: row.ticket_price_usd, status: row.status,
    scheduledFor: row.scheduled_for, startedAt: row.started_at, endedAt: row.ended_at,
    listenersCount: row.listeners_count, peakListeners: row.peak_listeners, speakersCount: row.speakers_count,
    totalTipsUsd: row.total_tips_usd, recordingUrl: row.recording_url,
    host: { id: row.host_id, handle: row.handle, displayName: row.display_name, avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, verified: row.verified },
    createdAt: row.created_at,
  };
}

const SPACE_FIELDS = `s.*, u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.verified`;

// ── GET /spaces — live + upcoming ─────────────────────────────────────────
router.get("/", optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${SPACE_FIELDS} FROM spaces s JOIN users u ON u.id = s.host_id
     WHERE s.status IN ('live','scheduled') ORDER BY (s.status = 'live') DESC, s.scheduled_for ASC NULLS LAST, s.created_at DESC LIMIT 50`
  );
  return ok(res, { spaces: rows.map(shapeSpace) });
}));

// ── POST /spaces — create / schedule ─────────────────────────────────────
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { title, description, category, tags, isVideo, scheduledFor, ticketPriceUsd } = req.body;
  if (!title?.trim()) return fail(res, 400, "title is required");
  const { rows } = await db.query(
    `INSERT INTO spaces (host_id, title, description, category, tags, is_video, is_ticketed, ticket_price_usd, status, scheduled_for)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, title.trim(), description || null, category || "GENERAL", tags || [], !!isVideo,
     !!ticketPriceUsd, ticketPriceUsd || null, scheduledFor ? "scheduled" : "scheduled", scheduledFor || null]
  );
  const space = rows[0];
  await db.query(
    `INSERT INTO conversations (type, name, space_id, created_by) VALUES ('space_chat',$1,$2,$3)`,
    [title, space.id, req.user.id]
  ).catch(() => {});
  return ok(res, { space: shapeSpace({ ...space, handle: req.user.handle, display_name: req.user.displayName }), calendarLinks: SpacesEngine.calendarLinks(title, space.id) }, 201);
}));

// ── POST /spaces/:id/start ────────────────────────────────────────────────
router.post("/:id/start", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT host_id FROM spaces WHERE id = $1`, [req.params.id]);
  if (!rows.length) return fail(res, 404, "Space not found");
  if (rows[0].host_id !== req.user.id) return fail(res, 403, "Only the host can start this Space");
  await db.query(`UPDATE spaces SET status = 'live', started_at = NOW() WHERE id = $1`, [req.params.id]);

  // Notify followers
  const followers = await db.query(`SELECT follower_id FROM connections WHERE following_id = $1 AND notify_spaces = TRUE`, [req.user.id]);
  const body = NotificationEngine.formatBody("space_live", req.user.displayName);
  for (const f of followers.rows) {
    await db.query(`INSERT INTO notifications (user_id, actor_id, type, space_id, body) VALUES ($1,$2,'space_live',$3,$4)`, [f.follower_id, req.user.id, req.params.id, body]);
  }
  return ok(res, { status: "live" });
}));

// ── POST /spaces/:id/end ─────────────────────────────────────────────────
router.post("/:id/end", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT host_id, started_at, peak_listeners FROM spaces WHERE id = $1`, [req.params.id]);
  if (!rows.length) return fail(res, 404, "Space not found");
  if (rows[0].host_id !== req.user.id) return fail(res, 403, "Only the host can end this Space");
  const durationSeconds = rows[0].started_at ? Math.floor((Date.now() - new Date(rows[0].started_at).getTime()) / 1000) : 0;
  await db.query(`UPDATE spaces SET status = 'ended', ended_at = NOW(), duration_seconds = $1 WHERE id = $2`, [durationSeconds, req.params.id]);
  return ok(res, { status: "ended", durationSeconds, peakListeners: rows[0].peak_listeners });
}));

// ── POST /spaces/:id/join ────────────────────────────────────────────────
router.post("/:id/join", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM spaces WHERE id = $1`, [req.params.id]);
  if (!rows.length) return fail(res, 404, "Space not found");
  const role = rows[0].host_id === req.user.id ? "host" : "listener";

  await db.query(
    `INSERT INTO space_participants (space_id, user_id, role) VALUES ($1,$2,$3)
     ON CONFLICT (space_id, user_id) DO UPDATE SET left_at = NULL, role = EXCLUDED.role`,
    [req.params.id, req.user.id, role]
  );
  const updated = await db.query(
    `UPDATE spaces SET listeners_count = listeners_count + 1, peak_listeners = GREATEST(peak_listeners, listeners_count + 1) WHERE id = $1 RETURNING listeners_count`,
    [req.params.id]
  );
  return ok(res, {
    role, listenersCount: updated.rows[0].listeners_count,
    rtcToken: SpacesEngine.generateRtcToken(),
    translationToken: SpacesEngine.generateTranslationToken(),
  });
}));

// ── POST /spaces/:id/leave ───────────────────────────────────────────────
router.post("/:id/leave", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`UPDATE space_participants SET left_at = NOW() WHERE space_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  await db.query(`UPDATE spaces SET listeners_count = GREATEST(0, listeners_count - 1) WHERE id = $1`, [req.params.id]);
  return ok(res, { left: true });
}));

// ── POST /spaces/:id/remind ──────────────────────────────────────────────
router.post("/:id/remind", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO space_reminders (space_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, req.user.id]);
  return ok(res, { reminderSet: true });
}));

// ── POST /spaces/:id/tip ─────────────────────────────────────────────────
router.post("/:id/tip", requireAuth, asyncHandler(async (req, res) => {
  const { amountUsd, message } = req.body;
  if (!amountUsd || amountUsd <= 0) return fail(res, 400, "amountUsd must be positive");
  const space = await db.query(`SELECT host_id FROM spaces WHERE id = $1`, [req.params.id]);
  if (!space.rows.length) return fail(res, 404, "Space not found");
  const CreatorEconomyEngine = require("../services/creatorEconomyEngine");
  const split = CreatorEconomyEngine.splitSuperVibe(amountUsd);
  const tip = await db.query(
    `INSERT INTO space_tips (space_id, tipper_id, recipient_id, amount_usd, message) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, req.user.id, space.rows[0].host_id, amountUsd, message || null]
  );
  await db.query(`UPDATE spaces SET total_tips_usd = total_tips_usd + $1 WHERE id = $2`, [amountUsd, req.params.id]);
  await db.query(
    `INSERT INTO transactions (user_id, counterparty_id, type, direction, amount_usd, platform_fee_usd, net_usd, description)
     VALUES ($1,$2,'tip','debit',$3,$4,$3,'Space tip')`,
    [req.user.id, space.rows[0].host_id, amountUsd, split.platform_cut]
  );
  return ok(res, { tip: tip.rows[0], split }, 201);
}));

module.exports = { router, shapeSpace };
