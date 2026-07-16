import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import messagingController from "../controllers/messaging.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── GET /messages/conversations ──────────────────────────────────────────
router.get("/conversations", asyncHandler(messagingController.listConversations));

// ── POST /messages/conversations/dm — get or create a 1:1 conversation ───
router.post("/conversations/dm", asyncHandler(messagingController.getOrCreateDm));

// ── GET /messages/conversations/:id/messages ─────────────────────────────
router.get("/conversations/:id/messages", asyncHandler(messagingController.listMessages));

// ── POST /messages/conversations/:id/messages ────────────────────────────
router.post("/conversations/:id/messages", asyncHandler(messagingController.sendMessage));

export = router;
