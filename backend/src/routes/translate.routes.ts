import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import translateController from "../controllers/translate.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();

// ── GET /translate/languages ──────────────────────────────────────────────
router.get("/languages", translateController.listLanguages);

// ── POST /translate — translate arbitrary text (caption, comment, DM) ────
router.post("/", requireAuth, asyncHandler(translateController.translateText));

// ── POST /translate/vibes/:id — translate a specific vibe's caption ──────
router.post("/vibes/:id", requireAuth, asyncHandler(translateController.translateVibe));

export = router;
