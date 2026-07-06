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

const db    = require("../config/db");
const cache = require("./PermissionCache");

// ── Permission wildcard matching ───────────────────────────────────────────────
// Checks whether a Set of user permissions satisfies a required permission name.
// Order: exact match → wildcard segment match → super wildcard.
function matchPermission(userPermSet, required) {
  if (!required) return false;
  if (userPermSet.has("*"))        return true; // super_admin wildcard
  if (userPermSet.has(required))   return true; // exact match

  // Walk the dot-notation segments building wildcards from right to left
  // 'forum.thread.pin' → try 'forum.thread.*' → try 'forum.*'
  const parts = required.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const wildcard = `${parts.slice(0, i).join(".")}.*`;
    if (userPermSet.has(wildcard)) return true;
  }
  return false;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }
const NOT_EXPIRED = `(expires_at IS NULL OR expires_at > NOW())`;

// ── Main RBAC class ───────────────────────────────────────────────────────────
class RBAC {

  // ══════════════════════════════════════════════════════════════════════════
  //  ROLE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createRole(name, description = "", guard = "web") {
    _assertNonEmpty(name, "Role name");
    const slug = _slugify(name);
    const { rows } = await db.query(
      "INSERT INTO roles (name, description, guard) VALUES ($1,$2,$3) RETURNING id, name, description, is_system",
      [slug, description, guard]
    );
    return rows[0];
  }

  async deleteRole(name) {
    const role = await this._getRole(name);
    if (!role) throw _err(`Role '${name}' not found`, 404);
    if (role.is_system) throw _err(`System role '${name}' cannot be deleted`, 403);
    await db.query("DELETE FROM roles WHERE id=$1", [role.id]);
    cache.invalidateAll(); // all users with this role need refresh
    return { deleted: true, role: name };
  }

  async getAllRoles() {
    const { rows } = await db.query(
      `SELECT r.id, r.name, r.description, r.is_system, r.guard, r.created_at,
        COALESCE(json_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), '[]') AS permissions
       FROM roles r
       LEFT JOIN role_has_permissions rhp ON rhp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rhp.permission_id
       GROUP BY r.id ORDER BY r.name`
    );
    return rows;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PERMISSION MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  async createPermission(name, description = "", groupName = "custom", guard = "web") {
    _assertNonEmpty(name, "Permission name");
    const { rows } = await db.query(
      "INSERT INTO permissions (name, description, group_name, guard) VALUES ($1,$2,$3,$4) RETURNING id, name, description, group_name",
      [name.toLowerCase().trim(), description, groupName, guard]
    );
    return rows[0];
  }

  async deletePermission(name) {
    const perm = await this._getPerm(name);
    if (!perm) throw _err(`Permission '${name}' not found`, 404);
    if (name === "*") throw _err("Super wildcard permission cannot be deleted", 403);
    await db.query("DELETE FROM permissions WHERE id=$1", [perm.id]);
    cache.invalidateAll();
    return { deleted: true, permission: name };
  }

  async getAllPermissions(groupName) {
    let sql = "SELECT id, name, description, group_name, guard FROM permissions ORDER BY group_name, name";
    const params = [];
    if (groupName) {
      sql = "SELECT id, name, description, group_name, guard FROM permissions WHERE group_name=$1 ORDER BY name";
      params.push(groupName);
    }
    const { rows } = await db.query(sql, params);
    return rows;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ROLE ↔ PERMISSION
  // ══════════════════════════════════════════════════════════════════════════

  async giveRolePermission(roleName, permissionName) {
    const [role, perm] = await Promise.all([
      this._getRole(roleName), this._getPerm(permissionName),
    ]);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (!perm) throw _err(`Permission '${permissionName}' not found`, 404);
    await db.query(
      "INSERT INTO role_has_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [role.id, perm.id]
    );
    cache.invalidateAll(); // role change affects all holders
    return { role: roleName, permission: permissionName };
  }

  async revokeRolePermission(roleName, permissionName) {
    const [role, perm] = await Promise.all([
      this._getRole(roleName), this._getPerm(permissionName),
    ]);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (!perm) throw _err(`Permission '${permissionName}' not found`, 404);
    await db.query(
      "DELETE FROM role_has_permissions WHERE role_id=$1 AND permission_id=$2",
      [role.id, perm.id]
    );
    cache.invalidateAll();
    return { revoked: true, role: roleName, permission: permissionName };
  }

  // Replace all permissions on a role with the supplied list (Spatie-compatible)
  async syncRolePermissions(roleName, permissionNames = []) {
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    if (role.is_system && roleName === "super_admin") {
      throw _err("Cannot modify super_admin permissions via sync", 403);
    }
    const ids = await this._permIds(permissionNames);
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM role_has_permissions WHERE role_id=$1", [role.id]);
      for (const permId of ids) {
        await client.query(
          "INSERT INTO role_has_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [role.id, permId]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    cache.invalidateAll();
    return { role: roleName, permissions: permissionNames };
  }

  async getRolePermissions(roleName) {
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.description, p.group_name
       FROM role_has_permissions rhp JOIN permissions p ON p.id = rhp.permission_id
       WHERE rhp.role_id = $1 ORDER BY p.group_name, p.name`,
      [role.id]
    );
    return rows;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  USER ↔ ROLE
  // ══════════════════════════════════════════════════════════════════════════

  // options: { scopeType, scopeId, assignedBy, expiresAt }
  async assignRole(userId, roleName, options = {}) {
    _assertUuid(userId, "userId");
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const { scopeType = "", scopeId = "", assignedBy = null, expiresAt = null } = options;

    await db.query(
      `INSERT INTO user_has_roles (user_id, role_id, scope_type, scope_id, assigned_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, role_id, scope_type, scope_id)
       DO UPDATE SET assigned_by=$5, expires_at=$6, assigned_at=NOW()`,
      [userId, role.id, scopeType, scopeId, assignedBy, expiresAt]
    );
    cache.invalidate(userId);
    return { userId, role: roleName, scopeType, scopeId };
  }

  async removeRole(userId, roleName, options = {}) {
    _assertUuid(userId, "userId");
    const role = await this._getRole(roleName);
    if (!role) throw _err(`Role '${roleName}' not found`, 404);
    const { scopeType = "", scopeId = "" } = options;
    await db.query(
      "DELETE FROM user_has_roles WHERE user_id=$1 AND role_id=$2 AND scope_type=$3 AND scope_id=$4",
      [userId, role.id, scopeType, scopeId]
    );
    cache.invalidate(userId);
    return { removed: true, userId, role: roleName };
  }

  // Replace all global roles on a user with the supplied list
  async syncUserRoles(userId, roleNames = [], assignedBy = null) {
    _assertUuid(userId, "userId");
    if (!Array.isArray(roleNames)) throw _err("roleNames must be an array", 400);

    // Resolve role IDs, reject unknown names
    const rows = await Promise.all(roleNames.map(n => this._getRole(n)));
    const missing = roleNames.filter((_, i) => !rows[i]);
    if (missing.length) throw _err(`Unknown roles: ${missing.join(", ")}`, 400);
    const roleIds = rows.filter(Boolean).map(r => r.id);

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      // Remove global roles only (preserve community-scoped roles)
      await client.query(
        "DELETE FROM user_has_roles WHERE user_id=$1 AND scope_type='' AND scope_id=''",
        [userId]
      );
      for (const roleId of roleIds) {
        await client.query(
          `INSERT INTO user_has_roles (user_id, role_id, scope_type, scope_id, assigned_by)
           VALUES ($1,$2,'','', $3) ON CONFLICT DO NOTHING`,
          [userId, roleId, assignedBy]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    cache.invalidate(userId);
    return { userId, roles: roleNames };
  }

  async getUserRoles(userId, options = {}) {
    _assertUuid(userId, "userId");
    const { scopeType, scopeId } = options;
    let sql = `SELECT r.name, r.description, r.is_system, uhr.scope_type, uhr.scope_id, uhr.assigned_at, uhr.expires_at
               FROM user_has_roles uhr JOIN roles r ON r.id = uhr.role_id
               WHERE uhr.user_id=$1 AND ${NOT_EXPIRED}`;
    const params = [userId];
    if (scopeType !== undefined) { params.push(scopeType); sql += ` AND uhr.scope_type=$${params.length}`; }
    if (scopeId  !== undefined) { params.push(scopeId);   sql += ` AND uhr.scope_id=$${params.length}`;   }
    sql += " ORDER BY r.name";
    const { rows } = await db.query(sql, params);
    return rows;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  USER ↔ DIRECT PERMISSION
  // ══════════════════════════════════════════════════════════════════════════

  async giveDirectPermission(userId, permName, options = {}) {
    _assertUuid(userId, "userId");
    const perm = await this._getPerm(permName);
    if (!perm) throw _err(`Permission '${permName}' not found`, 404);
    const { scopeType = "", scopeId = "", assignedBy = null, expiresAt = null } = options;
    await db.query(
      `INSERT INTO user_has_permissions (user_id, permission_id, scope_type, scope_id, assigned_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, permission_id, scope_type, scope_id)
       DO UPDATE SET assigned_by=$5, expires_at=$6, assigned_at=NOW()`,
      [userId, perm.id, scopeType, scopeId, assignedBy, expiresAt]
    );
    cache.invalidate(userId);
    return { userId, permission: permName };
  }

  async revokeDirectPermission(userId, permName, options = {}) {
    _assertUuid(userId, "userId");
    const perm = await this._getPerm(permName);
    if (!perm) throw _err(`Permission '${permName}' not found`, 404);
    const { scopeType = "", scopeId = "" } = options;
    await db.query(
      "DELETE FROM user_has_permissions WHERE user_id=$1 AND permission_id=$2 AND scope_type=$3 AND scope_id=$4",
      [userId, perm.id, scopeType, scopeId]
    );
    cache.invalidate(userId);
    return { revoked: true, userId, permission: permName };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PERMISSION RESOLUTION  (the core — called by auth middleware)
  // ══════════════════════════════════════════════════════════════════════════

  // Returns { roles: string[], permissions: Set<string> } for a user.
  // Uses cache — DB hit only on miss or expiry.
  async resolveUserPermissions(userId) {
    _assertUuid(userId, "userId");
    const cached = cache.get(userId);
    if (cached) return cached;

    // One query: union of role-based and direct permissions across all non-expired assignments
    const { rows } = await db.query(
      `SELECT DISTINCT p.name AS permission, r.name AS role, uhr.scope_type, uhr.scope_id
       FROM user_has_roles uhr
       JOIN roles r ON r.id = uhr.role_id
       JOIN role_has_permissions rhp ON rhp.role_id = r.id
       JOIN permissions p ON p.id = rhp.permission_id
       WHERE uhr.user_id = $1 AND ${NOT_EXPIRED}

       UNION

       SELECT DISTINCT p.name AS permission, NULL AS role, uhp.scope_type, uhp.scope_id
       FROM user_has_permissions uhp
       JOIN permissions p ON p.id = uhp.permission_id
       WHERE uhp.user_id = $1 AND ${NOT_EXPIRED}`,
      [userId]
    );

    // Separate global permissions (scope_type='') from scoped permissions
    // Global permissions go into the main Set; scoped ones into a nested Map
    const globalPerms  = new Set();
    const scopedPerms  = new Map(); // key: `${scopeType}:${scopeId}` → Set<string>

    for (const row of rows) {
      if (!row.scope_type) {
        globalPerms.add(row.permission);
      } else {
        const key = `${row.scope_type}:${row.scope_id}`;
        if (!scopedPerms.has(key)) scopedPerms.set(key, new Set());
        scopedPerms.get(key).add(row.permission);
      }
    }

    // Collect role names (global only for req.user.roles)
    const { rows: roleRows } = await db.query(
      `SELECT r.name FROM user_has_roles uhr JOIN roles r ON r.id = uhr.role_id
       WHERE uhr.user_id=$1 AND uhr.scope_type='' AND uhr.scope_id='' AND ${NOT_EXPIRED}
       ORDER BY r.name`,
      [userId]
    );
    const roles = roleRows.map(r => r.name);

    const entry = { roles, permissions: globalPerms, scopedPermissions: scopedPerms };
    cache.set(userId, entry);
    return entry;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CHECKING
  // ══════════════════════════════════════════════════════════════════════════

  // options: { scope: 'community', scopeId: 'uuid' }
  async hasPermission(userId, permName, options = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return _checkPermission(resolved, permName, options);
  }

  // Alias matching Spatie's $user->can()
  async can(userId, permName, options = {}) {
    return this.hasPermission(userId, permName, options);
  }

  async hasAnyPermission(userId, permNames, options = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return permNames.some(p => _checkPermission(resolved, p, options));
  }

  async hasAllPermissions(userId, permNames, options = {}) {
    const resolved = await this.resolveUserPermissions(userId);
    return permNames.every(p => _checkPermission(resolved, p, options));
  }

  async hasRole(userId, roleName, options = {}) {
    const { scopeType = "", scopeId = "" } = options;
    const { rows } = await db.query(
      `SELECT 1 FROM user_has_roles uhr JOIN roles r ON r.id = uhr.role_id
       WHERE uhr.user_id=$1 AND r.name=$2 AND uhr.scope_type=$3 AND uhr.scope_id=$4 AND ${NOT_EXPIRED}`,
      [userId, roleName, scopeType, scopeId]
    );
    return rows.length > 0;
  }

  async hasAnyRole(userId, roleNames) {
    if (!roleNames?.length) return false;
    const { rows } = await db.query(
      `SELECT 1 FROM user_has_roles uhr JOIN roles r ON r.id = uhr.role_id
       WHERE uhr.user_id=$1 AND r.name = ANY($2::text[]) AND ${NOT_EXPIRED} LIMIT 1`,
      [userId, roleNames]
    );
    return rows.length > 0;
  }

  async hasAllRoles(userId, roleNames) {
    if (!roleNames?.length) return true;
    const { rows } = await db.query(
      `SELECT COUNT(DISTINCT r.name) AS cnt FROM user_has_roles uhr JOIN roles r ON r.id = uhr.role_id
       WHERE uhr.user_id=$1 AND r.name = ANY($2::text[]) AND ${NOT_EXPIRED}`,
      [userId, roleNames]
    );
    return parseInt(rows[0]?.cnt || 0, 10) >= roleNames.length;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUDIT
  // ══════════════════════════════════════════════════════════════════════════

  async getUserPermissionSummary(userId) {
    _assertUuid(userId, "userId");
    const [roles, resolved] = await Promise.all([
      this.getUserRoles(userId),
      this.resolveUserPermissions(userId),
    ]);
    const directPerms = await db.query(
      `SELECT p.name, p.group_name, uhp.scope_type, uhp.scope_id, uhp.expires_at
       FROM user_has_permissions uhp JOIN permissions p ON p.id=uhp.permission_id
       WHERE uhp.user_id=$1 AND ${NOT_EXPIRED}`,
      [userId]
    );
    return {
      userId,
      globalRoles:         roles.filter(r => !r.scope_type),
      scopedRoles:         roles.filter(r => r.scope_type),
      effectivePermissions:[...resolved.permissions].sort(),
      directPermissions:   directPerms.rows,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  GUARD HELPERS — for the ensure* pattern used in route handlers
  // ══════════════════════════════════════════════════════════════════════════

  // Throws 403 if the user doesn't have the permission. Attach to req.user.
  ensurePermission(resolved, permName, options = {}) {
    if (!_checkPermission(resolved, permName, options)) {
      throw _err(`Permission denied: ${permName}`, 403);
    }
  }

  ensureRole(resolved, roleName) {
    if (!resolved.roles.includes(roleName)) {
      throw _err(`Role required: ${roleName}`, 403);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  async _getRole(name) {
    const { rows } = await db.query("SELECT id, name, is_system FROM roles WHERE name=$1", [name]);
    return rows[0] || null;
  }

  async _getPerm(name) {
    const { rows } = await db.query("SELECT id, name FROM permissions WHERE name=$1", [name]);
    return rows[0] || null;
  }

  async _permIds(names) {
    if (!names.length) return [];
    const { rows } = await db.query("SELECT id FROM permissions WHERE name=ANY($1::text[])", [names]);
    return rows.map(r => r.id);
  }
}

// ── Internal utilities ────────────────────────────────────────────────────────
function _checkPermission(resolved, permName, options = {}) {
  // Super wildcard shortcut — checked first
  if (resolved.permissions.has("*")) return true;

  // 1. Check global permissions
  if (matchPermission(resolved.permissions, permName)) return true;

  // 2. Check scoped permissions if a scope was provided in options
  if (options.scope && options.scopeId && resolved.scopedPermissions) {
    const key    = `${options.scope}:${options.scopeId}`;
    const scoped = resolved.scopedPermissions.get(key);
    if (scoped && matchPermission(scoped, permName)) return true;
  }

  return false;
}

function _assertNonEmpty(val, label) {
  if (!val || typeof val !== "string" || !val.trim()) {
    throw _err(`${label} must be a non-empty string`, 400);
  }
}

function _assertUuid(val, label) {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(val)) throw _err(`${label} must be a valid UUID`, 400);
}

function _slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

function _err(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = new RBAC();
