/**
 * logger.js — Laravel-style structured logger for Vylapp backend
 *
 * Output format (mirrors Laravel):
 *   [YYYY-MM-DD HH:MM:SS] vylapp.INFO: Message {"key":"value"}
 *   [YYYY-MM-DD HH:MM:SS] vylapp.ERROR: Something failed {"error":"..."}
 *
 * Log files are written to  storage/logs/vylapp-YYYY-MM-DD.log
 * and also printed to stdout with ANSI colours (stripped in files).
 *
 * Usage:
 *   const logger = require("../utils/logger");
 *
 *   logger.info("User registered", { userId: 1, email: "a@b.com" });
 *   logger.warn("Slow query", { ms: 412, query: "SELECT ..." });
 *   logger.error("DB connection failed", { error: err.message });
 *   logger.debug("Payload received", req.body);   // only printed in development
 */

const fs   = require("fs");
const path = require("path");
const env  = require("../config/env");

// ── Paths ──────────────────────────────────────────────────────────────────────
// Stored inside the container/project under  backend/storage/logs/
const LOG_DIR = path.resolve(__dirname, "../../storage/logs");

// Make sure the directory exists on boot (sync is fine here — runs once)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── ANSI colour helpers (console only) ────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  dim:    "\x1b[2m",
  bold:   "\x1b[1m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  magenta:"\x1b[35m",
  blue:   "\x1b[34m",
  white:  "\x1b[37m",
};

const LEVEL_COLOUR = {
  DEBUG:   C.blue,
  INFO:    C.green,
  WARNING: C.yellow,
  ERROR:   C.red,
  CRITICAL:C.magenta,
};

// ── Timestamp helper ───────────────────────────────────────────────────────────
/**
 * Returns  "YYYY-MM-DD HH:MM:SS"  in local time — same as Laravel's default.
 */
function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  const Y  = now.getFullYear();
  const M  = pad(now.getMonth() + 1);
  const D  = pad(now.getDate());
  const h  = pad(now.getHours());
  const m  = pad(now.getMinutes());
  const s  = pad(now.getSeconds());

  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

/** Returns  "YYYY-MM-DD"  for the daily log file name. */
function dateStamp() {
  return timestamp().slice(0, 10);
}

// ── Core write function ────────────────────────────────────────────────────────
/**
 * @param {"DEBUG"|"INFO"|"WARNING"|"ERROR"|"CRITICAL"} level
 * @param {string}  message
 * @param {object}  [context]   Any extra key/value data to attach
 */
function write(level, message, context) {
  const ts       = timestamp();
  const channel  = "vylapp";

  // ── Serialise context ──────────────────────────────────────────────────────
  let ctxStr = "";
  if (context !== undefined && context !== null) {
    try {
      ctxStr = " " + JSON.stringify(context, _safeReplacer(), 2);
    } catch {
      ctxStr = " [unserializable context]";
    }
  }

  // ── Plain text line (for file) ─────────────────────────────────────────────
  const fileLine = `[${ts}] ${channel}.${level}: ${message}${ctxStr}\n`;

  // ── Coloured line (for console) ────────────────────────────────────────────
  const colour    = LEVEL_COLOUR[level] || C.white;
  const consoleLine =
    `${C.dim}[${ts}]${C.reset} ` +
    `${colour}${C.bold}${channel}.${level}${C.reset}: ` +
    `${C.white}${message}${C.reset}` +
    (ctxStr ? `${C.dim}${ctxStr}${C.reset}` : "");

  // ── Write to console ───────────────────────────────────────────────────────
  if (level === "ERROR" || level === "CRITICAL") {
    process.stderr.write(consoleLine + "\n");
  } else if (level === "DEBUG" && env.nodeEnv === "production") {
    // Suppress DEBUG in production console — still written to file
  } else {
    process.stdout.write(consoleLine + "\n");
  }

  // ── Append to daily log file ───────────────────────────────────────────────
  const logFile = path.join(LOG_DIR, `vylapp-${dateStamp()}.log`);
  fs.appendFile(logFile, fileLine, (err) => {
    if (err) process.stderr.write(`[logger] Failed to write log file: ${err.message}\n`);
  });
}

// ── Replacer to handle circular refs & strip sensitive keys ───────────────────
const REDACTED_KEYS = new Set(["password", "token", "secret", "authorization", "cookie"]);

function _safeReplacer() {
  const seen = new WeakSet();
  return function (key, value) {
    if (REDACTED_KEYS.has(key.toLowerCase())) return "[REDACTED]";
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────
const logger = {
  debug   : (msg, ctx) => write("DEBUG",    msg, ctx),
  info    : (msg, ctx) => write("INFO",     msg, ctx),
  warn    : (msg, ctx) => write("WARNING",  msg, ctx),
  error   : (msg, ctx) => write("ERROR",    msg, ctx),
  critical: (msg, ctx) => write("CRITICAL", msg, ctx),

  /**
   * Log a full HTTP request + response payload pair.
   * Useful for debugging API calls end-to-end.
   *
   * @param {object} opts
   * @param {string} opts.method
   * @param {string} opts.url
   * @param {number} opts.status
   * @param {number} opts.ms          Response time in milliseconds
   * @param {object} [opts.body]      Request body
   * @param {object} [opts.response]  Response payload
   */
  http(opts) {
    const { method, url, status, ms, body, response } = opts;
    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARNING" : "INFO";
    write(level, `${method} ${url} → ${status} (${ms}ms)`, {
      request:  body     || undefined,
      response: response || undefined,
    });
  },
};

module.exports = logger;
