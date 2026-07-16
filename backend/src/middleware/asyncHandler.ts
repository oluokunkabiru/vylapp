import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route handler so thrown errors/rejected promises reach
// the error middleware instead of crashing the process.
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export = asyncHandler;
