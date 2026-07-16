import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import moderationController from "../controllers/moderation.controller";

const { requireAuth, requireAdmin } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── POST /moderation/reports ─────────────────────────────────────────────
router.post("/reports", asyncHandler(moderationController.createReport));

// ── GET /moderation/reports — admin queue ────────────────────────────────
router.get("/reports", requireAdmin, asyncHandler(moderationController.listReports));

// ── POST /moderation/reports/:id/resolve — admin action ──────────────────
router.post("/reports/:id/resolve", requireAdmin, asyncHandler(moderationController.resolveReport));

// ── GET /moderation/trust-score/:userId ──────────────────────────────────
router.get("/trust-score/:userId", requireAdmin, asyncHandler(moderationController.trustScore));

export = router;
