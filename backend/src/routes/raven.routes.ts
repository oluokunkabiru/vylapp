import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import ravenController from "../controllers/raven.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── GET /raven/me ─────────────────────────────────────────────────────────
router.get("/me", asyncHandler(ravenController.me));

// ── GET /raven/leaderboard ────────────────────────────────────────────────
router.get("/leaderboard", asyncHandler(ravenController.leaderboard));

// Extra properties attached directly to the exported router — creator.routes
// imports isBoosted this way (`const { isBoosted } = require("./raven.routes")`).
export = Object.assign(router, {
  computePoints: ravenController.computePoints,
  isBoosted: ravenController.isBoosted,
});
