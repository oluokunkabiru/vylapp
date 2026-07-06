const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const SearchEngine = require("../services/searchEngine");
const TrendingEngine = require("../services/trendingEngine");

const router = express.Router();

// ── GET /search?q=...&type=all|users|vibes|hashtags ──────────────────────
router.get("/", optionalAuth, asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  const type = req.query.type || "all";
  if (!q) return ok(res, { results: { users: [], vibes: [], hashtags: [] } });

  const results = { users: [], vibes: [], hashtags: [] };

  if (type === "all" || type === "users") {
    const u = await db.query(
      `SELECT id, handle, display_name, bio, avatar_color, avatar_initials, verified, connections_count
       FROM users WHERE (handle ILIKE $1 OR display_name ILIKE $1) AND deleted_at IS NULL LIMIT 20`,
      [`%${q}%`]
    );
    results.users = SearchEngine.rank(q, u.rows, { handle: 3, display_name: 2.5, bio: 1.5 }).slice(0, 10);
  }
  if (type === "all" || type === "vibes") {
    const v = await db.query(
      `SELECT v.id, v.content, v.tags, v.likes_count, u.handle FROM vibes v JOIN users u ON u.id = v.user_id
       WHERE v.content ILIKE $1 AND v.is_deleted = FALSE ORDER BY v.created_at DESC LIMIT 20`,
      [`%${q}%`]
    );
    results.vibes = v.rows;
  }
  if (type === "all" || type === "hashtags") {
    const h = await db.query(`SELECT tag, vibes_count FROM hashtags WHERE tag ILIKE $1 ORDER BY vibes_count DESC LIMIT 10`, [`%${q}%`]);
    results.hashtags = h.rows;
  }

  if (req.user) {
    await db.query(`INSERT INTO search_history (user_id, query, result_type) VALUES ($1,$2,$3)`, [req.user.id, q, type]).catch(() => {});
  }

  return ok(res, { results });
}));

// ── GET /search/autocomplete?q=... ───────────────────────────────────────
router.get("/autocomplete", asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return ok(res, { suggestions: [] });
  const u = await db.query(`SELECT handle, display_name, verified FROM users WHERE handle ILIKE $1 LIMIT 8`, [`${q}%`]);
  return ok(res, { suggestions: u.rows.map(r => ({ type: "user", value: r.handle, label: r.display_name, verified: r.verified })) });
}));

// ── GET /trending?region=Global&category=... ─────────────────────────────
router.get("/trending/topics", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT tag, vibes_count AS total_count, day_vibes_count AS recent_count, week_vibes_count AS prev_count, last_seen AS last_vibe_at FROM hashtags ORDER BY day_vibes_count DESC LIMIT 30`);
  const trending = TrendingEngine.getTrending(rows, req.query.region || "Global", null, parseInt(req.query.limit || "10", 10));
  return ok(res, { trending });
}));

// ── GET /explore/topics ──────────────────────────────────────────────────
router.get("/explore/topics", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM explore_topics WHERE active = TRUE ORDER BY sort_order`);
  return ok(res, { topics: rows });
}));

// ── POST /explore/topics/:id/join ────────────────────────────────────────
router.post("/explore/topics/:id/join", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO user_topic_memberships (user_id, topic_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  await db.query(`UPDATE explore_topics SET member_count = member_count + 1 WHERE id = $1`, [req.params.id]);
  return ok(res, { joined: true });
}));

module.exports = router;
