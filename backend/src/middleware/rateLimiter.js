// ════════════════════════════════════════════════════════════════════════════
//  SERVER-SIDE RATE LIMITER
//
//  Sliding-window algorithm. In-memory store works for a single instance.
//  For multi-instance deployment (Fly.io auto-scaling), replace the
//  in-memory store with a Redis backend by swapping the store object —
//  the rate limiter API does not change.
//
//  Why not express-rate-limit? It's a fine package but it introduces a
//  dependency for something we can own completely in ~80 lines. More
//  importantly, express-rate-limit's default fixed-window algorithm has
//  a known boundary exploit: a user can make 2× the limit in the 2-second
//  window around each reset. The sliding window used here does not have
//  that vulnerability.
//
//  LIMITS (per IP, per route group):
//    /auth/login, /auth/register   →  10/min  (brute force prevention)
//    /translate                    →  30/min  (AI API cost control)
//    /autopilot/run                →  5/min   (AI API cost control)
//    /vibes POST                   →  60/hour (content spam prevention)
//    /spaces POST                  →  10/hour (resource creation limit)
//    /moderation/reports           →  20/min  (report spam prevention)
//    Everything else               →  300/min (generous default)
//
//  Identity: requests are keyed on the authenticated user ID when available,
//  falling back to IP. User-keyed limits prevent sharing IPs (corporate NAT,
//  VPN) from being punished for one bad actor. IP-keyed limits still protect
//  unauthenticated routes (login, register).
// ════════════════════════════════════════════════════════════════════════════

const WINDOW_MS   = 60_000;   // Default window: 1 minute
const HOUR_MS     = 3_600_000;

// In-memory sliding window store. Each entry: array of timestamp integers.
const store = new Map();

// Prune entries older than the window to keep memory bounded.
// Called lazily on each check — no background timer needed.
function prune(key, windowMs) {
  const now = Date.now();
  const entries = store.get(key) || [];
  const fresh = entries.filter(ts => now - ts < windowMs);
  if (fresh.length === 0) store.delete(key);
  else store.set(key, fresh);
  return fresh;
}

function count(key, windowMs) {
  return prune(key, windowMs).length;
}

function record(key, windowMs) {
  const fresh = prune(key, windowMs);
  fresh.push(Date.now());
  store.set(key, fresh);
}

function resetAfterMs(key, windowMs) {
  const entries = store.get(key) || [];
  if (!entries.length) return 0;
  return Math.max(0, windowMs - (Date.now() - entries[0]));
}

// ── Rate limit configs per route pattern ──────────────────────────────────────
const ROUTE_LIMITS = [
  // path prefix, method ('*' = all), limit, windowMs, description
  { prefix: "/auth/login",    method: "*", limit: 10,  window: WINDOW_MS,  desc: "Login brute-force guard"  },
  { prefix: "/auth/register", method: "*", limit: 10,  window: WINDOW_MS,  desc: "Register spam guard"      },
  { prefix: "/auth/2fa",      method: "*", limit: 10,  window: WINDOW_MS,  desc: "2FA brute-force guard"    },
  { prefix: "/translate",     method: "*", limit: 30,  window: WINDOW_MS,  desc: "Translation AI cost"      },
  { prefix: "/autopilot/run", method: "*", limit: 5,   window: WINDOW_MS,  desc: "Autopilot AI cost"        },
  { prefix: "/vibes",         method: "POST", limit: 60, window: HOUR_MS,  desc: "Vibe creation spam"       },
  { prefix: "/spaces",        method: "POST", limit: 10, window: HOUR_MS,  desc: "Space creation limit"     },
  { prefix: "/moderation",    method: "*", limit: 20,  window: WINDOW_MS,  desc: "Report spam guard"        },
  { prefix: "/creator",       method: "POST", limit: 30, window: HOUR_MS,  desc: "Creator action limit"     },
];

const DEFAULT_LIMIT  = 300;
const DEFAULT_WINDOW = WINDOW_MS;

function resolveLimit(path, method) {
  for (const rule of ROUTE_LIMITS) {
    if (path.startsWith(rule.prefix) &&
        (rule.method === "*" || rule.method === method.toUpperCase())) {
      return { limit: rule.limit, window: rule.window, desc: rule.desc };
    }
  }
  return { limit: DEFAULT_LIMIT, window: DEFAULT_WINDOW, desc: "Default limit" };
}

// ── Middleware factory ─────────────────────────────────────────────────────────
function rateLimiter(options = {}) {
  return function rateLimit(req, res, next) {
    // Identity: authenticated user ID preferred, IP fallback.
    // Never trust X-Forwarded-For without a reverse-proxy trust config.
    const identity = req.user?.id || req.ip || "unknown";
    const { limit, window: windowMs } = resolveLimit(req.path, req.method);
    const key = `rl:${req.method}:${req.path.split("/").slice(0, 3).join("/")}:${identity}`;

    const current = count(key, windowMs);
    const remaining = Math.max(0, limit - current);
    const resetMs   = resetAfterMs(key, windowMs);

    // Always set rate limit headers (follows RFC 6585 / draft-ietf-httpapi-ratelimit-headers)
    res.set({
      "X-RateLimit-Limit":     String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset":     String(Math.ceil(resetMs / 1000)),
    });

    if (current >= limit) {
      return res.status(429).json({
        ok: false,
        error: {
          message: "Too many requests. Please slow down.",
          retryAfterSeconds: Math.ceil(resetMs / 1000),
        },
      });
    }

    record(key, windowMs);
    next();
  };
}

// ── Periodic memory cleanup ───────────────────────────────────────────────────
// Remove expired entries every 5 minutes to prevent unbounded memory growth.
// This is safe: expired entries only cause a brief re-allocation on next check.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entries] of store.entries()) {
      // Use the longest possible window (1 hour) as the max TTL
      const fresh = entries.filter(ts => now - ts < HOUR_MS);
      if (fresh.length === 0) store.delete(key);
      else store.set(key, fresh);
    }
  }, 5 * 60_000).unref(); // .unref() so it doesn't prevent process exit
}

module.exports = rateLimiter;
