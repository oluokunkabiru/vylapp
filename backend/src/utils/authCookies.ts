// ════════════════════════════════════════════════════════════════════════════
//  AUTH COOKIES — httpOnly cookie storage for the web client
//
//  Web auth tokens live in httpOnly cookies (invisible to page JS, so an XSS
//  bug can't exfiltrate the session) instead of the JSON response body. Two
//  httpOnly cookies (access, refresh) plus one non-httpOnly CSRF cookie whose
//  value the frontend must read and echo back as X-CSRF-Token on mutating
//  requests (double-submit pattern — see middleware/csrf.ts) — required
//  because cross-site cookies (SameSite=None, prod frontend/backend are
//  different domains) carry zero CSRF protection on their own.
//
//  The mobile app is untouched by any of this — it authenticates with a
//  Bearer header and its own secure on-device storage (see middleware/auth.ts
//  and sockets/index.ts, both of which fall back to that path).
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import env from "../config/env";
import crypto from "./crypto";

const ACCESS_COOKIE = "vyl_at";
const REFRESH_COOKIE = "vyl_rt";
const CSRF_COOKIE = "vyl_csrf";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function baseCookieOpts() {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    // Prod: frontend (Cloudflare Pages/Fly) and backend (Fly.io) are
    // different domains, so the cookie must be SameSite=None to be sent at
    // all. Dev: Vite proxies /api same-origin, so Lax (and no Secure, since
    // local dev is plain HTTP) works.
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  };
}

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const opts = baseCookieOpts();
  const csrfToken = crypto.randomHex(24);

  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...opts, path: "/", maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...opts, path: "/auth", maxAge: REFRESH_MAX_AGE_MS });
  res.cookie(CSRF_COOKIE, csrfToken, { ...opts, httpOnly: false, path: "/", maxAge: REFRESH_MAX_AGE_MS });
}

// Used by /auth/refresh — only the access token is reissued, refresh/CSRF
// cookies are left as-is (refresh tokens aren't rotated on use).
function setAccessCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookieOpts(), path: "/", maxAge: ACCESS_MAX_AGE_MS });
}

function clearAuthCookies(res: Response) {
  const opts = baseCookieOpts();
  res.clearCookie(ACCESS_COOKIE, { ...opts, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...opts, path: "/auth" });
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false, path: "/" });
}

export = { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, setAuthCookies, setAccessCookie, clearAuthCookies };
