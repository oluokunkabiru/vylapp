import { Response } from "express";

// Tiny consistent response shapes so the frontend never has to guess.
function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function fail(res: Response, status: number, message: string, details?: unknown) {
  return res.status(status).json({ ok: false, error: { message, details: details || undefined } });
}
export = { ok, fail };
