import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import creatorController from "../controllers/creator.controller";

const { requireAuth, optionalAuth } = authMiddleware;

const router = express.Router();

// ── GET /creator/:userId/profile ─────────────────────────────────────────
router.get("/:userId/profile", optionalAuth, asyncHandler(creatorController.getProfile));

// ── POST /creator/profile — become a creator / update profile ───────────
router.post("/profile", requireAuth, asyncHandler(creatorController.upsertProfile));

// ── POST /creator/:userId/tiers — create a subscription tier ─────────────
router.post("/tiers", requireAuth, asyncHandler(creatorController.createTier));

// ── POST /creator/:creatorId/subscribe ────────────────────────────────────
router.post("/:creatorId/subscribe", requireAuth, asyncHandler(creatorController.subscribe));

// ── POST /creator/:creatorId/super-vibe — tip a creator on a vibe ────────
router.post("/:creatorId/super-vibe", requireAuth, asyncHandler(creatorController.superVibe));

// ── GET /creator/me/earnings ──────────────────────────────────────────────
router.get("/me/earnings", requireAuth, asyncHandler(creatorController.earnings));

// ── POST /creator/me/payout-request ───────────────────────────────────────
router.post("/me/payout-request", requireAuth, asyncHandler(creatorController.payoutRequest));

export = router;
