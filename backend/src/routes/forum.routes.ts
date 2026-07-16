// ════════════════════════════════════════════════════════════════════════════
//  FORUM ROUTES  /forum/*
//
//  Security: every POST/PATCH of user content goes through ModerationEngine.
//  Depth limit on replies (max 3) is enforced at the route level, not only
//  in the database CHECK — defence in depth.
//  New threads start with status='pending' and are auto-approved if
//  ModerationEngine gives confidence < 0.5 (safe). If confidence ≥ 0.5
//  and < 0.85, they are queued for human review (visible only to author).
// ════════════════════════════════════════════════════════════════════════════
import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import forumController from "../controllers/forum.controller";

const { authenticate } = authMiddleware;

const router = express.Router();

// ── GET /forum/categories ─────────────────────────────────────────────────────
router.get("/categories", asyncHandler(forumController.listCategories));

// ── GET /forum/categories/:slug/threads ───────────────────────────────────────
router.get("/categories/:slug/threads", asyncHandler(forumController.listThreads));

// ── GET /forum/threads/:id ────────────────────────────────────────────────────
router.get("/threads/:id", asyncHandler(forumController.getThread));

// ── POST /forum/threads ───────────────────────────────────────────────────────
router.post("/threads", authenticate, asyncHandler(forumController.createThread));

// ── POST /forum/threads/:id/replies ───────────────────────────────────────────
router.post("/threads/:id/replies", authenticate, asyncHandler(forumController.createReply));

// ── POST /forum/threads/:id/vote ──────────────────────────────────────────────
router.post("/threads/:id/vote", authenticate, asyncHandler(forumController.voteThread));

// ── POST /forum/replies/:id/vote ──────────────────────────────────────────────
router.post("/replies/:id/vote", authenticate, asyncHandler(forumController.voteReply));

// ── PATCH /forum/threads/:id — Moderator: pin, lock, remove ──────────────────
router.patch("/threads/:id", authenticate, asyncHandler(forumController.patchThread));

// ── DELETE /forum/replies/:id — Author or moderator can soft-delete ───────────
router.delete("/replies/:id", authenticate, asyncHandler(forumController.deleteReply));

export = router;
