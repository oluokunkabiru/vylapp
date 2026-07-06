const express = require("express");
const db = require("../config/db");
const { ok } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const AnalyticsEngine = require("../services/analyticsEngine");

const router = express.Router();
router.use(requireAuth);

// ── GET /analytics/creator/me — creator dashboard snapshot ──────────────
router.get("/creator/me", asyncHandler(async (req, res) => {
  const followers = await db.query(`SELECT connections_count, vibes_count FROM users WHERE id = $1`, [req.user.id]);
  const impressions = await db.query(`SELECT COALESCE(SUM(views_count),0) v, COALESCE(SUM(likes_count),0) l FROM vibes WHERE user_id = $1`, [req.user.id]);
  const subs = await db.query(`SELECT subscriber_count FROM creator_profiles WHERE user_id = $1`, [req.user.id]);
  const tierPrice = await db.query(`SELECT AVG(price_usd) p FROM creator_subscription_tiers WHERE creator_id = $1`, [req.user.id]);

  const snapshot = AnalyticsEngine.creatorSnapshot({
    followers: followers.rows[0]?.connections_count || 0,
    prev_followers: followers.rows[0]?.connections_count || 0,
    impressions: parseInt(impressions.rows[0].v, 10),
    engagements: parseInt(impressions.rows[0].l, 10),
    subscribers: subs.rows[0]?.subscriber_count || 0,
    sub_price: parseFloat(tierPrice.rows[0]?.p || 0),
  });
  return ok(res, { snapshot });
}));

// ── GET /analytics/platform — admin-only platform metrics ────────────────
router.get("/platform", requireAdmin, asyncHandler(async (req, res) => {
  const dau = await db.query(`SELECT count(DISTINCT user_id) c FROM user_activity_log WHERE created_at > NOW() - INTERVAL '1 day'`);
  const mau = await db.query(`SELECT count(DISTINCT user_id) c FROM user_activity_log WHERE created_at > NOW() - INTERVAL '30 days'`);
  const totalUsers = await db.query(`SELECT count(*) c FROM users`);
  const totalVibes = await db.query(`SELECT count(*) c FROM vibes WHERE is_deleted = FALSE`);
  const revenue = await db.query(`SELECT COALESCE(SUM(platform_fee_usd),0) r FROM transactions`);

  const stickiness = AnalyticsEngine.stickinessRatio(parseInt(dau.rows[0].c, 10), parseInt(mau.rows[0].c, 10) || 1);
  return ok(res, {
    totalUsers: parseInt(totalUsers.rows[0].c, 10),
    totalVibes: parseInt(totalVibes.rows[0].c, 10),
    platformRevenueUsd: parseFloat(revenue.rows[0].r),
    stickiness,
  });
}));

module.exports = router;
