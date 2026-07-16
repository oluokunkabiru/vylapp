import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import searchController from "../controllers/search.controller";

const { optionalAuth, requireAuth } = authMiddleware;

const router = express.Router();

// ── GET /search?q=...&type=all|users|vibes|hashtags ──────────────────────
router.get("/", optionalAuth, asyncHandler(searchController.search));

// ── GET /search/autocomplete?q=... ───────────────────────────────────────
router.get("/autocomplete", asyncHandler(searchController.autocomplete));

// ── GET /trending/topics?region=Global&category=... ─────────────────────
router.get("/trending/topics", asyncHandler(searchController.trendingTopics));

// ── GET /explore/topics ──────────────────────────────────────────────────
router.get("/explore/topics", asyncHandler(searchController.listTopics));

// ── POST /explore/topics/:id/join ────────────────────────────────────────
router.post("/explore/topics/:id/join", requireAuth, asyncHandler(searchController.joinTopic));

export = router;
