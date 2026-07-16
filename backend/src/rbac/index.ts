// ════════════════════════════════════════════════════════════════════════════
//  VYLAPP RBAC ENGINE
//
//  The Node.js equivalent of Spatie Permission for Laravel.
//
//  API surface:
//    Role management:       createRole, deleteRole, getAllRoles
//    Permission management: createPermission, deletePermission, getAllPermissions
//    Role ↔ Permission:     giveRolePermission, revokeRolePermission, syncRolePermissions
//    User ↔ Role:           assignRole, removeRole, syncUserRoles, getUserRoles
//    User ↔ Permission:     giveDirectPermission, revokeDirectPermission
//    Checking:              hasRole, hasAnyRole, hasAllRoles,
//                           hasPermission, hasAnyPermission, can (alias)
//    Bulk resolution:       resolveUserPermissions (used by auth middleware)
//
//  PERMISSION MATCHING supports dot-notation wildcards:
//    'vibes.*'  matches 'vibes.create', 'vibes.delete.any', etc.
//    '*'        matches everything (super_admin)
//
//  COMMUNITY SCOPING:
//    Options object: { scope: 'community', scopeId: 'category-uuid' }
//    Global permissions satisfy scoped checks.
//    Scoped permissions do NOT satisfy global checks.
//
//  SECURITY: Expired role/permission assignments are ignored in all queries.
// ════════════════════════════════════════════════════════════════════════════

import prisma from "../config/prisma";
import cache from "./PermissionCache";
import { ResolvedPermissions } from "../types/express";
type CacheEntry = ResolvedPermissions;
import { Prisma } from "../generated/prisma";

interface RoleOptions {
  scopeType?: string;
  scopeId?: string;
  assignedBy?: string | null;
  expiresAt?: Date | null;
}

interface CheckOptions {
  scope?: string;
  scopeId?: string;
}

// ── Permission wildcard matching ───────────────────────────────────────────────
// Checks whether a Set of user permissions satisfies a required permission name.
// Order: exact match → wildcard segment match → super wildcard.
function matchPermission(userPermSet: Set<string>, required: string): boolean {
  if (!required) return false;
  if (userPermSet.has("*")) return true; // super_admin wildcard
  if (userPermSet.has(required)) return true; // exact match

  // Walk the dot-notation segments building wildcards from right to left
  // 'forum.thread.pin' → try 'forum.thread.*' → try 'forum.*'
  const parts = required.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const wildcard = `${parts.slice(0, i).join(".")}.*`;
    if (userPermSet.has(wildcard)) return true;
  }
  return false;
}

// Not-expired filter, expressed once and reused across every query.
const NOT_EXPIRED: Prisma.UserHasRolesWhereInput = { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
const NOT_EXPIRED_PERM: Prisma.UserHasPermissionsWhereInput = { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };

// ── Main RBAC class ───────────────────────────────────────────────────────────
class RBAC {
  // ══════════════════════════════════════════════════════════════════════════
  //  ROLE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createRole(name: string, description = "", guard = "web") {
    _assertNonEmpty(name, "Role name");
    const slug = _slugify(name);
    const role = await prisma.roles.create({
      data: { name: slug, description, guard },
      select: { id: true, name: true, description: true, isSystem: true },
    });
    // Original raw SQL returned RETURNING id, name, description, is_system —
    // shape back to that snake_case contract rather than leaking Prisma's
    // camelCase (same pattern found and fixed repeatedly in this migration).
    return { id: role.id, name: role.name, description: role.description, is_system: role.isSystem };
  }

  async deleteRole(name: string) {
    const role = await this._getRole(name);
    if (!role) throw _err(`Role '${name}' not found`, 404);
    if (role.isSystem) throw _err(`System role '${name}' cannot be deleted`, 403);
    await prisma.roles.delete({ where: { id: role.id } });
    cache.invalidateAll(); // all users with this role need refresh
    return { deleted: true, role: name };
  }

  // Kept as raw SQL: JSON aggregation with a FILTER clause has no query
  // builder equivalent.
  async getAllRoles() {
    return prisma.$queryRaw`
      SELECT r.id, r.name, r.description, r.is_system, r.guard, r.created_at,
        COALESCE(json_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), '[]') AS permissions
       FROM roles r
       LEFT JOIN role_has_permissions rhp ON rhp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rhp.permission_id
       GROUP BY r.id ORDER BY r.name
    `;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PERMISSION MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createPermission(name: string, description = "", groupName = "custom", guard = "web") {
    _assertNonEmpty(name, "Permission name");
    const perm = await prisma.permissions.create({
      data: { name: name.toLowerCase().trim(), description, groupName, guard },
      select: { id: true, name: true, description: true, groupName: true },
    });
    return { id: perm.id, name: perm.name, description: perm.description, group_name: perm.groupName };
  }

  async deletePermission(name: string) {
    const perm = await this._getPerm(name);
    if (!perm) throw _err(`Permission '${name}' not found`, 404);
    if (name === "*") throw _err("Super wildcard permission cannot be deleted", 403);
    await prisma.permissions.delete({ where: { id: perm.id } });
    cache.invalidateAll();
    return { deleted: true, permission: name };
  }

  async getAllPermissions(groupName?: string) {
    const rows = await prisma.permissions.findMany({
      where: groupName ? { groupName } : undefined,
      select: { id: true, name: true, description: true, groupName: true, guard: true },
      orderBy: groupName ? { name: "asc" } : [{ groupName: "asc" }, { name: "asc" }],
    });
    return rows.map(p => ({ id: p.id, name: p.name, description: p.description, group_name: p.groupName, guard: p.guard }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ROLE ↔ PERMISSION
  // ══════════════════════════════════════════════════════════════════════════

  async giveRolePermission(roleName: string, permissionName: string) {
    const [role, perm] = await Promise.all([this._getRole(roleName), this._getPerm(permissionName)]);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (!perm) throw _err(`Permission '${permissionName}' not found`, 404);
    await prisma.roleHasPermissions.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      create: { roleId: role.id, permissionId: perm.id },
      update: {},
    });
    cache.invalidateAll(); // role change affects all holders
    return { role: roleName, permission: permissionName };
  }

  async revokeRolePermission(roleName: string, permissionName: string) {
    const [role, perm] = await Promise.all([this._getRole(roleName), this._getPerm(permissionName)]);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (!perm) throw _err(`Permission '${permissionName}' not found`, 404);
    await prisma.roleHasPermissions.deleteMany({ where: { roleId: role.id, permissionId: perm.id } });
    cache.invalidateAll();
    return { revoked: true, role: roleName, permission: permissionName };
  }

  // Replace all permissions on a role with the supplied list (Spatie-compatible)
  async syncRolePermissions(roleName: string, permissionNames: string[] = []) {
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (role.isSystem && roleName === "super_admin") {
      throw _err("Cannot modify super_admin permissions via sync", 403);
    }
    const ids = await this._permIds(permissionNames);
    await prisma.$transaction([
      prisma.roleHasPermissions.deleteMany({ where: { roleId: role.id } }),
      ...ids.map(permId => prisma.roleHasPermissions.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        create: { roleId: role.id, permissionId: permId },
        update: {},
      })),
    ]);
    cache.invalidateAll();
    return { role: roleName, permissions: permissionNames };
  }

  async getRolePermissions(roleName: string) {
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const rows = await prisma.roleHasPermissions.findMany({
      where: { roleId: role.id },
      include: { permissions: { select: { id: true, name: true, description: true, groupName: true } } },
      orderBy: [{ permissions: { groupName: "asc" } }, { permissions: { name: "asc" } }],
    });
    return rows.map(r => ({ id: r.permissions.id, name: r.permissions.name, description: r.permissions.description, group_name: r.permissions.groupName }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  USER ↔ ROLE
  // ══════════════════════════════════════════════════════════════════════════

  // options: { scopeType, scopeId, assignedBy, expiresAt }
  async assignRole(userId: string, roleName: string, options: RoleOptions = {}) {
    _assertUuid(userId, "userId");
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const { scopeType = "", scopeId = "", assignedBy = null, expiresAt = null } = options;

    await prisma.userHasRoles.upsert({
      where: { userId_roleId_scopeType_scopeId: { userId, roleId: role.id, scopeType, scopeId } },
      create: { userId, roleId: role.id, scopeType, scopeId, assignedBy, expiresAt },
      update: { assignedBy, expiresAt, assignedAt: new Date() },
    });
    cache.invalidate(userId);
    return { userId, role: roleName, scopeType, scopeId };
  }

  async removeRole(userId: string, roleName: string, options: RoleOptions = {}) {
    _assertUuid(userId, "userId");
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const { scopeType = "", scopeId = "" } = options;
    await prisma.userHasRoles.deleteMany({ where: { userId, roleId: role.id, scopeType, scopeId } });
    cache.invalidate(userId);
    return { removed: true, userId, role: roleName };
  }

  // Replace all global roles on a user with the supplied list
  async syncUserRoles(userId: string, roleNames: string[] = [], assignedBy: string | null = null) {
    _assertUuid(userId, "userId");
    if (!Array.isArray(roleNames)) throw _err("roleNames must be an array", 400);

    // Resolve role IDs, reject unknown names
    const rows = await Promise.all(roleNames.map(n => this._getRole(n)));
    const missing = roleNames.filter((_, i) => !rows[i]);
    if (missing.length) throw _err(`Unknown roles: ${missing.join(", ")}`, 400);
    const roleIds = rows.filter((r): r is NonNullable<typeof r> => Boolean(r)).map(r => r.id);

    await prisma.$transaction([
      // Remove global roles only (preserve community-scoped roles)
      prisma.userHasRoles.deleteMany({ where: { userId, scopeType: "", scopeId: "" } }),
      ...roleIds.map(roleId => prisma.userHasRoles.upsert({
        where: { userId_roleId_scopeType_scopeId: { userId, roleId, scopeType: "", scopeId: "" } },
        create: { userId, roleId, scopeType: "", scopeId: "", assignedBy },
        update: {},
      })),
    ]);
    cache.invalidate(userId);
    return { userId, roles: roleNames };
  }

  async getUserRoles(userId: string, options: { scopeType?: string; scopeId?: string } = {}) {
    _assertUuid(userId, "userId");
    const { scopeType, scopeId } = options;
    const where: Prisma.UserHasRolesWhereInput = { userId, ...NOT_EXPIRED };
    if (scopeType !== undefined) where.scopeType = scopeType;
    if (scopeId !== undefined) where.scopeId = scopeId;

    const rows = await prisma.userHasRoles.findMany({
      where,
      include: { roles: { select: { name: true, description: true, isSystem: true } } },
      orderBy: { roles: { name: "asc" } },
    });
    return rows.map(r => ({
      name: r.roles.name, description: r.roles.description, is_system: r.roles.isSystem,
      scope_type: r.scopeType, scope_id: r.scopeId, assigned_at: r.assignedAt, expires_at: r.expiresAt,
    }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  USER ↔ DIRECT PERMISSION
  // ══════════════════════════════════════════════════════════════════════════

  async giveDirectPermission(userId: string, permName: string, options: RoleOptions = {}) {
    _assertUuid(userId, "userId");
    const perm = await this._getPerm(permName);
    if (!perm) throw _err(`Permission '${permName}' not found`, 404);
    const { scopeType = "", scopeId = "", assignedBy = null, expiresAt = null } = options;
    await prisma.userHasPermissions.upsert({
      where: { userId_permissionId_scopeType_scopeId: { userId, permissionId: perm.id, scopeType, scopeId } },
      create: { userId, permissionId: perm.id, scopeType, scopeId, assignedBy, expiresAt },
      update: { assignedBy, expiresAt, assignedAt: new Date() },
    });
    cache.invalidate(userId);
    return { userId, permission: permName };
  }

  async revokeDirectPermission(userId: string, permName: string, options: { scopeType?: string; scopeId?: string } = {}) {
    _assertUuid(userId, "userId");
    const perm = await this._getPerm(permName);
    if (!perm) throw _err(`Permission '${permName}' not found`, 404);
    const { scopeType = "", scopeId = "" } = options;
    await prisma.userHasPermissions.deleteMany({ where: { userId, permissionId: perm.id, scopeType, scopeId } });
    cache.invalidate(userId);
    return { revoked: true, userId, permission: permName };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PERMISSION RESOLUTION  (the core — called by auth middleware)
  // ══════════════════════════════════════════════════════════════════════════

  // Returns { roles: string[], permissions: Set<string>, scopedPermissions }
  // for a user. Uses cache — DB hit only on miss or expiry.
  //
  // Kept as raw SQL: this UNION of role-based and direct permissions across
  // all non-expired assignments is the hottest, most security-critical query
  // in the app (runs on every authenticated request behind the cache) — the
  // exact proven query stays as-is rather than re-deriving equivalent logic
  // via two separate Prisma queries merged in JS.
  async resolveUserPermissions(userId: string): Promise<CacheEntry> {
    _assertUuid(userId, "userId");
    const cached = cache.get(userId);
    if (cached) return cached;

    const rows: { permission: string; role: string | null; scope_type: string; scope_id: string }[] = await prisma.$queryRaw`
      SELECT DISTINCT p.name AS permission, r.name AS role, uhr.scope_type, uhr.scope_id
       FROM user_has_roles uhr
       JOIN roles r ON r.id = uhr.role_id
       JOIN role_has_permissions rhp ON rhp.role_id = r.id
       JOIN permissions p ON p.id = rhp.permission_id
       WHERE uhr.user_id = ${userId} AND (uhr.expires_at IS NULL OR uhr.expires_at > NOW())

       UNION

       SELECT DISTINCT p.name AS permission, NULL AS role, uhp.scope_type, uhp.scope_id
       FROM user_has_permissions uhp
       JOIN permissions p ON p.id = uhp.permission_id
       WHERE uhp.user_id = ${userId} AND (uhp.expires_at IS NULL OR uhp.expires_at > NOW())
    `;

    // Separate global permissions (scope_type='') from scoped permissions
    // Global permissions go into the main Set; scoped ones into a nested Map
    const globalPerms = new Set<string>();
    const scopedPerms = new Map<string, Set<string>>(); // key: `${scopeType}:${scopeId}` → Set<string>

    for (const row of rows) {
      if (!row.scope_type) {
        globalPerms.add(row.permission);
      } else {
        const key = `${row.scope_type}:${row.scope_id}`;
        if (!scopedPerms.has(key)) scopedPerms.set(key, new Set());
        scopedPerms.get(key)!.add(row.permission);
      }
    }

    // Collect role names (global only for req.user.roles)
    const roleRows = await prisma.userHasRoles.findMany({
      where: { userId, scopeType: "", scopeId: "", ...NOT_EXPIRED },
      include: { roles: { select: { name: true } } },
      orderBy: { roles: { name: "asc" } },
    });
    const roles = roleRows.map(r => r.roles.name);

    const entry: CacheEntry = { roles, permissions: globalPerms, scopedPermissions: scopedPerms };
    cache.set(userId, entry);
    return entry;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CHECKING
  // ══════════════════════════════════════════════════════════════════════════

  // options: { scope: 'community', scopeId: 'uuid' }
  async hasPermission(userId: string, permName: string, options: CheckOptions = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return _checkPermission(resolved, permName, options);
  }

  // Alias matching Spatie's $user->can()
  async can(userId: string, permName: string, options: CheckOptions = {}) {
    return this.hasPermission(userId, permName, options);
  }

  async hasAnyPermission(userId: string, permNames: string[], options: CheckOptions = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return permNames.some(p => _checkPermission(resolved, p, options));
  }

  async hasAllPermissions(userId: string, permNames: string[], options: CheckOptions = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return permNames.every(p => _checkPermission(resolved, p, options));
  }

  async hasRole(userId: string, roleName: string, options: { scopeType?: string; scopeId?: string } = {}) {
    const { scopeType = "", scopeId = "" } = options;
    const row = await prisma.userHasRoles.findFirst({
      where: { userId, scopeType, scopeId, roles: { name: roleName }, ...NOT_EXPIRED },
    });
    return !!row;
  }

  async hasAnyRole(userId: string, roleNames: string[]) {
    if (!roleNames?.length) return false;
    const row = await prisma.userHasRoles.findFirst({
      where: { userId, roles: { name: { in: roleNames } }, ...NOT_EXPIRED },
    });
    return !!row;
  }

  async hasAllRoles(userId: string, roleNames: string[]) {
    if (!roleNames?.length) return true;
    const rows = await prisma.userHasRoles.findMany({
      where: { userId, roles: { name: { in: roleNames } }, ...NOT_EXPIRED },
      include: { roles: { select: { name: true } } },
    });
    const distinctNames = new Set(rows.map(r => r.roles.name));
    return distinctNames.size >= roleNames.length;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUDIT
  // ══════════════════════════════════════════════════════════════════════════

  async getUserPermissionSummary(userId: string) {
    _assertUuid(userId, "userId");
    const [roles, resolved] = await Promise.all([
      this.getUserRoles(userId),
      this.resolveUserPermissions(userId),
    ]);
    const directPerms = await prisma.userHasPermissions.findMany({
      where: { userId, ...NOT_EXPIRED_PERM },
      include: { permissions: { select: { name: true, groupName: true } } },
    });
    return {
      userId,
      globalRoles: roles.filter(r => !r.scope_type),
      scopedRoles: roles.filter(r => r.scope_type),
      effectivePermissions: [...resolved.permissions].sort(),
      directPermissions: directPerms.map(p => ({
        name: p.permissions.name, group_name: p.permissions.groupName,
        scope_type: p.scopeType, scope_id: p.scopeId, expires_at: p.expiresAt,
      })),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  GUARD HELPERS — for the ensure* pattern used in route handlers
  // ══════════════════════════════════════════════════════════════════════════

  // Throws 403 if the user doesn't have the permission. Attach to req.user.
  ensurePermission(resolved: CacheEntry, permName: string, options: CheckOptions = {}) {
    if (!_checkPermission(resolved, permName, options)) {
      throw _err(`Permission denied: ${permName}`, 403);
    }
  }

  ensureRole(resolved: CacheEntry, roleName: string) {
    if (!resolved.roles.includes(roleName)) {
      throw _err(`Role required: ${roleName}`, 403);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  async _getRole(name: string) {
    return prisma.roles.findUnique({ where: { name }, select: { id: true, name: true, isSystem: true } });
  }

  async _getPerm(name: string) {
    return prisma.permissions.findUnique({ where: { name }, select: { id: true, name: true } });
  }

  async _permIds(names: string[]): Promise<string[]> {
    if (!names.length) return [];
    const rows = await prisma.permissions.findMany({ where: { name: { in: names } }, select: { id: true } });
    return rows.map(r => r.id);
  }
}

// ── Internal utilities ────────────────────────────────────────────────────────
function _checkPermission(resolved: CacheEntry, permName: string, options: CheckOptions = {}): boolean {
  // Super wildcard shortcut — checked first
  if (resolved.permissions.has("*")) return true;

  // 1. Check global permissions
  if (matchPermission(resolved.permissions, permName)) return true;

  // 2. Check scoped permissions if a scope was provided in options
  if (options.scope && options.scopeId && resolved.scopedPermissions) {
    const key = `${options.scope}:${options.scopeId}`;
    const scoped = resolved.scopedPermissions.get(key);
    if (scoped && matchPermission(scoped, permName)) return true;
  }

  return false;
}

function _assertNonEmpty(val: unknown, label: string): asserts val is string {
  if (!val || typeof val !== "string" || !val.trim()) {
    throw _err(`${label} must be a non-empty string`, 400);
  }
}

function _assertUuid(val: string, label: string) {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(val)) throw _err(`${label} must be a valid UUID`, 400);
}

function _slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

function _err(message: string, status = 400): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

const rbac = new RBAC();
export = rbac;
