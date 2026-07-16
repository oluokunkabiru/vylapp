// Colocated declaration for the still-JS auth.js (Batch D — converted last,
// it's the highest fan-in / most security-critical file in the migration).
// TS prefers a same-name .d.ts over structural inference of the .js file,
// which otherwise misses the module.exports.requireAuth = ... style aliases
// assigned after the initial `module.exports = {...}` object literal.
import { RequestHandler } from "express";

interface AuthMiddleware {
  authenticate: RequestHandler;
  optionalAuth: RequestHandler;
  requireAdmin: RequestHandler;
  requireAuth: RequestHandler;
}

declare const authMiddleware: AuthMiddleware;
export = authMiddleware;
