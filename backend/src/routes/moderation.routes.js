const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const ModerationEngine = require("../services/moderationEngine");

const router = express.Router();
router.use(requireAuth);

// ── POST /moderation/reports ─────────────────────────────────────────────
router.post("/reports", asyncHandler(async (req, res) => {
  const { reason, detail, vibeId, userId, spaceId, messageId } = req.body;
  if (!reason) return fail(res, 400, "reason is required");
  const { rows } = await db.query(
    `INSERT INTO reports (reporter_id, reported_vibe_id, reported_user_id, reported_space_id, reported_message_id, reason, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, vibeId || null, userId || null, spaceId || null, messageId || null, reason, detail || null]
  );

  // Auto-analyze if it's content we can read directly
  let analysis = null;
  if (vibeId) {
    const v = await db.query(`SELECT content FROM vibes WHERE id = $1`, [vibeId]);
    if (v.rows.length) {
      const reportCount = await db.query(`SELECT count(*) FROM reports WHERE reported_vibe_id = $1`, [vibeId]);
      analysis = ModerationEngine.analyzeContent(v.rows[0].content, { report_count: parseInt(reportCount.rows[0].count, 10) });
      if (analysis.action === "remove" || analysis.action === "remove_and_support") {
        await db.query(`UPDATE vibes SET is_deleted = TRUE, deleted_at = NOW(), moderation_note = $1 WHERE id = $2`, [analysis.label, vibeId]);
      }
    }
  }

  return ok(res, { report: rows[0], analysis }, 201);
}));

// ── GET /moderation/reports — admin queue ────────────────────────────────
router.get("/reports", requireAdmin, asyncHandler(async (req, res) => {
  const status = req.query.status || "pending";
  const { rows } = await db.query(`SELECT * FROM reports WHERE status = $1 ORDER BY created_at DESC LIMIT 50`, [status]);
  return ok(res, { reports: rows });
}));

// ── POST /moderation/reports/:id/resolve — admin action ──────────────────
router.post("/reports/:id/resolve", requireAdmin, asyncHandler(async (req, res) => {
  const { actionTaken, status } = req.body; // 'removed'|'warned'|'suspended'|'none'
  await db.query(`UPDATE reports SET status = $1, action_taken = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4`,
    [status || "resolved_action", actionTaken || "none", req.user.id, req.params.id]);
  await db.query(`INSERT INTO moderation_actions (moderator_id, action, report_id, reason) VALUES ($1,$2,$3,$4)`,
    [req.user.id, actionTaken || "none", req.params.id, "Resolved via report queue"]);
  return ok(res, { resolved: true });
}));

// ── GET /moderation/trust-score/:userId ──────────────────────────────────
router.get("/trust-score/:userId", requireAdmin, asyncHandler(async (req, res) => {
  const u = await db.query(`SELECT created_at FROM users WHERE id = $1`, [req.params.userId]);
  if (!u.rows.length) return fail(res, 404, "User not found");
  const violations = await db.query(`SELECT count(*) FROM moderation_actions WHERE target_user_id = $1`, [req.params.userId]);
  const ageDays = Math.floor((Date.now() - new Date(u.rows[0].created_at).getTime()) / 86400000);
  const score = ModerationEngine.trustScore({ age_days: ageDays, violations: parseInt(violations.rows[0].count, 10) });
  await db.query(
    `INSERT INTO trust_signals (user_id, trust_score) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET trust_score = $2, last_calculated = NOW()`,
    [req.params.userId, score.score]
  );
  return ok(res, { score });
}));

module.exports = router;
