// ════════════════════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE — RBAC-integrated
//
//  On every authenticated request:
//    1. Verify the JWT (HMAC-SHA256, alg:none protection)
//    2. Confirm the user exists and is not suspended/deactivated
//    3. Resolve roles + permissions from the RBAC engine (cache-first)
//    4. Attach to req.user and req.userPermissions
//
//  SECURITY: JWT does NOT contain roles or permissions.
//    Roles are revocable in real time. If a role is removed, the next
//    request (after cache TTL or explicit invalidation) reflects it.
//    Embedding permissions in a JWT means revocation takes until token expiry.
//
//  req.user shape:
//    { id, handle, displayName }
//
//  req.userPermissions shape:
//    { roles: string[], permissions: Set<string>, scopedPermissions: Map }
//
//  Convenience methods attached to req:
//    req.can(permName, opts?)      → boolean
//    req.hasRole(roleName)         → boolean
//    req.hasAnyRole(...roleNames)  → boolean
// ════════════════════════════════════════════════════════════════════════════

const { verifyJWT }  = require("../utils/crypto");
const env            = require("../config/env");
const { fail }       = require("../utils/respond");
const db             = require("../config/db");
const rbac           = require("../rbac");

// ── authenticate (required auth) ──────────────────────────────────────────────
async function authenticate(req, res, next) {
  try {
    const token = _extractToken(req);
    if (!token) return fail(res, 401, "Missing access token");

    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) return fail(res, 401, result.error || "Invalid or expired token");

    const { rows } = await db.query(
      `SELECT id, handle, display_name, is_suspended, is_deactivated
       FROM users WHERE id=$1 AND deleted_at IS NULL`,
      [result.payload.sub]
    );
    if (!rows.length)            return fail(res, 401, "User no longer exists");
    if (rows[0].is_suspended)   return fail(res, 403, "Account suspended");
    if (rows[0].is_deactivated) return fail(res, 403, "Account deactivated");

    const user = rows[0];
    req.user   = { id: user.id, handle: user.handle, displayName: user.display_name };

    // Resolve permissions (cache-first — typically zero DB queries)
    const resolved         = await rbac.resolveUserPermissions(user.id);
    req.userPermissions    = resolved;

    // Convenience helpers — mirrors Laravel's $request->user()->can() pattern
    req.can        = (perm, opts = {}) => _checkPerm(resolved, perm, opts);
    req.hasRole    = (role)            => resolved.roles.includes(role);
    req.hasAnyRole = (...roles)        => roles.flat().some(r => resolved.roles.includes(r));

    next();
  } catch (err) {
    // Never leak internal errors through the auth layer
    return fail(res, 401, "Authentication failed");
  }
}

// ── optionalAuth (auth if token present, anonymous if not) ───────────────────
async function optionalAuth(req, res, next) {
  try {
    const token = _extractToken(req);
    if (!token) {
      req.user            = null;
      req.userPermissions = null;
      req.can             = () => false;
      req.hasRole         = () => false;
      req.hasAnyRole      = () => false;
      return next();
    }
    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) {
      req.user = null; req.userPermissions = null;
      req.can = () => false; req.hasRole = () => false; req.hasAnyRole = () => false;
      return next();
    }
    const { rows } = await db.query(
      "SELECT id, handle, display_name FROM users WHERE id=$1 AND deleted_at IS NULL AND is_suspended=FALSE",
      [result.payload.sub]
    );
    if (!rows.length) {
      req.user = null; req.userPermissions = null;
      req.can = () => false; req.hasRole = () => false; req.hasAnyRole = () => false;
      return next();
    }
    const user          = rows[0];
    req.user            = { id: user.id, handle: user.handle, displayName: user.display_name };
    const resolved      = await rbac.resolveUserPermissions(user.id);
    req.userPermissions = resolved;
    req.can             = (perm, opts = {}) => _checkPerm(resolved, perm, opts);
    req.hasRole         = (role)            => resolved.roles.includes(role);
    req.hasAnyRole      = (...roles)        => roles.flat().some(r => resolved.roles.includes(r));
    next();
  } catch {
    req.user = null; req.userPermissions = null;
    req.can = () => false; req.hasRole = () => false; req.hasAnyRole = () => false;
    next();
  }
}

// ── requireAdmin (backward-compatible shim → now checks admin.access) ─────────
// Routes still calling requireAdmin work as before. Internally it now checks
// the RBAC permission rather than the is_admin boolean.
function requireAdmin(req, res, next) {
  if (!req.userPermissions) return fail(res, 401, "Authentication required");
  if (!req.can("admin.access")) return fail(res, 403, "Admin access required");
  next();
}

// ── Internal ──────────────────────────────────────────────────────────────────
function _extractToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function _checkPerm(resolved, permName, opts = {}) {
  if (!resolved) return false;
  const { permissions, scopedPermissions } = resolved;
  if (permissions.has("*")) return true;
  if (_match(permissions, permName)) return true;
  if (opts.scope && opts.scopeId && scopedPermissions) {
    const scoped = scopedPermissions.get(`${opts.scope}:${opts.scopeId}`);
    if (scoped && _match(scoped, permName)) return true;
  }
  return false;
}

function _match(permSet, required) {
  if (permSet.has(required)) return true;
  const parts = required.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    if (permSet.has(`${parts.slice(0, i).join(".")}.*`)) return true;
  }
  return false;
}

module.exports = { authenticate, optionalAuth, requireAdmin };

// ── Named export aliases (existing routes use 'requireAuth') ─────────────────
module.exports.requireAuth   = authenticate;
module.exports.optionalAuth  = optionalAuth;
module.exports.requireAdmin  = requireAdmin;
