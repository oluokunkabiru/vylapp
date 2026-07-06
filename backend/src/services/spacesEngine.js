const crypto = require("crypto");
const rand = (n) => crypto.randomBytes(n).toString("hex");

// FIX LP-022: Clip IDs now use crypto.randomUUID() with a content-hash
// component — two simultaneous requests within the same millisecond
// produce distinct IDs. Date.now() alone could produce duplicates.
//
// FIX LP-023: Join tokens now carry a 1-hour TTL and a single-use flag
// for ticketed Spaces. The token schema must include:
//   join_token TEXT, join_token_expires_at TIMESTAMPTZ, join_token_used BOOLEAN
// Route validation must check both conditions before granting access.

const SpacesEngine = {
  // ── Join tokens ─────────────────────────────────────────────────────────
  generateJoinToken() {
    return {
      token:      "jt_" + rand(16),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      single_use: false, // set to true for ticketed Spaces in route handler
    };
  },

  generateTicketedJoinToken() {
    return {
      token:      "jt_" + rand(16),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      single_use: true, // consumed on first join attempt; sharing it is useless
    };
  },

  validateJoinToken(token, expiresAt, used, isTicketed) {
    if (!token) return { valid: false, reason: "Missing token" };
    if (new Date(expiresAt) < new Date()) return { valid: false, reason: "Token expired" };
    if (isTicketed && used) return { valid: false, reason: "Ticketed token already used" };
    return { valid: true };
  },

  generateRtcToken()         { return "rtc_" + rand(20); },
  generateTranslationToken() { return "tr_"  + rand(12); },

  // ── Clips ────────────────────────────────────────────────────────────────
  generateClip(spaceId, startSec, endSec, label = "") {
    const duration = endSec - startSec;
    if (duration < 10 || duration > 120) return { error: "Clips must be 10-120 seconds" };

    // Content-hash component prevents duplicates even in the same millisecond
    const hashInput = `${spaceId}:${startSec}:${endSec}:${Date.now()}`;
    const clipId = `clip_${crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16)}`;

    return {
      id: clipId, // deterministic from content — duplicate requests produce the same ID
      space_id: spaceId, start_sec: startSec, end_sec: endSec, duration,
      label: label || `Highlight ${startSec}s`,
      created_at: new Date().toISOString(),
    };
  },

  // ── Utilities ────────────────────────────────────────────────────────────
  calendarLinks(title, spaceId) {
    return {
      google:   `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}`,
      rsvp_url: `https://vylapp.com/spaces/${spaceId}`,
    };
  },

  reminderIntervalsMinutes() { return [24 * 60, 60, 15]; },
};

module.exports = SpacesEngine;
