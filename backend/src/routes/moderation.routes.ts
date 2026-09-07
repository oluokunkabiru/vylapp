import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import moderationController from "../controllers/moderation.controller";

const { requireAuth, requireAdmin } = authMiddleware;
const { requirePermission } = rbacMiddleware;

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

// ── Appeals (S, rest) ──────────────────────────────────────────────────────
// POST is any authenticated user appealing an action taken against their
// own account — checked inside the controller (targetUserId match), not a
// permission gate. GET/review are the reviewer side, gated by the
// already-seeded moderation.appeal.review permission (previously unused).
router.post("/appeals", asyncHandler(moderationController.createAppeal));
router.get("/appeals", requirePermission("moderation.appeal.review"), asyncHandler(moderationController.listAppeals));
router.post("/appeals/:id/review", requirePermission("moderation.appeal.review"), asyncHandler(moderationController.reviewAppeal));

export = router;
