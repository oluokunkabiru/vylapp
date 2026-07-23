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

import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../utils/crypto";
import env from "../config/env";
import authCookies from "../utils/authCookies";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import rbac from "../rbac";
import { CanOptions, ResolvedPermissions } from "../types/express";

const { fail } = respond;

// ── authenticate (required auth) ──────────────────────────────────────────────
async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = _extractToken(req);
    if (!token) return fail(res, 401, "Missing access token");

    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) return fail(res, 401, result.error || "Invalid or expired token");

    const user = await prisma.users.findFirst({
      where: { id: result.payload.sub, deletedAt: null },
      select: { id: true, handle: true, displayName: true, isSuspended: true, isDeactivated: true },
    });
    if (!user) return fail(res, 401, "User no longer exists");
    if (user.isSuspended) return fail(res, 403, "Account suspended");
    if (user.isDeactivated) return fail(res, 403, "Account deactivated");

    req.user = { id: user.id, handle: user.handle, displayName: user.displayName };

    // Resolve permissions (cache-first — typically zero DB queries)
    const resolved = await rbac.resolveUserPermissions(user.id);
    req.userPermissions = resolved;

    // Convenience helpers — mirrors Laravel's $request->user()->can() pattern
    req.can = (perm: string, opts: CanOptions = {}) => _checkPerm(resolved, perm, opts);
    req.hasRole = (role: string) => resolved.roles.includes(role);
    req.hasAnyRole = (...roles: (string | string[])[]) => roles.flat().some(r => resolved.roles.includes(r));

    next();
  } catch (err) {
    // Never leak internal errors through the auth layer
    return fail(res, 401, "Authentication failed");
  }
}

// ── optionalAuth (auth if token present, anonymous if not) ───────────────────
async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const setAnonymous = () => {
    req.user = null;
    req.userPermissions = null;
    req.can = () => false;
    req.hasRole = () => false;
    req.hasAnyRole = () => false;
  };
  try {
    const token = _extractToken(req);
    if (!token) {
      setAnonymous();
      return next();
    }
    const result = verifyJWT(token, env.jwtSecret);
    if (!result.valid) {
      setAnonymous();
      return next();
    }
    const user = await prisma.users.findFirst({
      where: { id: result.payload.sub, deletedAt: null, isSuspended: false },
      select: { id: true, handle: true, displayName: true },
    });
    if (!user) {
      setAnonymous();
      return next();
    }
    req.user = { id: user.id, handle: user.handle, displayName: user.displayName };
    const resolved = await rbac.resolveUserPermissions(user.id);
    req.userPermissions = resolved;
    req.can = (perm: string, opts: CanOptions = {}) => _checkPerm(resolved, perm, opts);
    req.hasRole = (role: string) => resolved.roles.includes(role);
    req.hasAnyRole = (...roles: (string | string[])[]) => roles.flat().some(r => resolved.roles.includes(r));
    next();
  } catch {
    setAnonymous();
    next();
  }
}

// ── requireAdmin (backward-compatible shim → now checks admin.access) ─────────
// Routes still calling requireAdmin work as before. Internally it now checks
// the RBAC permission rather than the is_admin boolean.
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userPermissions) return fail(res, 401, "Authentication required");
  if (!req.can!("admin.access")) return fail(res, 403, "Admin access required");
  next();
}

// ── Internal ──────────────────────────────────────────────────────────────────
// Web client: httpOnly vyl_at cookie. Mobile app / other API clients:
// Authorization: Bearer header, unchanged.
function _extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[authCookies.ACCESS_COOKIE];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function _checkPerm(resolved: ResolvedPermissions | null | undefined, permName: string, opts: CanOptions = {}): boolean {
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

function _match(permSet: Set<string>, required: string): boolean {
  if (permSet.has(required)) return true;
  const parts = required.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    if (permSet.has(`${parts.slice(0, i).join(".")}.*`)) return true;
  }
  return false;
}

export = { authenticate, optionalAuth, requireAdmin, requireAuth: authenticate };
