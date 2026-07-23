// ════════════════════════════════════════════════════════════════════════════
//  CSRF — double-submit cookie check
//
//  Only applies to requests riding on the vyl_at/vyl_rt cookie session (the
//  web client). Bearer-header requests (mobile app, or any future non-browser
//  API client) have no ambient cookie credential for a forged cross-site
//  request to exploit, so they're exempt.
// ════════════════════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from "express";
import respond from "../utils/respond";
import authCookies from "../utils/authCookies";

const { fail } = respond;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

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
