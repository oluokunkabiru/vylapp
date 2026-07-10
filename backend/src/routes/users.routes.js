const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

function publicUser(row, viewerFollows) {
  return {
    id: row.id, handle: row.handle, displayName: row.display_name, bio: row.bio,
    location: row.location, website: row.website,
    currentCountry: row.current_country, currentCity: row.current_city, heritageCountries: row.heritage_countries,
    avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url, roleTag: row.role_tag, verified: row.verified,
    verificationTier: row.verification_tier, isCreator: row.is_creator,
    vibesCount: row.vibes_count, connectionsCount: row.connections_count, followingCount: row.following_count,
    spacesHosted: row.spaces_hosted, createdAt: row.created_at,
    viewerFollows: viewerFollows ?? undefined,
  };
}

// ── GET /users/discover — diaspora discovery by current/heritage country ─
// Registered before /:handle so "discover" isn't swallowed as a handle lookup.
router.get("/discover", requireAuth, asyncHandler(async (req, res) => {
  const country = (req.query.country || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return fail(res, 400, "country must be a 2-letter country code");

  const { rows } = await db.query(
    `SELECT * FROM users
     WHERE deleted_at IS NULL AND id != $1
       AND (current_country = $2 OR $2 = ANY(heritage_countries))
     ORDER BY connections_count DESC LIMIT 20`,
    [req.user.id, country]
  );
  return ok(res, { users: rows.map(r => publicUser(r)) });
}));

// ── GET /users/:handle ───────────────────────────────────────────────────
router.get("/:handle", optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM users WHERE handle = $1 AND deleted_at IS NULL`, [req.params.handle]);
  if (!rows.length) return fail(res, 404, "User not found");
  let viewerFollows;
  if (req.user) {
    const f = await db.query(`SELECT 1 FROM connections WHERE follower_id = $1 AND following_id = $2`, [req.user.id, rows[0].id]);
    viewerFollows = f.rows.length > 0;
  }
  return ok(res, { user: publicUser(rows[0], viewerFollows) });
}));

// ── PATCH /users/me ──────────────────────────────────────────────────────
router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const allowed = ["display_name", "bio", "location", "website", "avatar_color", "avatar_url", "banner_url", "private_account"];
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    const col = key.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
    if (!allowed.includes(col)) continue;
    fields.push(`${col} = $${i++}`);
    values.push(val);
  }
  if (!fields.length) return fail(res, 400, "No valid fields to update");
  values.push(req.user.id);
  const { rows } = await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
  return ok(res, { user: publicUser(rows[0]) });
}));

// ── POST /users/:id/connect (follow) ─────────────────────────────────────
router.post("/:id/connect", requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) return fail(res, 400, "Cannot connect with yourself");
  const target = await db.query(`SELECT id, private_account FROM users WHERE id = $1`, [targetId]);
  if (!target.rows.length) return fail(res, 404, "User not found");

  if (target.rows[0].private_account) {
    await db.query(
      `INSERT INTO connection_requests (requester_id, target_id) VALUES ($1,$2) ON CONFLICT (requester_id, target_id) DO NOTHING`,
      [req.user.id, targetId]
    );
    await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, body) VALUES ($1,$2,'connection_request','sent you a connection request')`,
      [targetId, req.user.id]
    );
    return ok(res, { status: "requested" });
  }

  await db.query(`INSERT INTO connections (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, targetId]);
  await db.query(
    `INSERT INTO notifications (user_id, actor_id, type, body) VALUES ($1,$2,'follow','started connecting with you')`,
    [targetId, req.user.id]
  );
  return ok(res, { status: "connected" });
}));

// ── DELETE /users/:id/connect (unfollow) ─────────────────────────────────
router.delete("/:id/connect", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`DELETE FROM connections WHERE follower_id = $1 AND following_id = $2`, [req.user.id, req.params.id]);
  return ok(res, { status: "disconnected" });
}));

// ── GET /users/:id/connections (followers) ───────────────────────────────
router.get("/:id/connections", asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.* FROM connections c JOIN users u ON u.id = c.follower_id WHERE c.following_id = $1 ORDER BY c.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  return ok(res, { connections: rows.map(r => publicUser(r)) });
}));

// ── GET /users/:id/following ──────────────────────────────────────────────
router.get("/:id/following", asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.* FROM connections c JOIN users u ON u.id = c.following_id WHERE c.follower_id = $1 ORDER BY c.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  return ok(res, { following: rows.map(r => publicUser(r)) });
}));

// ── POST /users/:id/block ────────────────────────────────────────────────
router.post("/:id/block", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  await db.query(`DELETE FROM connections WHERE (follower_id=$1 AND following_id=$2) OR (follower_id=$2 AND following_id=$1)`, [req.user.id, req.params.id]);
  return ok(res, { blocked: true });
}));

router.delete("/:id/block", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [req.user.id, req.params.id]);
  return ok(res, { blocked: false });
}));

// ── POST /users/:id/mute ─────────────────────────────────────────────────
router.post("/:id/mute", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO user_mutes (muter_id, muted_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  return ok(res, { muted: true });
}));

module.exports = { router, publicUser };
