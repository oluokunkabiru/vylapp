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

const TTL_MS = 5 * 60 * 1000; // 5 minutes

class PermissionCache {
  constructor() {
    this._store = new Map();
    // Cleanup every 10 minutes — removes expired entries to bound memory
    if (typeof setInterval !== "undefined") {
      setInterval(() => this._evict(), 10 * 60 * 1000).unref();
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  set(userId, entry) {
    this._store.set(userId, {
      roles:       entry.roles,       // string[]
      permissions: entry.permissions, // Set<string>
      expires:     Date.now() + TTL_MS,
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  get(userId) {
    const entry = this._store.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this._store.delete(userId);
      return null;
    }
    return entry;
  }

  has(userId) {
    return !!this.get(userId); // respects TTL
  }

  // ── Invalidation ──────────────────────────────────────────────────────────
  // Called whenever a user's roles or permissions change.
  invalidate(userId) {
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
  _evict() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expires) this._store.delete(key);
    }
  }
}

// Export as singleton
module.exports = new PermissionCache();
