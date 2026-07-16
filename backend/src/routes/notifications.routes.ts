import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import notificationsController from "../controllers/notifications.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(notificationsController.list));
router.post("/:id/read", asyncHandler(notificationsController.markRead));
router.post("/read-all", asyncHandler(notificationsController.markAllRead));
router.get("/digest", asyncHandler(notificationsController.digest));
router.patch("/preferences", asyncHandler(notificationsController.updatePreferences));

export = router;
