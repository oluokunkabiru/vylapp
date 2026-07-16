import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route handler so thrown errors/rejected promises reach
// the error middleware instead of crashing the process.
//
// Generic over the Request subtype so controllers typed against AuthedRequest
// (routes mounted behind requireAuth) can be passed directly — the handler
// itself is only ever invoked with real Express Request objects at runtime,
// this generic just lets each controller assert the narrower shape it
// actually relies on (req.user, etc.) without an explicit cast at every call site.
function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req as Req, res, next)).catch(next);
}

export = asyncHandler;
