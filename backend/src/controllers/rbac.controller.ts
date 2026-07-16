import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import rbac from "../rbac";
import cache from "../rbac/PermissionCache";

const { ok, fail } = respond;

function audit(action: string, actor: string, target: unknown) {
  console.log(JSON.stringify({
    event: "rbac_audit", action, actor, target,
    ts: new Date().toISOString(),
  }));
}

// ── GET /rbac/roles — list all roles with their permissions ───────────────────
async function listRoles(req: AuthedRequest, res: Response) {
  const roles = await rbac.getAllRoles();
  return ok(res, { roles });
}

// ── POST /rbac/roles — create a new role ──────────────────────────────────────
async function createRole(req: AuthedRequest, res: Response) {
  const { name, description } = req.body;
  if (!name?.trim()) return fail(res, 400, "Role name is required");
  const role = await rbac.createRole(name, description || "");
  audit("role.created", req.user.id, { role: name });
  return ok(res, { role }, 201);
}

// ── DELETE /rbac/roles/:name — remove a role ──────────────────────────────────
async function deleteRole(req: AuthedRequest, res: Response) {
  const result = await rbac.deleteRole(req.params.name);
  audit("role.deleted", req.user.id, { role: req.params.name });
  return ok(res, result);
}

// ── GET /rbac/roles/:name/permissions — list permissions on a role ────────────
async function getRolePermissions(req: AuthedRequest, res: Response) {
  const perms = await rbac.getRolePermissions(req.params.name);
  return ok(res, { role: req.params.name, permissions: perms });
}

// ── POST /rbac/roles/:name/permissions — assign a permission to a role ────────
async function giveRolePermission(req: AuthedRequest, res: Response) {
  const { permission } = req.body;
  if (!permission?.trim()) return fail(res, 400, "permission is required");
  const result = await rbac.giveRolePermission(req.params.name, permission);
  audit("role.permission.assigned", req.user.id, { role: req.params.name, permission });
  return ok(res, result);
}

// ── PUT /rbac/roles/:name/permissions — sync (replace) all permissions on a role
async function syncRolePermissions(req: AuthedRequest, res: Response) {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return fail(res, 400, "permissions must be an array");
  const result = await rbac.syncRolePermissions(req.params.name, permissions);
  audit("role.permissions.synced", req.user.id, { role: req.params.name, count: permissions.length });
  return ok(res, result);
}

// ── DELETE /rbac/roles/:name/permissions/:permission ─────────────────────────
async function revokeRolePermission(req: AuthedRequest, res: Response) {
  const result = await rbac.revokeRolePermission(req.params.name, req.params.permission);
  audit("role.permission.revoked", req.user.id, { role: req.params.name, permission: req.params.permission });
  return ok(res, result);
}

// ── GET /rbac/permissions — list all permissions (optionally filter by group) ─
async function listPermissions(req: AuthedRequest, res: Response) {
  const perms = await rbac.getAllPermissions(req.query.group as string);
  return ok(res, { permissions: perms });
}

// ── POST /rbac/permissions — create a custom permission ───────────────────────
async function createPermission(req: AuthedRequest, res: Response) {
  const { name, description, group } = req.body;
  if (!name?.trim()) return fail(res, 400, "permission name is required");
  const perm = await rbac.createPermission(name, description || "", group || "custom");
  audit("permission.created", req.user.id, { permission: name });
  return ok(res, { permission: perm }, 201);
}

// ── DELETE /rbac/permissions/:name ────────────────────────────────────────────
async function deletePermission(req: AuthedRequest, res: Response) {
  const result = await rbac.deletePermission(req.params.name);
  audit("permission.deleted", req.user.id, { permission: req.params.name });
  return ok(res, result);
}

// ── GET /rbac/users/:userId/roles — list a user's roles ──────────────────────
async function getUserRoles(req: AuthedRequest, res: Response) {
  const roles = await rbac.getUserRoles(req.params.userId);
  return ok(res, { userId: req.params.userId, roles });
}

// ── POST /rbac/users/:userId/roles — assign a role to a user ─────────────────
async function assignUserRole(req: AuthedRequest, res: Response) {
  const { role, scopeType, scopeId, expiresAt } = req.body;
  if (!role?.trim()) return fail(res, 400, "role is required");

  // Guard: super_admin assignment requires super_admin permission
  if (role === "super_admin" && !req.can!("admin.system.config")) {
    return fail(res, 403, "Assigning super_admin requires admin.system.config permission");
  }

  const result = await rbac.assignRole(req.params.userId, role, {
    scopeType: scopeType || "",
    scopeId: scopeId || "",
    assignedBy: req.user.id,
    expiresAt: expiresAt || null,
  });
  audit("user.role.assigned", req.user.id, { userId: req.params.userId, role, scopeType, scopeId });
  return ok(res, result, 201);
}

// ── PUT /rbac/users/:userId/roles — sync all global roles on a user ───────────
async function syncUserRoles(req: AuthedRequest, res: Response) {
  const { roles } = req.body;
  if (!Array.isArray(roles)) return fail(res, 400, "roles must be an array");
  if (roles.includes("super_admin") && !req.can!("admin.system.config")) {
    return fail(res, 403, "Syncing super_admin requires admin.system.config permission");
  }
  // rbac/index.js (still JS, converted next in this batch) infers this
  // positional param's type as literal `null` from its default value —
  // narrow cast until rbac/index.ts gives it a real signature.
  const result = await rbac.syncUserRoles(req.params.userId, roles, req.user.id as any);
  audit("user.roles.synced", req.user.id, { userId: req.params.userId, roles });
  return ok(res, result);
}

// ── DELETE /rbac/users/:userId/roles/:role — remove a role from a user ────────
async function removeUserRole(req: AuthedRequest, res: Response) {
  const { scopeType, scopeId } = req.query;
  if (req.params.role === "super_admin" && !req.can!("admin.system.config")) {
    return fail(res, 403, "Removing super_admin requires admin.system.config permission");
  }
  const result = await rbac.removeRole(req.params.userId, req.params.role, {
    scopeType: (scopeType as string) || "",
    scopeId: (scopeId as string) || "",
  });
  audit("user.role.removed", req.user.id, { userId: req.params.userId, role: req.params.role });
  return ok(res, result);
}

// ── GET /rbac/users/:userId/permissions — full permission summary for a user ───
async function getUserPermissionSummary(req: AuthedRequest, res: Response) {
  const summary = await rbac.getUserPermissionSummary(req.params.userId);
  return ok(res, summary);
}

// ── POST /rbac/users/:userId/permissions — grant a direct permission ──────────
async function giveDirectPermission(req: AuthedRequest, res: Response) {
  const { permission, scopeType, scopeId, expiresAt } = req.body;
  if (!permission?.trim()) return fail(res, 400, "permission is required");
  if (permission === "*" && !req.can!("admin.system.config")) {
    return fail(res, 403, "Granting wildcard permission requires admin.system.config");
  }
  const result = await rbac.giveDirectPermission(req.params.userId, permission, {
    scopeType: scopeType || "",
    scopeId: scopeId || "",
    assignedBy: req.user.id,
    expiresAt: expiresAt || null,
  });
  audit("user.permission.granted", req.user.id, { userId: req.params.userId, permission, scopeType, scopeId });
  return ok(res, result, 201);
}

// ── DELETE /rbac/users/:userId/permissions/:permission ────────────────────────
async function revokeDirectPermission(req: AuthedRequest, res: Response) {
  const { scopeType, scopeId } = req.query;
  const result = await rbac.revokeDirectPermission(req.params.userId, req.params.permission, {
    scopeType: (scopeType as string) || "",
    scopeId: (scopeId as string) || "",
  });
  audit("user.permission.revoked", req.user.id, { userId: req.params.userId, permission: req.params.permission });
  return ok(res, result);
}

// ── GET /rbac/cache/stats — cache health ─────────────────────────────────────
async function cacheStats(req: AuthedRequest, res: Response) {
  return ok(res, { cache: cache.stats() });
}

// ── DELETE /rbac/cache — flush the entire permission cache ────────────────────
async function flushCache(req: AuthedRequest, res: Response) {
  cache.invalidateAll();
  audit("cache.flushed", req.user.id, {});
  return ok(res, { flushed: true });
}

// ── DELETE /rbac/cache/:userId — flush one user's permission cache ────────────
async function flushUserCache(req: AuthedRequest, res: Response) {
  cache.invalidate(req.params.userId);
  audit("cache.user.flushed", req.user.id, { userId: req.params.userId });
  return ok(res, { flushed: true, userId: req.params.userId });
}

export = {
  listRoles, createRole, deleteRole, getRolePermissions, giveRolePermission, syncRolePermissions, revokeRolePermission,
  listPermissions, createPermission, deletePermission,
  getUserRoles, assignUserRole, syncUserRoles, removeUserRole,
  getUserPermissionSummary, giveDirectPermission, revokeDirectPermission,
  cacheStats, flushCache, flushUserCache,
};
