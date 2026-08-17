// ════════════════════════════════════════════════════════════════════════════
//  FEATURE FLAG MIDDLEWARE (A-17)
//
//  Gate a route behind a feature_flags row so it can be killed at runtime.
//
//    router.post("/spaces", authenticate, requireFeature("video_spaces", req => !!req.body.isVideo), create);
//
//  The optional `when` predicate lets one route stay open in general but
//  gate a specific sub-behaviour (e.g. only the video-Space branch of
//  Spaces creation, not Spaces creation itself).
// ════════════════════════════════════════════════════════════════════════════
import { Request, Response, NextFunction, RequestHandler } from "express";
import respond from "../utils/respond";
import featureFlags from "../services/featureFlags.service";

const { fail } = respond;

function requireFeature(key: string, when?: (req: Request) => boolean): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (when && !when(req)) return next();
    const enabled = await featureFlags.isEnabled(key, req.user?.id);
    if (!enabled) return fail(res, 503, "This feature is temporarily unavailable");
    next();
  };
}

export = { requireFeature };
