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
  // NODE_ENV was incorrectly left as development on the live API. That made
  // an HTTPS frontend on vylapp.com receive SameSite=Lax cookies from the
  // different miglomicrofix.com.ng site; browsers then withheld every cookie
  // from API calls and every protected endpoint returned 401. A concrete
  // HTTPS client origin is independently sufficient evidence that this is a
  // cross-site web deployment, so do not rely solely on NODE_ENV here.
  const crossSiteHttpsClient = env.clientOrigins.some(origin => {
    try { return new URL(origin).protocol === "https:"; } catch { return false; }
  });
  const isProd = env.nodeEnv === "production" || crossSiteHttpsClient;
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

// Returns the generated CSRF token so callers can also hand it back in the
// JSON response body (see auth.controller.ts) — required in production,
// where frontend and backend are different origins: document.cookie can
// never read a cookie set by a different origin no matter its flags, so
// the double-submit pattern needs the token available some other way for
// the frontend to echo back as X-CSRF-Token.
// BUG FOUND LIVE (real browser session, not curl): the refresh cookie used
// to be scoped to path=/auth. That's correct only when the browser's
// request URL for the refresh call is literally /auth/refresh — true in
// production (frontend calls the backend directly), but false in local dev,
// where Vite's proxy means the browser-visible request path is
// /api/auth/refresh. Cookie path-matching happens client-side against the
// visible URL, before any server-side proxy rewrite, so the browser
// correctly (per spec) withheld the cookie — "Missing refresh token" on
// every /auth/refresh call in dev, meaning silent refresh silently never
// worked locally and every session force-logged-out after 15 minutes.
// path=/ (matching the access/CSRF cookies already) fixes it in both
// environments; the httpOnly flag is what actually protects the token, not
// this path scope, so there's no security loss.
function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): string {
  const opts = baseCookieOpts();
  const csrfToken = crypto.randomHex(24);

  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...opts, path: "/", maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...opts, path: "/", maxAge: REFRESH_MAX_AGE_MS });
  res.cookie(CSRF_COOKIE, csrfToken, { ...opts, httpOnly: false, path: "/", maxAge: REFRESH_MAX_AGE_MS });
  return csrfToken;
}

// Used by /auth/refresh — only the access token is reissued, refresh/CSRF
// cookies are left as-is (refresh tokens aren't rotated on use).
function setAccessCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookieOpts(), path: "/", maxAge: ACCESS_MAX_AGE_MS });
}

function clearAuthCookies(res: Response) {
  // clearCookie only removes a cookie whose stored path matches exactly —
  // must mirror setAuthCookies' path for every cookie, or logout silently
  // fails to clear it (the same class of bug this file just fixed above).
  const opts = baseCookieOpts();
  res.clearCookie(ACCESS_COOKIE, { ...opts, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...opts, path: "/" });
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false, path: "/" });
}

export = { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, setAuthCookies, setAccessCookie, clearAuthCookies };
