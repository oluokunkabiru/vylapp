const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const CreatorEconomyEngine = require("../services/creatorEconomyEngine");
const NotificationEngine = require("../services/notificationEngine");
const { isBoosted } = require("./raven.routes");

const router = express.Router();

// ── GET /creator/:userId/profile ─────────────────────────────────────────
router.get("/:userId/profile", optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM creator_profiles WHERE user_id = $1`, [req.params.userId]);
  const tiers = await db.query(`SELECT * FROM creator_subscription_tiers WHERE creator_id = $1 AND active = TRUE ORDER BY sort_order`, [req.params.userId]);
  const products = await db.query(`SELECT id, title, description, preview_url, price_usd, purchases_count FROM digital_products WHERE creator_id = $1 AND active = TRUE`, [req.params.userId]);
  return ok(res, {
    profile: rows[0] || null,
    tiers: tiers.rows,
    products: products.rows,
  });
}));

// ── POST /creator/profile — become a creator / update profile ───────────
router.post("/profile", requireAuth, asyncHandler(async (req, res) => {
  const { bioExtended, categories, socialLinks, payoutSchedule } = req.body;
  await db.query(`UPDATE users SET is_creator = TRUE WHERE id = $1`, [req.user.id]);
  const { rows } = await db.query(
    `INSERT INTO creator_profiles (user_id, bio_extended, categories, social_links, payout_schedule)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET bio_extended = EXCLUDED.bio_extended, categories = EXCLUDED.categories,
       social_links = EXCLUDED.social_links, payout_schedule = EXCLUDED.payout_schedule
     RETURNING *`,
    [req.user.id, bioExtended || null, categories || [], socialLinks || {}, payoutSchedule || "weekly"]
  );
  return ok(res, { profile: rows[0] });
}));

// ── POST /creator/:userId/tiers — create a subscription tier ─────────────
router.post("/tiers", requireAuth, asyncHandler(async (req, res) => {
  const { name, description, priceUsd, billingPeriod, perks } = req.body;
  if (!name || !priceUsd) return fail(res, 400, "name and priceUsd are required");
  const { rows } = await db.query(
    `INSERT INTO creator_subscription_tiers (creator_id, name, description, price_usd, billing_period, perks) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, name, description || null, priceUsd, billingPeriod || "monthly", perks || []]
  );
  return ok(res, { tier: rows[0] }, 201);
}));

// ── POST /creator/:creatorId/subscribe ────────────────────────────────────
router.post("/:creatorId/subscribe", requireAuth, asyncHandler(async (req, res) => {
  const { tierId } = req.body;
  const tier = await db.query(`SELECT * FROM creator_subscription_tiers WHERE id = $1 AND creator_id = $2`, [tierId, req.params.creatorId]);
  if (!tier.rows.length) return fail(res, 404, "Tier not found");

  const { boosted, reason: boostReason } = await isBoosted(req.params.creatorId);
  const split = CreatorEconomyEngine.splitSubscription(parseFloat(tier.rows[0].price_usd), boosted);
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + (tier.rows[0].billing_period === "annual" ? 365 : 30));

  const sub = await db.query(
    `INSERT INTO creator_subscriptions (subscriber_id, creator_id, tier_id, price_usd, current_period_end)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (subscriber_id, creator_id) DO UPDATE SET tier_id = EXCLUDED.tier_id, price_usd = EXCLUDED.price_usd,
       status = 'active', current_period_end = EXCLUDED.current_period_end
     RETURNING *`,
    [req.user.id, req.params.creatorId, tierId, tier.rows[0].price_usd, periodEnd]
  );
  await db.query(
    `INSERT INTO transactions (user_id, counterparty_id, type, direction, amount_usd, platform_fee_usd, net_usd, description, metadata)
     VALUES ($1,$2,'creator_subscription','debit',$3,$4,$3,'Creator subscription',$5)`,
    [req.user.id, req.params.creatorId, tier.rows[0].price_usd, split.platform_cut, JSON.stringify({ rate: split.rate, boosted, boostReason })]
  );
  await db.query(
    `UPDATE creator_profiles SET subscriber_count = subscriber_count + 1, total_earned_usd = total_earned_usd + $1, pending_balance_usd = pending_balance_usd + $1 WHERE user_id = $2`,
    [split.creator_net, req.params.creatorId]
  );
  const body = NotificationEngine.formatBody("creator_sub", req.user.displayName);
  await db.query(`INSERT INTO notifications (user_id, actor_id, type, body) VALUES ($1,$2,'creator_sub',$3)`, [req.params.creatorId, req.user.id, body]);

  return ok(res, { subscription: sub.rows[0], split }, 201);
}));

// ── POST /creator/:creatorId/super-vibe — tip a creator on a vibe ────────
router.post("/:creatorId/super-vibe", requireAuth, asyncHandler(async (req, res) => {
  const { amountUsd, vibeId, emoji, message } = req.body;
  if (!amountUsd || amountUsd <= 0) return fail(res, 400, "amountUsd must be positive");
  const { boosted, reason: boostReason } = await isBoosted(req.params.creatorId);
  const split = CreatorEconomyEngine.splitSuperVibe(amountUsd, boosted);

  const { rows } = await db.query(
    `INSERT INTO super_vibes (sender_id, recipient_id, vibe_id, amount_usd, emoji, message, platform_fee_usd, creator_net_usd)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, req.params.creatorId, vibeId || null, amountUsd, emoji || "⚡", message || null, split.platform_cut, split.creator_net]
  );
  await db.query(
    `INSERT INTO transactions (user_id, counterparty_id, type, direction, amount_usd, platform_fee_usd, net_usd, description, metadata)
     VALUES ($1,$2,'super_vibe','debit',$3,$4,$3,'Super Vibe tip',$5)`,
    [req.user.id, req.params.creatorId, amountUsd, split.platform_cut, JSON.stringify({ rate: split.rate, boosted, boostReason })]
  );
  await db.query(
    `INSERT INTO creator_profiles (user_id, total_earned_usd, pending_balance_usd) VALUES ($1,$2,$2)
     ON CONFLICT (user_id) DO UPDATE SET total_earned_usd = creator_profiles.total_earned_usd + $2, pending_balance_usd = creator_profiles.pending_balance_usd + $2`,
    [req.params.creatorId, split.creator_net]
  );
  await db.query(`UPDATE users SET creator_earnings_usd = creator_earnings_usd + $1 WHERE id = $2`, [split.creator_net, req.params.creatorId]);
  const body = NotificationEngine.formatBody("creator_tip", req.user.displayName, { amount: amountUsd });
  await db.query(`INSERT INTO notifications (user_id, actor_id, type, vibe_id, body) VALUES ($1,$2,'creator_tip',$3,$4)`, [req.params.creatorId, req.user.id, vibeId || null, body]);

  return ok(res, { superVibe: rows[0], split }, 201);
}));

// ── GET /creator/me/earnings ──────────────────────────────────────────────
router.get("/me/earnings", requireAuth, asyncHandler(async (req, res) => {
  const profile = await db.query(`SELECT * FROM creator_profiles WHERE user_id = $1`, [req.user.id]);
  const ledger = await db.query(
    `SELECT type, net_usd, created_at FROM transactions WHERE counterparty_id = $1 AND direction = 'debit' ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const payout = CreatorEconomyEngine.calculatePayout(ledger.rows);
  const boost = await isBoosted(req.user.id);
  return ok(res, { profile: profile.rows[0] || null, recentLedger: ledger.rows, nextPayout: payout, revenueShare: boost });
}));

// ── POST /creator/me/payout-request ───────────────────────────────────────
router.post("/me/payout-request", requireAuth, asyncHandler(async (req, res) => {
  const profile = await db.query(`SELECT pending_balance_usd FROM creator_profiles WHERE user_id = $1`, [req.user.id]);
  if (!profile.rows.length || parseFloat(profile.rows[0].pending_balance_usd) < 10) {
    return fail(res, 400, "Balance below the $10 payout minimum");
  }
  const amount = parseFloat(profile.rows[0].pending_balance_usd);
  const { rows } = await db.query(
    `INSERT INTO creator_payouts (creator_id, amount_usd, period_start, period_end) VALUES ($1,$2, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE) RETURNING *`,
    [req.user.id, amount]
  );
  await db.query(`UPDATE creator_profiles SET pending_balance_usd = 0, total_withdrawn_usd = total_withdrawn_usd + $1 WHERE user_id = $2`, [amount, req.user.id]);
  return ok(res, { payout: rows[0], note: "Payout recorded in the ledger. Wiring a real payout (Stripe Connect transfer) is the one piece that requires a regulated external processor." }, 201);
}));

module.exports = router;
