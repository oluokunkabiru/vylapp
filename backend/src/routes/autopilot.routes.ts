import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import autopilotController from "../controllers/autopilot.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── GET /autopilot/config ────────────────────────────────────────────────
router.get("/config", asyncHandler(autopilotController.getConfig));

// ── PUT /autopilot/config ────────────────────────────────────────────────
router.put("/config", asyncHandler(autopilotController.putConfig));

// ── POST /autopilot/run — generate + publish posts for this user ─────────
router.post("/run", asyncHandler(autopilotController.run));

// ── GET /autopilot/runs — run history ────────────────────────────────────
router.get("/runs", asyncHandler(autopilotController.listRuns));

export = router;
