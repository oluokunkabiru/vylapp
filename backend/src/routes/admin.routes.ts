// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  /admin/*
//
//  Everything here requires admin.access (router-level requireAdmin).
//  Individual mutating routes additionally gate on the specific admin.*
//  permission that matches what they do.
// ════════════════════════════════════════════════════════════════════════════
import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import adminController from "../controllers/admin.controller";

const { authenticate, requireAdmin } = authMiddleware;
const { requirePermission } = rbacMiddleware;

const router = express.Router();
router.use(authenticate, requireAdmin);

// ── GET /admin/me ──────────────────────────────────────────────────────────────
router.get("/me", asyncHandler(adminController.me));

// ── GET /admin/users ─────────────────────────────────────────────────────────
router.get("/users", requirePermission("admin.users.manage"), asyncHandler(adminController.listUsers));

// ── POST /admin/users/:id/suspend ─────────────────────────────────────────────
router.post("/users/:id/suspend", requirePermission("admin.users.manage"), asyncHandler(adminController.suspendUser));

// ── POST /admin/users/:id/reinstate ───────────────────────────────────────────
router.post("/users/:id/reinstate", requirePermission("admin.users.manage"), asyncHandler(adminController.reinstateUser));

// ── POST /admin/users/:id/deactivate ──────────────────────────────────────────
router.post("/users/:id/deactivate", requirePermission("admin.users.manage"), asyncHandler(adminController.deactivateUser));

// ── GET /admin/analytics/trends ───────────────────────────────────────────────
router.get("/analytics/trends", requirePermission("admin.analytics"), asyncHandler(adminController.analyticsTrends));

// ── GET /admin/moderation/queue ────────────────────────────────────────────────
router.get("/moderation/queue", requirePermission("admin.content.manage"), asyncHandler(adminController.moderationQueue));

// ── POST /admin/moderation/bulk-action ────────────────────────────────────────
router.post("/moderation/bulk-action", requirePermission("admin.content.manage"), asyncHandler(adminController.moderationBulkAction));

// ── GET /admin/audit ───────────────────────────────────────────────────────────
router.get("/audit", requirePermission("admin.audit.read"), asyncHandler(adminController.listAuditLog));

export = router;
