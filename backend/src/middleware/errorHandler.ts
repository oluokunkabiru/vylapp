import { Request, Response, NextFunction } from "express";
import respond from "../utils/respond";
import logger from "../utils/logger";

const { fail } = respond;

class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req: Request, res: Response) {
  return fail(res, 404, `No route for ${req.method} ${req.originalUrl}`);
}

function errorHandler(err: any, req: Request, res: Response, next: NextFunction) { // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
  const status = err.status || 500;
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
      status,
      stack: err.stack,
      body:  req.body,
    });
  }
  return fail(res, status, err.message || "Internal server error", err.details);
}

export = { ApiError, notFound, errorHandler };
