const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const translateController = require("../controllers/translate.controller");

const router = express.Router();

// ── GET /translate/languages ──────────────────────────────────────────────
router.get("/languages", translateController.listLanguages);

// ── POST /translate — translate arbitrary text (caption, comment, DM) ────
router.post("/", requireAuth, asyncHandler(translateController.translateText));

// ── POST /translate/vibes/:id — translate a specific vibe's caption ──────
router.post("/vibes/:id", requireAuth, asyncHandler(translateController.translateVibe));

module.exports = router;
