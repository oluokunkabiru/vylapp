// Declaration merging for what middleware/auth.js attaches to every request.
// No runtime code here — safe to exist regardless of whether auth.js itself
// has been converted to TypeScript yet.

import { Request } from "express";

export interface AuthUser {
  id: string;
  handle: string;
  displayName: string;
}

export interface ResolvedPermissions {
  roles: string[];
  permissions: Set<string>;
  scopedPermissions: Map<string, Set<string>>;
}

export interface CanOptions {
  scope?: string;
  scopeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      userPermissions?: ResolvedPermissions | null;
      can?: (perm: string, opts?: CanOptions) => boolean;
      hasRole?: (role: string) => boolean;
      hasAnyRole?: (...roles: (string | string[])[]) => boolean;
    }
  }
}

// Convenience type for handlers mounted behind requireAuth, where req.user
// is guaranteed present rather than optional. Use plain Request for routes
// reachable without auth (optionalAuth, public GETs).
export interface AuthedRequest extends Request {
  user: AuthUser;
  userPermissions: ResolvedPermissions;
  can: (perm: string, opts?: CanOptions) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: (string | string[])[]) => boolean;
}

export {};
