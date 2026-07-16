import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import usersController from "../controllers/users.controller";

const { requireAuth, optionalAuth } = authMiddleware;

const router = express.Router();

// ── GET /users/discover — diaspora discovery by current/heritage country ─
// Registered before /:handle so "discover" isn't swallowed as a handle lookup.
router.get("/discover", requireAuth, asyncHandler(usersController.discover));

// ── GET /users/:handle ───────────────────────────────────────────────────
router.get("/:handle", optionalAuth, asyncHandler(usersController.getByHandle));

// ── PATCH /users/me ──────────────────────────────────────────────────────
router.patch("/me", requireAuth, asyncHandler(usersController.updateMe));

// ── POST /users/:id/connect (follow) ─────────────────────────────────────
router.post("/:id/connect", requireAuth, asyncHandler(usersController.connect));

// ── DELETE /users/:id/connect (unfollow) ─────────────────────────────────
router.delete("/:id/connect", requireAuth, asyncHandler(usersController.disconnect));

// ── GET /users/:id/connections (followers) ───────────────────────────────
router.get("/:id/connections", asyncHandler(usersController.listConnections));

// ── GET /users/:id/following ──────────────────────────────────────────────
router.get("/:id/following", asyncHandler(usersController.listFollowing));

// ── POST /users/:id/block ────────────────────────────────────────────────
router.post("/:id/block", requireAuth, asyncHandler(usersController.block));

router.delete("/:id/block", requireAuth, asyncHandler(usersController.unblock));

// ── POST /users/:id/mute ─────────────────────────────────────────────────
router.post("/:id/mute", requireAuth, asyncHandler(usersController.mute));

export = { router, publicUser: usersController.publicUser };
