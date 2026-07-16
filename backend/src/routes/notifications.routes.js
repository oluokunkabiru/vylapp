const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const notificationsController = require("../controllers/notifications.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(notificationsController.list));
router.post("/:id/read", asyncHandler(notificationsController.markRead));
router.post("/read-all", asyncHandler(notificationsController.markAllRead));
router.get("/digest", asyncHandler(notificationsController.digest));
router.patch("/preferences", asyncHandler(notificationsController.updatePreferences));

module.exports = router;
