import express from "express";
import authMiddleware from "../middleware/auth";
import asyncHandler from "../middleware/asyncHandler";
import storiesController from "../controllers/stories.controller";

const router = express.Router();
router.use(authMiddleware.requireAuth);

router.get("/", asyncHandler(storiesController.list));
router.post("/", asyncHandler(storiesController.create));
router.post("/:id/view", asyncHandler(storiesController.markViewed));
router.delete("/:id", asyncHandler(storiesController.remove));

export = router;
