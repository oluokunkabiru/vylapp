import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import spacesController from "../controllers/spaces.controller";

const { requireAuth, optionalAuth } = authMiddleware;

const router = express.Router();

// ── GET /spaces — live + upcoming ─────────────────────────────────────────
router.get("/", optionalAuth, asyncHandler(spacesController.list));

// ── POST /spaces — create / schedule ─────────────────────────────────────
router.post("/", requireAuth, asyncHandler(spacesController.create));

// ── POST /spaces/:id/start ────────────────────────────────────────────────
router.post("/:id/start", requireAuth, asyncHandler(spacesController.start));

// ── POST /spaces/:id/end ─────────────────────────────────────────────────
router.post("/:id/end", requireAuth, asyncHandler(spacesController.end));

// ── POST /spaces/:id/join ────────────────────────────────────────────────
router.post("/:id/join", requireAuth, asyncHandler(spacesController.join));

// ── POST /spaces/:id/leave ───────────────────────────────────────────────
router.post("/:id/leave", requireAuth, asyncHandler(spacesController.leave));

// ── POST /spaces/:id/remind ──────────────────────────────────────────────
router.post("/:id/remind", requireAuth, asyncHandler(spacesController.remind));

// ── POST /spaces/:id/tip ─────────────────────────────────────────────────
router.post("/:id/tip", requireAuth, asyncHandler(spacesController.tip));

export = { router, shapeSpace: spacesController.shapeSpace };
