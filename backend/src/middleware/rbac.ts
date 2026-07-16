// ════════════════════════════════════════════════════════════════════════════
//  RBAC MIDDLEWARE
//
//  Express middleware factories that check roles and permissions.
//  Must be used AFTER the authenticate middleware (which attaches req.user
//  and req.userPermissions).
//
//  USAGE IN ROUTES:
//
//    const { requirePermission, requireRole, requireAnyPermission } = require('../middleware/rbac');
//
//    // Single permission:
//    router.post('/courses', authenticate, requirePermission('learn.create'), handler);
//
//    // Multiple — all must be held (AND):
//    router.post('/publish', authenticate, requirePermission('learn.create', 'learn.publish.own'), handler);
//
//    // Any one (OR):
//    router.patch('/thread', authenticate, requireAnyPermission('forum.moderate', 'forum.thread.pin'), handler);
//
//    // Role check:
//    router.get('/admin', authenticate, requireRole('platform_admin', 'super_admin'), handler);
//
//    // Community-scoped permission (reads scopeId from req.params or req.body):
//    router.patch('/forum/:categoryId/threads/:id',
//      authenticate,
//      requirePermission('forum.thread.pin', { scopeFrom: 'params', scopeKey: 'categoryId', scopeType: 'community' }),
//      handler);
//
//  HOW SCOPE RESOLUTION WORKS:
//    options.scopeFrom: 'params' | 'body' | 'query' | 'static'
//    options.scopeKey:  key name in the source object
//    options.scopeType: 'community' | ... (written to the RBAC check)
//    options.scopeId:   literal value (when scopeFrom = 'static')
//    A global permission always satisfies a scoped check.
// ════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction, RequestHandler } from "express";
import respond from "../utils/respond";
import { ResolvedPermissions } from "../types/express";

const { fail } = respond;

interface ScopeOptions {
  scopeFrom?: "params" | "body" | "query" | "static";
  scopeKey?: string;
  scopeType?: string;
  scopeId?: string;
}

type PermArg = string | string[];

function _lastIsOptions(args: (PermArg | ScopeOptions)[]): boolean {
  const last = args[args.length - 1];
  return args.length > 0 && typeof last === "object" && !Array.isArray(last);
}

// ── requirePermission ─────────────────────────────────────────────────────────
// All listed permissions must be held (AND semantics, same as Spatie's
// $user->hasAllPermissions([...]).
function requirePermission(...args: (PermArg | ScopeOptions)[]): RequestHandler {
  // Last arg may be an options object
  const hasOptions = _lastIsOptions(args);
  const options = (hasOptions ? args.pop() : {}) as ScopeOptions;
  const perms = (args as PermArg[]).flat();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.userPermissions) {
      return fail(res, 401, "Authentication required");
    }
    const scope = _resolveScope(req, options);
    for (const perm of perms) {
      if (!_check(req.userPermissions, perm, scope)) {
        return fail(res, 403, `Permission required: ${perm}`);
      }
    }
    next();
  };
}

// ── requireAnyPermission ──────────────────────────────────────────────────────
// At least one of the listed permissions must be held (OR semantics).
function requireAnyPermission(...args: (PermArg | ScopeOptions)[]): RequestHandler {
  const hasOptions = _lastIsOptions(args);
  const options = (hasOptions ? args.pop() : {}) as ScopeOptions;
  const perms = (args as PermArg[]).flat();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.userPermissions) {
      return fail(res, 401, "Authentication required");
    }
    const scope = _resolveScope(req, options);
    const allowed = perms.some(p => _check(req.userPermissions, p, scope));
    if (!allowed) {
      return fail(res, 403, `One of these permissions required: ${perms.join(", ")}`);
    }
    next();
  };
}

// ── requireRole ───────────────────────────────────────────────────────────────
// User must hold at least one of the listed roles (OR semantics, global scope).
// For AND semantics, chain requireRole calls.
function requireRole(...roles: PermArg[]): RequestHandler {
  const roleList = roles.flat();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.userPermissions) {
      return fail(res, 401, "Authentication required");
    }
    const userRoles = req.userPermissions.roles || [];
    const allowed = roleList.some(r => userRoles.includes(r));
    if (!allowed) {
      return fail(res, 403, `Role required: ${roleList.join(" or ")}`);
    }
    next();
  };
}

// ── requireSelf ───────────────────────────────────────────────────────────────
// User must be the subject of the request (req.params.userId === req.user.id)
// OR must hold the specified fallback permission.
function requireSelf(fallbackPermission?: string, userIdParam = "userId"): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.userPermissions) {
      return fail(res, 401, "Authentication required");
    }
    if (req.params[userIdParam] === req.user.id) return next();
    if (fallbackPermission && _check(req.userPermissions, fallbackPermission, {})) return next();
    return fail(res, 403, "Access denied: this action is only allowed for the resource owner");
  };
}

// ── Internal: permission matching (mirrors rbac/index.js logic) ───────────────
function _check(resolved: ResolvedPermissions | null | undefined, permName: string, scope: { scopeType?: string; scopeId?: string } = {}): boolean {
  if (!resolved) return false;
  const { permissions, scopedPermissions } = resolved;

  if (permissions.has("*")) return true;
  if (_match(permissions, permName)) return true;

  if (scope.scopeType && scope.scopeId && scopedPermissions) {
    const key = `${scope.scopeType}:${scope.scopeId}`;
    const scoped = scopedPermissions.get(key);
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

function _resolveScope(req: Request, options: ScopeOptions): { scopeType?: string; scopeId?: string } {
  if (!options.scopeFrom) return {};
  let scopeId: unknown;
  switch (options.scopeFrom) {
    case "params": scopeId = req.params?.[options.scopeKey!]; break;
    case "body": scopeId = req.body?.[options.scopeKey!]; break;
    case "query": scopeId = req.query?.[options.scopeKey!]; break;
    case "static": scopeId = options.scopeId; break;
    default: scopeId = undefined;
  }
  return scopeId ? { scopeType: options.scopeType || "community", scopeId: String(scopeId) } : {};
}

export = { requirePermission, requireAnyPermission, requireRole, requireSelf };
