const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const OnboardingEngine = require("../services/onboardingEngine");
const TranslationEngine = require("../services/translationEngine");

const router = express.Router();
router.use(requireAuth);

// ── GET /onboarding/flow ─────────────────────────────────────────────────
router.get("/flow", asyncHandler(async (req, res) => {
  return ok(res, { steps: OnboardingEngine.STEPS, interestMap: OnboardingEngine.INTEREST_MAP });
}));

// ── POST /onboarding/interests ───────────────────────────────────────────
router.post("/interests", asyncHandler(async (req, res) => {
  const { interests, contentLanguages } = req.body;
  if (!Array.isArray(interests) || !interests.length) return fail(res, 400, "interests must be a non-empty array");

  let languages = null;
  if (contentLanguages !== undefined) {
    if (!Array.isArray(contentLanguages) || !contentLanguages.length) return fail(res, 400, "contentLanguages must be a non-empty array");
    const validCodes = new Set(TranslationEngine.LANGUAGES.map(l => l.code));
    languages = contentLanguages.filter(c => validCodes.has(c));
    if (!languages.length) return fail(res, 400, "contentLanguages must contain at least one supported language code");
  }

  await db.query(
    `UPDATE users SET interests = $1, onboarding_step = $2${languages ? ", content_language = $4" : ""} WHERE id = $3`,
    languages ? [interests, OnboardingEngine.nextStep("interests"), req.user.id, languages]
              : [interests, OnboardingEngine.nextStep("interests"), req.user.id]
  );
  await db.query(`INSERT INTO onboarding_events (user_id, step, data) VALUES ($1,'interests',$2)`, [req.user.id, JSON.stringify({ interests })]).catch(() => {});

  const { rows: creators } = await db.query(`SELECT id, handle, display_name, interests FROM users WHERE id != $1 LIMIT 50`, [req.user.id]);
  const suggested = OnboardingEngine.matchCreators(interests, creators);
  const firstVibePrompt = OnboardingEngine.generateFirstVibePrompt(interests);

  return ok(res, { suggestedCreators: suggested.slice(0, 7), firstVibePrompt, nextStep: OnboardingEngine.nextStep("interests") });
}));

// ── POST /onboarding/handle (check + set display handle) ────────────────
router.post("/handle", asyncHandler(async (req, res) => {
  const { handle } = req.body;
  if (!handle || !/^[a-z0-9._]{3,20}$/i.test(handle)) return fail(res, 400, "Handle must be 3-20 characters, letters/numbers/./_ only");
  const dupe = await db.query(`SELECT id FROM users WHERE handle = $1 AND id != $2`, [handle, req.user.id]);
  if (dupe.rows.length) return fail(res, 409, "Handle already taken");
  await db.query(`UPDATE users SET handle = $1, onboarding_step = $2 WHERE id = $3`, [handle, OnboardingEngine.nextStep("handle"), req.user.id]);
  return ok(res, { handle, nextStep: OnboardingEngine.nextStep("handle") });
}));

// ── POST /onboarding/avatar (set avatar color) ───────────────────────────
router.post("/avatar", asyncHandler(async (req, res) => {
  const { avatarColor } = req.body;
  if (!avatarColor || !/^#[0-9a-f]{6}$/i.test(avatarColor)) return fail(res, 400, "avatarColor must be a #RRGGBB hex string");
  await db.query(`UPDATE users SET avatar_color = $1, onboarding_step = $2 WHERE id = $3`, [avatarColor, OnboardingEngine.nextStep("avatar"), req.user.id]);
  return ok(res, { avatarColor, nextStep: OnboardingEngine.nextStep("avatar") });
}));

// ── POST /onboarding/follow-suggestions ──────────────────────────────────
router.post("/follow-suggestions", asyncHandler(async (req, res) => {
  const { userIds } = req.body; // array of user ids to follow
  if (!Array.isArray(userIds)) return fail(res, 400, "userIds must be an array");
  for (const targetId of userIds) {
    if (targetId === req.user.id) continue;
    await db.query(
      `INSERT INTO connections (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, targetId]
    );
  }
  await db.query(`UPDATE users SET onboarding_step = $1 WHERE id = $2`, [OnboardingEngine.nextStep("follow_suggestions"), req.user.id]);
  return ok(res, { followed: userIds.length, nextStep: OnboardingEngine.nextStep("follow_suggestions") });
}));

// ── POST /onboarding/complete ─────────────────────────────────────────────
router.post("/complete", asyncHandler(async (req, res) => {
  await db.query(`UPDATE users SET onboarding_step = 'complete', onboarding_done = TRUE WHERE id = $1`, [req.user.id]);
  const { rows } = await db.query(`SELECT step FROM onboarding_events WHERE user_id = $1`, [req.user.id]).catch(() => ({ rows: [] }));
  const score = OnboardingEngine.completionScore(rows.map(r => ({ step: r.step })).concat([{ step: "complete" }]));
  return ok(res, { done: true, completionScore: score });
}));

module.exports = router;
