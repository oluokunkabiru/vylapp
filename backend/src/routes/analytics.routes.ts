import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import analyticsController from "../controllers/analytics.controller";

const { requireAuth, requireAdmin } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── GET /analytics/creator/me — creator dashboard snapshot ──────────────
router.get("/creator/me", asyncHandler(analyticsController.creatorSnapshot));

// ── GET /analytics/platform — admin-only platform metrics ────────────────
router.get("/platform", requireAdmin, asyncHandler(analyticsController.platform));

export = router;
