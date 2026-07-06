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
const express = require("express");
const router  = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { requirePermission, requireAnyPermission } = require("../middleware/rbac");
const rbac    = require("../rbac");
const cache   = require("../rbac/PermissionCache");
const { ok, fail } = require("../utils/respond");

const canRead   = requirePermission("admin.access");
const canManage = requirePermission("admin.roles.manage");
const canAudit  = requirePermission("admin.audit.read");

function audit(action, actor, target) {
  console.log(JSON.stringify({
    event: "rbac_audit", action, actor, target,
    ts: new Date().toISOString(),
  }));
}

// ── GET /rbac/roles — list all roles with their permissions ───────────────────
router.get("/roles", authenticate, canRead, asyncHandler(async (req, res) => {
  const roles = await rbac.getAllRoles();
  return ok(res, { roles });
}));

// ── POST /rbac/roles — create a new role ──────────────────────────────────────
router.post("/roles", authenticate, canManage, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return fail(res, 400, "Role name is required");
  const role = await rbac.createRole(name, description || "");
  audit("role.created", req.user.id, { role: name });
  return ok(res, { role }, 201);
}));

// ── DELETE /rbac/roles/:name — remove a role ──────────────────────────────────
router.delete("/roles/:name", authenticate, canManage, asyncHandler(async (req, res) => {
  const result = await rbac.deleteRole(req.params.name);
  audit("role.deleted", req.user.id, { role: req.params.name });
  return ok(res, result);
}));

// ── GET /rbac/roles/:name/permissions — list permissions on a role ────────────
router.get("/roles/:name/permissions", authenticate, canRead, asyncHandler(async (req, res) => {
  const perms = await rbac.getRolePermissions(req.params.name);
  return ok(res, { role: req.params.name, permissions: perms });
}));

// ── POST /rbac/roles/:name/permissions — assign a permission to a role ────────
router.post("/roles/:name/permissions", authenticate, canManage, asyncHandler(async (req, res) => {
  const { permission } = req.body;
  if (!permission?.trim()) return fail(res, 400, "permission is required");
  const result = await rbac.giveRolePermission(req.params.name, permission);
  audit("role.permission.assigned", req.user.id, { role: req.params.name, permission });
  return ok(res, result);
}));

// ── PUT /rbac/roles/:name/permissions — sync (replace) all permissions on a role
router.put("/roles/:name/permissions", authenticate, canManage, asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return fail(res, 400, "permissions must be an array");
  const result = await rbac.syncRolePermissions(req.params.name, permissions);
  audit("role.permissions.synced", req.user.id, { role: req.params.name, count: permissions.length });
  return ok(res, result);
}));

// ── DELETE /rbac/roles/:name/permissions/:permission ─────────────────────────
router.delete("/roles/:name/permissions/:permission", authenticate, canManage, asyncHandler(async (req, res) => {
  const result = await rbac.revokeRolePermission(req.params.name, req.params.permission);
  audit("role.permission.revoked", req.user.id, { role: req.params.name, permission: req.params.permission });
  return ok(res, result);
}));

// ── GET /rbac/permissions — list all permissions (optionally filter by group) ─
router.get("/permissions", authenticate, canRead, asyncHandler(async (req, res) => {
  const perms = await rbac.getAllPermissions(req.query.group);
  return ok(res, { permissions: perms });
}));

// ── POST /rbac/permissions — create a custom permission ───────────────────────
router.post("/permissions", authenticate, canManage, asyncHandler(async (req, res) => {
  const { name, description, group } = req.body;
  if (!name?.trim()) return fail(res, 400, "permission name is required");
  const perm = await rbac.createPermission(name, description || "", group || "custom");
  audit("permission.created", req.user.id, { permission: name });
  return ok(res, { permission: perm }, 201);
}));

// ── DELETE /rbac/permissions/:name ────────────────────────────────────────────
router.delete("/permissions/:name", authenticate, canManage, asyncHandler(async (req, res) => {
  const result = await rbac.deletePermission(req.params.name);
  audit("permission.deleted", req.user.id, { permission: req.params.name });
  return ok(res, result);
}));

// ── GET /rbac/users/:userId/roles — list a user's roles ──────────────────────
router.get("/users/:userId/roles", authenticate, canRead, asyncHandler(async (req, res) => {
  const roles = await rbac.getUserRoles(req.params.userId);
  return ok(res, { userId: req.params.userId, roles });
}));

// ── POST /rbac/users/:userId/roles — assign a role to a user ─────────────────
router.post("/users/:userId/roles", authenticate, canManage, asyncHandler(async (req, res) => {
  const { role, scopeType, scopeId, expiresAt } = req.body;
  if (!role?.trim()) return fail(res, 400, "role is required");

  // Guard: super_admin assignment requires super_admin permission
  if (role === "super_admin" && !req.can("admin.system.config")) {
    return fail(res, 403, "Assigning super_admin requires admin.system.config permission");
  }

  const result = await rbac.assignRole(req.params.userId, role, {
    scopeType:  scopeType || "",
    scopeId:    scopeId   || "",
    assignedBy: req.user.id,
    expiresAt:  expiresAt || null,
  });
  audit("user.role.assigned", req.user.id, { userId: req.params.userId, role, scopeType, scopeId });
  return ok(res, result, 201);
}));

// ── PUT /rbac/users/:userId/roles — sync all global roles on a user ───────────
router.put("/users/:userId/roles", authenticate, canManage, asyncHandler(async (req, res) => {
  const { roles } = req.body;
  if (!Array.isArray(roles)) return fail(res, 400, "roles must be an array");
  if (roles.includes("super_admin") && !req.can("admin.system.config")) {
    return fail(res, 403, "Syncing super_admin requires admin.system.config permission");
  }
  const result = await rbac.syncUserRoles(req.params.userId, roles, req.user.id);
  audit("user.roles.synced", req.user.id, { userId: req.params.userId, roles });
  return ok(res, result);
}));

// ── DELETE /rbac/users/:userId/roles/:role — remove a role from a user ────────
router.delete("/users/:userId/roles/:role", authenticate, canManage, asyncHandler(async (req, res) => {
  const { scopeType, scopeId } = req.query;
  if (req.params.role === "super_admin" && !req.can("admin.system.config")) {
    return fail(res, 403, "Removing super_admin requires admin.system.config permission");
  }
  const result = await rbac.removeRole(req.params.userId, req.params.role, {
    scopeType: scopeType || "",
    scopeId:   scopeId   || "",
  });
  audit("user.role.removed", req.user.id, { userId: req.params.userId, role: req.params.role });
  return ok(res, result);
}));

// ── GET /rbac/users/:userId/permissions — full permission summary for a user ───
router.get("/users/:userId/permissions", authenticate, canAudit, asyncHandler(async (req, res) => {
  const summary = await rbac.getUserPermissionSummary(req.params.userId);
  return ok(res, summary);
}));

// ── POST /rbac/users/:userId/permissions — grant a direct permission ──────────
router.post("/users/:userId/permissions", authenticate, canManage, asyncHandler(async (req, res) => {
  const { permission, scopeType, scopeId, expiresAt } = req.body;
  if (!permission?.trim()) return fail(res, 400, "permission is required");
  if (permission === "*" && !req.can("admin.system.config")) {
    return fail(res, 403, "Granting wildcard permission requires admin.system.config");
  }
  const result = await rbac.giveDirectPermission(req.params.userId, permission, {
    scopeType:  scopeType || "",
    scopeId:    scopeId   || "",
    assignedBy: req.user.id,
    expiresAt:  expiresAt || null,
  });
  audit("user.permission.granted", req.user.id, { userId: req.params.userId, permission, scopeType, scopeId });
  return ok(res, result, 201);
}));

// ── DELETE /rbac/users/:userId/permissions/:permission ────────────────────────
router.delete("/users/:userId/permissions/:permission", authenticate, canManage, asyncHandler(async (req, res) => {
  const { scopeType, scopeId } = req.query;
  const result = await rbac.revokeDirectPermission(req.params.userId, req.params.permission, {
    scopeType: scopeType || "",
    scopeId:   scopeId   || "",
  });
  audit("user.permission.revoked", req.user.id, { userId: req.params.userId, permission: req.params.permission });
  return ok(res, result);
}));

// ── GET /rbac/cache/stats — cache health ─────────────────────────────────────
router.get("/cache/stats", authenticate, canRead, asyncHandler(async (req, res) => {
  return ok(res, { cache: cache.stats() });
}));

// ── DELETE /rbac/cache — flush the entire permission cache ────────────────────
router.delete("/cache", authenticate, requirePermission("admin.system.config"), asyncHandler(async (req, res) => {
  cache.invalidateAll();
  audit("cache.flushed", req.user.id, {});
  return ok(res, { flushed: true });
}));

// ── DELETE /rbac/cache/:userId — flush one user's permission cache ────────────
router.delete("/cache/:userId", authenticate, canManage, asyncHandler(async (req, res) => {
  cache.invalidate(req.params.userId);
  audit("cache.user.flushed", req.user.id, { userId: req.params.userId });
  return ok(res, { flushed: true, userId: req.params.userId });
}));

module.exports = router;
