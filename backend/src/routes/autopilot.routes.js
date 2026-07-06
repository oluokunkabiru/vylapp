const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const AutopilotEngine = require("../services/autopilotEngine");

const router = express.Router();
router.use(requireAuth);

// ── GET /autopilot/config ────────────────────────────────────────────────
router.get("/config", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM autopilot_configs WHERE user_id = $1`, [req.user.id]);
  return ok(res, { config: rows[0] || null });
}));

// ── PUT /autopilot/config ────────────────────────────────────────────────
router.put("/config", asyncHandler(async (req, res) => {
  const { enabled, autoPost, autoEngage, autoReply, postIntervalSecs, maxPostsPerRun, activeCategories } = req.body;
  const { rows } = await db.query(
    `INSERT INTO autopilot_configs (user_id, enabled, auto_post, auto_engage, auto_reply, post_interval_secs, max_posts_per_run, active_categories)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET enabled=$2, auto_post=$3, auto_engage=$4, auto_reply=$5,
       post_interval_secs=$6, max_posts_per_run=$7, active_categories=$8
     RETURNING *`,
    [req.user.id, !!enabled, autoPost !== false, autoEngage !== false, autoReply !== false,
     postIntervalSecs || 6, maxPostsPerRun || 8, activeCategories || ["tech", "global", "creative", "human", "spaces"]]
  );
  return ok(res, { config: rows[0] });
}));

// ── POST /autopilot/run — generate + publish posts for this user ─────────
router.post("/run", asyncHandler(async (req, res) => {
  const { categories, count } = req.body;
  const cats = categories || ["TECH_VIBES", "GLOBAL_CONNECT", "CREATIVE_LEARN", "HUMAN_POTENTIAL"];
  const n = Math.min(count || 3, 8);

  const run = await db.query(`INSERT INTO autopilot_runs (user_id, status) VALUES ($1,'posting') RETURNING *`, [req.user.id]);
  const posted = [];

  for (let i = 0; i < n; i++) {
    const category = cats[i % cats.length];
    const generated = await AutopilotEngine.generatePost(category);
    const engagement = AutopilotEngine.estimateEngagement(generated.content, category);

    const vibe = await db.query(
      `INSERT INTO vibes (user_id, content, category, tags, is_autopilot, autopilot_run_id, autopilot_topic)
       VALUES ($1,$2,$3,$4,TRUE,$5,$6) RETURNING id, created_at`,
      [req.user.id, generated.content, category, AutopilotEngine.HASHTAG_BANK[category] || [], run.rows[0].id, generated.topic]
    );
    posted.push({ vibeId: vibe.rows[0].id, content: generated.content, category, method: generated.method, ...engagement, createdAt: vibe.rows[0].created_at });
  }

  await db.query(
    `UPDATE autopilot_runs SET status = 'complete', posts_generated = $1, total_likes_est = $2, completed_at = NOW() WHERE id = $3`,
    [posted.length, posted.reduce((s, p) => s + p.est_likes, 0), run.rows[0].id]
  );

  const NotificationEngine = require("../services/notificationEngine");
  const body = NotificationEngine.formatBody("autopilot_posted", null, { count: posted.length });
  await db.query(`INSERT INTO notifications (user_id, type, body) VALUES ($1,'autopilot_posted',$2)`, [req.user.id, body]);

  return ok(res, { runId: run.rows[0].id, posted }, 201);
}));

// ── GET /autopilot/runs — run history ────────────────────────────────────
router.get("/runs", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM autopilot_runs WHERE user_id = $1 ORDER BY started_at DESC LIMIT 20`, [req.user.id]);
  return ok(res, { runs: rows });
}));

module.exports = router;
