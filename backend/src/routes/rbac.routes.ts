// ════════════════════════════════════════════════════════════════════════════
//  RBAC ADMIN ROUTES  /rbac/*
//
//  Runtime management of roles, permissions, and user assignments.
//  Equivalent to Spatie's role/permission assignment APIs.
//
//  ALL routes require admin.roles.manage permission except read-only routes
//  which require admin.access.
//
//  Audit trail: every mutation is logged to stdout with the operator's userId.
//  In production, pipe stdout to a structured log aggregator (Datadog, etc.).
// ════════════════════════════════════════════════════════════════════════════
import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import rbacController from "../controllers/rbac.controller";

const { authenticate } = authMiddleware;
const { requirePermission } = rbacMiddleware;

const router = express.Router();

const canRead = requirePermission("admin.access");
const canManage = requirePermission("admin.roles.manage");
const canAudit = requirePermission("admin.audit.read");

// ── GET /rbac/roles — list all roles with their permissions ───────────────────
router.get("/roles", authenticate, canRead, asyncHandler(rbacController.listRoles));

// ── POST /rbac/roles — create a new role ──────────────────────────────────────
router.post("/roles", authenticate, canManage, asyncHandler(rbacController.createRole));

// ── DELETE /rbac/roles/:name — remove a role ──────────────────────────────────
router.delete("/roles/:name", authenticate, canManage, asyncHandler(rbacController.deleteRole));

// ── GET /rbac/roles/:name/permissions — list permissions on a role ────────────
router.get("/roles/:name/permissions", authenticate, canRead, asyncHandler(rbacController.getRolePermissions));

// ── POST /rbac/roles/:name/permissions — assign a permission to a role ────────
router.post("/roles/:name/permissions", authenticate, canManage, asyncHandler(rbacController.giveRolePermission));

// ── PUT /rbac/roles/:name/permissions — sync (replace) all permissions on a role
router.put("/roles/:name/permissions", authenticate, canManage, asyncHandler(rbacController.syncRolePermissions));

// ── DELETE /rbac/roles/:name/permissions/:permission ─────────────────────────
router.delete("/roles/:name/permissions/:permission", authenticate, canManage, asyncHandler(rbacController.revokeRolePermission));

// ── GET /rbac/permissions — list all permissions (optionally filter by group) ─
router.get("/permissions", authenticate, canRead, asyncHandler(rbacController.listPermissions));

// ── POST /rbac/permissions — create a custom permission ───────────────────────
router.post("/permissions", authenticate, canManage, asyncHandler(rbacController.createPermission));

// ── DELETE /rbac/permissions/:name ────────────────────────────────────────────
router.delete("/permissions/:name", authenticate, canManage, asyncHandler(rbacController.deletePermission));

// ── GET /rbac/users/:userId/roles — list a user's roles ──────────────────────
router.get("/users/:userId/roles", authenticate, canRead, asyncHandler(rbacController.getUserRoles));

// ── POST /rbac/users/:userId/roles — assign a role to a user ─────────────────
router.post("/users/:userId/roles", authenticate, canManage, asyncHandler(rbacController.assignUserRole));

// ── PUT /rbac/users/:userId/roles — sync all global roles on a user ───────────
router.put("/users/:userId/roles", authenticate, canManage, asyncHandler(rbacController.syncUserRoles));

// ── DELETE /rbac/users/:userId/roles/:role — remove a role from a user ────────
router.delete("/users/:userId/roles/:role", authenticate, canManage, asyncHandler(rbacController.removeUserRole));

// ── GET /rbac/users/:userId/permissions — full permission summary for a user ───
router.get("/users/:userId/permissions", authenticate, canAudit, asyncHandler(rbacController.getUserPermissionSummary));

// ── POST /rbac/users/:userId/permissions — grant a direct permission ──────────
router.post("/users/:userId/permissions", authenticate, canManage, asyncHandler(rbacController.giveDirectPermission));

// ── DELETE /rbac/users/:userId/permissions/:permission ────────────────────────
router.delete("/users/:userId/permissions/:permission", authenticate, canManage, asyncHandler(rbacController.revokeDirectPermission));

// ── GET /rbac/cache/stats — cache health ─────────────────────────────────────
router.get("/cache/stats", authenticate, canRead, asyncHandler(rbacController.cacheStats));

// ── DELETE /rbac/cache — flush the entire permission cache ────────────────────
router.delete("/cache", authenticate, requirePermission("admin.system.config"), asyncHandler(rbacController.flushCache));

// ── DELETE /rbac/cache/:userId — flush one user's permission cache ────────────
router.delete("/cache/:userId", authenticate, canManage, asyncHandler(rbacController.flushUserCache));

export = router;
