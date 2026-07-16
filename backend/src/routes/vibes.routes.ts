import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import vibesController from "../controllers/vibes.controller";

const { requireAuth, optionalAuth } = authMiddleware;
const { requirePermission, requireAnyPermission } = rbacMiddleware;

const router = express.Router();

// ── GET /vibes/feed — personalized home feed ─────────────────────────────
router.get("/feed", optionalAuth, asyncHandler(vibesController.feed));

// ── GET /vibes/category/:category — category feed (Explore filter chips) ─
router.get("/category/:category", optionalAuth, asyncHandler(vibesController.categoryFeed));

// ── GET /vibes/:id — single vibe + its replies (comments) ───────────────
router.get("/:id", optionalAuth, asyncHandler(vibesController.getOne));

// ── POST /vibes — create a vibe (post / reply / quote) ───────────────────
router.post("/", requireAuth, requirePermission("vibes.create"), asyncHandler(vibesController.create));

// ── DELETE /vibes/:id ──────────────────────────────────────────────────────
router.delete("/:id", requireAuth, requireAnyPermission("vibes.delete.own", "vibes.delete.any"), asyncHandler(vibesController.remove));

// ── POST /vibes/:id/like  &  DELETE /vibes/:id/like ──────────────────────
router.post("/:id/like", requireAuth, asyncHandler(vibesController.like));
router.delete("/:id/like", requireAuth, asyncHandler(vibesController.unlike));

// ── POST /vibes/:id/repost  &  DELETE ─────────────────────────────────────
router.post("/:id/repost", requireAuth, asyncHandler(vibesController.repost));
router.delete("/:id/repost", requireAuth, asyncHandler(vibesController.unrepost));

// ── POST /vibes/:id/bookmark  &  DELETE ───────────────────────────────────
router.post("/:id/bookmark", requireAuth, asyncHandler(vibesController.bookmark));
router.delete("/:id/bookmark", requireAuth, asyncHandler(vibesController.unbookmark));

// ── GET /vibes/me/bookmarks ────────────────────────────────────────────────
router.get("/me/bookmarks", requireAuth, asyncHandler(vibesController.myBookmarks));

export = { router, shapeVibe: vibesController.shapeVibe, VIBE_FIELDS: vibesController.VIBE_FIELDS };
