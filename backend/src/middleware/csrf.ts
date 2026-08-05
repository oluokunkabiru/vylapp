// ════════════════════════════════════════════════════════════════════════════
//  CSRF — double-submit cookie check
//
//  Only applies to requests riding on the vyl_at/vyl_rt cookie session (the
//  web client). Bearer-header requests (mobile app, or any future non-browser
//  API client) have no ambient cookie credential for a forged cross-site
//  request to exploit, so they're exempt.
//
//  /auth/refresh is also exempt — deliberately, not an oversight. It's the
//  one cookie-mutating endpoint the frontend calls before it can possibly
//  have a CSRF token in hand: on a fresh page load with an already-expired
//  access token, the very first thing that happens is GET /auth/me → 401 →
//  POST /auth/refresh, with zero chance to have fetched a token yet (there's
//  no request before this one to have carried it). Requiring the header here
//  would make that recovery path permanently fail every time. It's safe to
//  exempt: refreshing merely reissues an httpOnly access-token cookie that
//  a forging site can't read or otherwise benefit from, so there's nothing
//  here for CSRF to actually protect against.
// ════════════════════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from "express";
import respond from "../utils/respond";
import authCookies from "../utils/authCookies";

const { fail } = respond;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/auth/refresh"]);

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();

  const cookies = req.cookies || {};
  const hasCookieSession = Boolean(cookies[authCookies.ACCESS_COOKIE] || cookies[authCookies.REFRESH_COOKIE]);
  if (!hasCookieSession) return next();

  const cookieToken = cookies[authCookies.CSRF_COOKIE];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return fail(res, 403, "CSRF token missing or invalid");
  }
  next();
}

export = csrfProtection;
