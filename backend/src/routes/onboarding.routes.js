const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const onboardingController = require("../controllers/onboarding.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/flow", asyncHandler(onboardingController.flow));
router.post("/interests", asyncHandler(onboardingController.setInterests));
router.post("/handle", asyncHandler(onboardingController.setHandle));
router.post("/avatar", asyncHandler(onboardingController.setAvatar));
router.post("/location", asyncHandler(onboardingController.setLocation));
router.post("/follow-suggestions", asyncHandler(onboardingController.followSuggestions));
router.post("/complete", asyncHandler(onboardingController.complete));

module.exports = router;
