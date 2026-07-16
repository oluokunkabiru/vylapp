// Declaration merging for what middleware/auth.js attaches to every request.
// No runtime code here — safe to exist regardless of whether auth.js itself
// has been converted to TypeScript yet.

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

export {};
