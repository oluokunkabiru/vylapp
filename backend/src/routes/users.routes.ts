import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import usersController from "../controllers/users.controller";

const { requireAuth, optionalAuth } = authMiddleware;

const router = express.Router();

// ── GET /users/discover — diaspora discovery by current/heritage country ─
// Registered before /:handle so "discover" isn't swallowed as a handle lookup.
router.get("/discover", requireAuth, asyncHandler(usersController.discover));

// ── Muted words (S, rest) — registered before /:handle for the same reason
// as /discover above; these are all two-or-three-segment paths so they
// never actually collide with the one-segment /:handle route, but keeping
// them together up top matches this file's existing convention. ──────────
router.get("/me/muted-words", requireAuth, asyncHandler(usersController.listMutedWords));
router.post("/me/muted-words", requireAuth, asyncHandler(usersController.addMutedWord));
router.delete("/me/muted-words/:id", requireAuth, asyncHandler(usersController.removeMutedWord));

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
router.delete("/:id/mute", requireAuth, asyncHandler(usersController.unmute));

export = { router, publicUser: usersController.publicUser };
