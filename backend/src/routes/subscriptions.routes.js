const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const SubscriptionEngine = require("../services/subscriptionEngine");

const router = express.Router();

// ── GET /subscriptions/plans ─────────────────────────────────────────────
router.get("/plans", asyncHandler(async (req, res) => {
  return ok(res, { plans: SubscriptionEngine.PLANS });
}));

// ── POST /subscriptions/upgrade ──────────────────────────────────────────
router.post("/upgrade", requireAuth, asyncHandler(async (req, res) => {
  const { planId, billingPeriod } = req.body;
  const plan = SubscriptionEngine.planDetails(planId);
  if (!plan) return fail(res, 400, "Invalid plan");

  const periodEnd = SubscriptionEngine.billingPeriodEnd(planId, billingPeriod);
  const { rows } = await db.query(
    `INSERT INTO platform_subscriptions (user_id, plan, price_usd, billing_period, current_period_start, current_period_end)
     VALUES ($1,$2,$3,$4,NOW(),$5) RETURNING *`,
    [req.user.id, planId, plan.price, billingPeriod || "monthly", periodEnd]
  );
  await db.query(`UPDATE users SET subscription_plan = $1, subscription_status = 'active', subscription_ends_at = $2 WHERE id = $3`, [planId, periodEnd, req.user.id]);

  if (plan.features.translation_langs) {
    await db.query(`UPDATE users SET translation_enabled = TRUE WHERE id = $1`, [req.user.id]);
  }

  return ok(res, { subscription: rows[0], features: plan.features }, 201);
}));

// ── POST /subscriptions/cancel ────────────────────────────────────────────
router.post("/cancel", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`UPDATE platform_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'`, [req.user.id]);
  await db.query(`UPDATE users SET subscription_plan = 'free' WHERE id = $1`, [req.user.id]);
  return ok(res, { cancelled: true });
}));

// ── GET /subscriptions/me/usage ──────────────────────────────────────────
router.get("/me/usage", requireAuth, asyncHandler(async (req, res) => {
  const u = await db.query(`SELECT subscription_plan FROM users WHERE id = $1`, [req.user.id]);
  const usage = SubscriptionEngine.usageSummary(u.rows[0].subscription_plan, {});
  return ok(res, { plan: u.rows[0].subscription_plan, usage });
}));

module.exports = router;
