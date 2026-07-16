import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import onboardingController from "../controllers/onboarding.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();
router.use(requireAuth);

router.get("/flow", asyncHandler(onboardingController.flow));
router.post("/interests", asyncHandler(onboardingController.setInterests));
router.post("/handle", asyncHandler(onboardingController.setHandle));
router.post("/avatar", asyncHandler(onboardingController.setAvatar));
router.post("/location", asyncHandler(onboardingController.setLocation));
router.post("/follow-suggestions", asyncHandler(onboardingController.followSuggestions));
router.post("/complete", asyncHandler(onboardingController.complete));

export = router;
