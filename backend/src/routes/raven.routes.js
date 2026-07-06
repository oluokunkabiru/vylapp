const express = require("express");
const db = require("../config/db");
const { ok } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const RavenEngine = require("../services/ravenEngine");

const router = express.Router();
router.use(requireAuth);

// Raven points aren't in the base schema as a dedicated column, so we
// derive them from activity already tracked elsewhere (vibes, spaces,
// connections, badges) rather than adding new state to track separately.
async function computePoints(userId) {
  const [vibes, spacesHosted, badges] = await Promise.all([
    db.query(`SELECT count(*) c FROM vibes WHERE user_id = $1 AND is_deleted = FALSE`, [userId]),
    db.query(`SELECT spaces_hosted FROM users WHERE id = $1`, [userId]),
    db.query(`SELECT count(*) c FROM user_badges WHERE user_id = $1`, [userId]),
  ]);
  return (
    parseInt(vibes.rows[0].c, 10) * RavenEngine.POINT_MAP.vibe_posted +
    (spacesHosted.rows[0]?.spaces_hosted || 0) * RavenEngine.POINT_MAP.space_hosted +
    parseInt(badges.rows[0].c, 10) * 15
  );
}

// ── GET /raven/me ─────────────────────────────────────────────────────────
router.get("/me", asyncHandler(async (req, res) => {
  const points = await computePoints(req.user.id);
  return ok(res, { tier: RavenEngine.getTier(points) });
}));

// ── GET /raven/leaderboard ────────────────────────────────────────────────
router.get("/leaderboard", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT id, handle, display_name, avatar_color, avatar_initials, vibes_count, spaces_hosted FROM users ORDER BY vibes_count DESC LIMIT 20`);
  const withPoints = rows.map(u => ({
    ...u,
    points: u.vibes_count * RavenEngine.POINT_MAP.vibe_posted + u.spaces_hosted * RavenEngine.POINT_MAP.space_hosted,
  }));
  const ranked = withPoints
    .map(u => ({ ...u, tier: RavenEngine.getTier(u.points) }))
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ rank: i + 1, handle: u.handle, displayName: u.display_name, points: u.points, tier: u.tier.label, badge: u.tier.badge }));
  return ok(res, { leaderboard: ranked });
}));

module.exports = router;
