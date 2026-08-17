// ════════════════════════════════════════════════════════════════════════════
//  FEATURE FLAGS SERVICE (A-17 — runtime feature control)
//
//  Lets ops disable a capability instantly, without an app-store release,
//  by flipping a row in feature_flags. Short in-memory cache so a hot path
//  isn't doing a DB round trip per request; a disable still takes effect
//  within CACHE_TTL_MS everywhere.
//
//  Rollout is deterministic per user (hash of userId + flag key), so a
//  given user sees a consistent on/off state instead of flapping between
//  requests, and per-user overrides (user_feature_flags) always win.
// ════════════════════════════════════════════════════════════════════════════
import crypto from "crypto";
import prisma from "../config/prisma";

const CACHE_TTL_MS = 15_000;

interface FlagRow {
  id: string;
  enabled: boolean;
  rolloutPct: number;
}

let cache: Map<string, FlagRow> | null = null;
let cacheLoadedAt = 0;

async function loadFlags(): Promise<Map<string, FlagRow>> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;

  const rows = await prisma.featureFlags.findMany({ select: { id: true, key: true, enabled: true, rolloutPct: true } });
  const next = new Map<string, FlagRow>();
  for (const row of rows) next.set(row.key, { id: row.id, enabled: row.enabled, rolloutPct: row.rolloutPct });
  cache = next;
  cacheLoadedAt = now;
  return next;
}

function bucketOf(userId: string, key: string): number {
  const hash = crypto.createHash("sha1").update(`${key}:${userId}`).digest();
  return hash.readUInt32BE(0) % 100;
}

// Unknown flags fail closed (disabled) — a typo'd key should never silently
// mean "on for everyone".
async function isEnabled(key: string, userId?: string): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.get(key);
  if (!flag) return false;

  if (userId) {
    const override = await prisma.userFeatureFlags.findUnique({
      where: { userId_flagId: { userId, flagId: flag.id } },
      select: { enabled: true },
    }).catch(() => null);
    if (override) return override.enabled;
  }

  if (!flag.enabled) return false;
  if (flag.rolloutPct >= 100) return true;
  if (flag.rolloutPct <= 0) return false;
  if (!userId) return false; // no stable bucket to assign — treat as not-yet-rolled-out
  return bucketOf(userId, key) < flag.rolloutPct;
}

// Call after an admin edits a flag so the change is visible immediately
// instead of waiting out CACHE_TTL_MS.
function invalidate(): void {
  cache = null;
}

export = { isEnabled, invalidate };
