import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import subscriptionsController from "../controllers/subscriptions.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();

// ── GET /subscriptions/plans ─────────────────────────────────────────────
router.get("/plans", asyncHandler(subscriptionsController.plans));

// ── POST /subscriptions/upgrade ──────────────────────────────────────────
router.post("/upgrade", requireAuth, asyncHandler(subscriptionsController.upgrade));

// ── POST /subscriptions/cancel ────────────────────────────────────────────
router.post("/cancel", requireAuth, asyncHandler(subscriptionsController.cancel));

// ── GET /subscriptions/me/usage ──────────────────────────────────────────
router.get("/me/usage", requireAuth, asyncHandler(subscriptionsController.usage));

export = router;
