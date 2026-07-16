const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const analyticsController = require("../controllers/analytics.controller");

const router = express.Router();
router.use(requireAuth);

// ── GET /analytics/creator/me — creator dashboard snapshot ──────────────
router.get("/creator/me", asyncHandler(analyticsController.creatorSnapshot));

// ── GET /analytics/platform — admin-only platform metrics ────────────────
router.get("/platform", requireAdmin, asyncHandler(analyticsController.platform));

module.exports = router;
