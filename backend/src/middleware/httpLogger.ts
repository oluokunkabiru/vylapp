/**
 * httpLogger.ts — Express middleware that logs every HTTP request in
 * Laravel's style:
 *
 *   [2026-07-12 19:48:41] vylapp.INFO: POST /auth/login → 200 (34ms)
 *   [2026-07-12 19:48:41] vylapp.WARNING: GET /users/999 → 404 (8ms)
 *   [2026-07-12 19:48:41] vylapp.ERROR: POST /vibes → 500 (21ms) {"body":{...}}
 *
 * It also captures request bodies on 4xx/5xx responses so you can
 * see exactly what payload triggered the error — without logging every
 * body on every successful request (which would flood the logs).
 *
 * Usage in app.ts:
 *   import httpLogger from "./middleware/httpLogger";
 *   app.use(httpLogger);
 */

import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Paths to skip logging entirely (health checks, etc.)
const SKIP_PATHS = new Set(["/health", "/favicon.ico"]);

function httpLogger(req: Request, res: Response, next: NextFunction) {
  if (SKIP_PATHS.has(req.path)) return next();

  const start = Date.now();

  // Capture the original json() method so we can intercept the response body
  const originalJson = res.json.bind(res);
  let responseBody: unknown;

  res.json = function (body?: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    const context: { request?: unknown; response?: unknown } = {};

    // Always log request body on errors so you can see what caused it
    if (status >= 400 && req.body && Object.keys(req.body).length > 0) {
      context.request = req.body;
    }

    // Always attach response body on errors
    if (status >= 400 && responseBody !== undefined) {
      context.response = responseBody;
    }

    logger.http({
      method,
      url,
      status,
      ms,
      body: context.request,
      response: context.response,
    });
  });

  next();
}

export = httpLogger;
