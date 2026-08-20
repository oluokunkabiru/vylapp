import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import messagingController from "../controllers/messaging.controller";

const { requireAuth } = authMiddleware;
const { requirePermission } = rbacMiddleware;

const router = express.Router();
router.use(requireAuth);

// ── GET /messages/conversations ──────────────────────────────────────────
router.get("/conversations", asyncHandler(messagingController.listConversations));

// ── GET /messages/requests — C-13: DMs from people who don't follow you ──
router.get("/requests", asyncHandler(messagingController.listRequests));
router.post("/conversations/:id/accept", asyncHandler(messagingController.acceptRequest));
router.post("/conversations/:id/decline", asyncHandler(messagingController.declineRequest));

// ── POST /messages/conversations/dm — get or create a 1:1 conversation ───
router.post("/conversations/dm", asyncHandler(messagingController.getOrCreateDm));

// ── POST /messages/conversations/group — create a group conversation ────
router.post("/conversations/group", requirePermission("messaging.group"), asyncHandler(messagingController.createGroup));

// ── POST /messages/conversations/:id/members — add a member to a group ──
router.post("/conversations/:id/members", asyncHandler(messagingController.addMember));

// ── POST /messages/conversations/:id/leave — leave a group ──────────────
router.post("/conversations/:id/leave", asyncHandler(messagingController.leaveGroup));

// ── GET /messages/conversations/:id/messages ─────────────────────────────
router.get("/conversations/:id/messages", asyncHandler(messagingController.listMessages));

// ── POST /messages/conversations/:id/messages ────────────────────────────
router.post("/conversations/:id/messages", asyncHandler(messagingController.sendMessage));

export = router;
