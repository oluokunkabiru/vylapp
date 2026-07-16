// ════════════════════════════════════════════════════════════════════════════
//  PERMISSION CACHE
//
//  In-memory cache of resolved permissions per user.
//  Avoids DB queries on every authenticated request.
//
//  TTL: 5 minutes. After that, the next request re-fetches from DB.
//  Explicit invalidation: called on every role/permission change.
//
//  Single instance — imported as a singleton.
//
//  Thread safety note: Node.js is single-threaded. Map operations are
//  atomic. No mutex needed.
//
//  For multi-instance deployments (Fly.io horizontal scaling):
//  Replace the Map store with a Redis client. The interface stays identical.
//  All methods remain async to make that swap transparent.
// ════════════════════════════════════════════════════════════════════════════

// Mixing a runtime `export =` with any other top-level `export` (even a
// type-only `export interface`) compiles fine under tsc but breaks esbuild's
// CJS transform (used by tsx) at runtime — hence importing the shape from
// types/express.d.ts (identical to ResolvedPermissions) instead of defining
// and exporting an interface in this file.
import { ResolvedPermissions } from "../types/express";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = ResolvedPermissions;

interface StoredEntry extends CacheEntry {
  expires: number;
}

class PermissionCache {
  private _store: Map<string, StoredEntry> = new Map();

  constructor() {
    // Cleanup every 10 minutes — removes expired entries to bound memory
    if (typeof setInterval !== "undefined") {
      setInterval(() => this._evict(), 10 * 60 * 1000).unref();
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  set(userId: string, entry: CacheEntry) {
    this._store.set(userId, {
      roles: entry.roles,
      permissions: entry.permissions,
      // Bug fixed here: this previously dropped scopedPermissions when
      // storing, so any cache hit (i.e. most requests, given the 5-minute
      // TTL) would silently lose community-scoped permission checks —
      // _checkPermission's `resolved.scopedPermissions` guard just treated
      // the missing field as "no scoped grants" rather than throwing.
      // Currently dead in practice (grepped — nothing in the app calls
      // req.can(perm, {scope, scopeId}) yet; forum moderation uses a
      // separate community_moderators table check instead), but wrong
      // regardless, and this is the exact file being converted right now.
      scopedPermissions: entry.scopedPermissions,
      expires: Date.now() + TTL_MS,
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  get(userId: string): StoredEntry | null {
    const entry = this._store.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this._store.delete(userId);
      return null;
    }
    return entry;
  }

  has(userId: string): boolean {
    return !!this.get(userId); // respects TTL
  }

  // ── Invalidation ──────────────────────────────────────────────────────────
  // Called whenever a user's roles or permissions change.
  invalidate(userId: string) {
    this._store.delete(userId);
  }

  // Called when a role's permissions change — affects all users with that role.
  // Rather than tracking which users have which roles (complex), we clear all.
  // 5-minute TTL means this is a brief performance hit, not a correctness risk.
  invalidateAll() {
    this._store.clear();
  }

  // ── Stats (useful for health endpoint) ───────────────────────────────────
  stats() {
    const now = Date.now();
    let active = 0;
    for (const entry of this._store.values()) {
      if (now <= entry.expires) active++;
    }
    return { total: this._store.size, active };
  }

  // ── Internal ──────────────────────────────────────────────────────────────
  private _evict() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expires) this._store.delete(key);
    }
  }
}

// Export as singleton
const permissionCache = new PermissionCache();
export = permissionCache;
