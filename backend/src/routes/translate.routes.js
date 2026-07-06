const express = require("express");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const TranslationEngine = require("../services/translationEngine");
const db = require("../config/db");

const router = express.Router();

// ── GET /translate/languages ──────────────────────────────────────────────
router.get("/languages", (req, res) => ok(res, { languages: TranslationEngine.LANGUAGES }));

// ── POST /translate — translate arbitrary text (caption, comment, DM) ────
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { text, fromLang, toLang, context } = req.body;
  if (!text || !toLang) return fail(res, 400, "text and toLang are required");
  const result = await TranslationEngine.translate(text, fromLang || "en", toLang, context || "post");
  return ok(res, result);
}));

// ── POST /translate/vibes/:id — translate a specific vibe's caption ──────
router.post("/vibes/:id", requireAuth, asyncHandler(async (req, res) => {
  const { toLang } = req.body;
  if (!toLang) return fail(res, 400, "toLang is required");
  const v = await db.query(`SELECT content, language FROM vibes WHERE id = $1`, [req.params.id]);
  if (!v.rows.length) return fail(res, 404, "Vibe not found");
  const result = await TranslationEngine.translate(v.rows[0].content, v.rows[0].language || "en", toLang, "post");
  return ok(res, result);
}));

module.exports = router;
