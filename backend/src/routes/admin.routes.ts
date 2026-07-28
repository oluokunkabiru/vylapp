// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  /admin/*
//
//  Everything here requires admin.access (router-level requireAdmin).
//  Individual mutating routes additionally gate on the specific admin.*
//  permission that matches what they do.
// ════════════════════════════════════════════════════════════════════════════
import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import rbacMiddleware from "../middleware/rbac";
import adminController from "../controllers/admin.controller";
import adminContentController from "../controllers/adminContent.controller";
import adminLearnController from "../controllers/adminLearn.controller";
import adminForumController from "../controllers/adminForum.controller";
import adminMonetizationController from "../controllers/adminMonetization.controller";
import adminSettingsController from "../controllers/adminSettings.controller";

const { authenticate, requireAdmin } = authMiddleware;
const { requirePermission } = rbacMiddleware;

const router = express.Router();
router.use(authenticate, requireAdmin);

// ── GET /admin/me ──────────────────────────────────────────────────────────────
router.get("/me", asyncHandler(adminController.me));

// ── GET /admin/users ─────────────────────────────────────────────────────────
router.get("/users", requirePermission("admin.users.manage"), asyncHandler(adminController.listUsers));

// ── POST /admin/users/:id/suspend ─────────────────────────────────────────────
router.post("/users/:id/suspend", requirePermission("admin.users.manage"), asyncHandler(adminController.suspendUser));

// ── POST /admin/users/:id/reinstate ───────────────────────────────────────────
router.post("/users/:id/reinstate", requirePermission("admin.users.manage"), asyncHandler(adminController.reinstateUser));

// ── POST /admin/users/:id/deactivate ──────────────────────────────────────────
router.post("/users/:id/deactivate", requirePermission("admin.users.manage"), asyncHandler(adminController.deactivateUser));

// ── GET /admin/analytics/trends ───────────────────────────────────────────────
router.get("/analytics/trends", requirePermission("admin.analytics"), asyncHandler(adminController.analyticsTrends));

// ── GET /admin/moderation/queue ────────────────────────────────────────────────
router.get("/moderation/queue", requirePermission("admin.content.manage"), asyncHandler(adminController.moderationQueue));

// ── POST /admin/moderation/bulk-action ────────────────────────────────────────
router.post("/moderation/bulk-action", requirePermission("admin.content.manage"), asyncHandler(adminController.moderationBulkAction));

// ── GET /admin/audit ───────────────────────────────────────────────────────────
router.get("/audit", requirePermission("admin.audit.read"), asyncHandler(adminController.listAuditLog));

// ════════════════════════════════════════════════════════════════════════════
//  CONTENT — Vibes & Spaces  (admin.content.manage)
// ════════════════════════════════════════════════════════════════════════════
router.get("/content/vibes",                requirePermission("admin.content.manage"), asyncHandler(adminContentController.listVibes));
router.post("/content/vibes/:id/remove",     requirePermission("admin.content.manage"), asyncHandler(adminContentController.removeVibe));
router.post("/content/vibes/:id/restore",    requirePermission("admin.content.manage"), asyncHandler(adminContentController.restoreVibe));
router.get("/content/spaces",                requirePermission("admin.content.manage"), asyncHandler(adminContentController.listSpaces));
router.post("/content/spaces/:id/end",       requirePermission("admin.content.manage"), asyncHandler(adminContentController.forceEndSpace));
router.get("/content/spaces/:id/participants", requirePermission("admin.content.manage"), asyncHandler(adminContentController.spaceParticipants));

// ════════════════════════════════════════════════════════════════════════════
//  LEARN — Courses & Educators  (learn.manage)
// ════════════════════════════════════════════════════════════════════════════
router.get("/learn/stats",                     requirePermission("learn.manage"), asyncHandler(adminLearnController.stats));
router.get("/learn/courses",                   requirePermission("learn.manage"), asyncHandler(adminLearnController.listCourses));
router.get("/learn/courses/:id",               requirePermission("learn.manage"), asyncHandler(adminLearnController.getCourse));
router.patch("/learn/courses/:id",             requirePermission("learn.manage"), asyncHandler(adminLearnController.updateCourse));
router.post("/learn/courses/:id/publish",      requirePermission("learn.manage"), asyncHandler(adminLearnController.publishCourse));
router.post("/learn/courses/:id/unpublish",    requirePermission("learn.manage"), asyncHandler(adminLearnController.unpublishCourse));
router.get("/learn/educators",                 requirePermission("learn.manage"), asyncHandler(adminLearnController.listEducators));
router.post("/learn/educators/:id/verify",     requirePermission("learn.manage"), asyncHandler(adminLearnController.verifyEducator));
router.post("/learn/educators/:id/suspend",    requirePermission("learn.manage"), asyncHandler(adminLearnController.suspendEducator));
router.post("/learn/educators/:id/reinstate",  requirePermission("learn.manage"), asyncHandler(adminLearnController.reinstateEducator));

// ════════════════════════════════════════════════════════════════════════════
//  FORUM — Categories, cross-category threads, moderators  (admin.content.manage)
// ════════════════════════════════════════════════════════════════════════════
router.get("/forum/categories",                        requirePermission("admin.content.manage"), asyncHandler(adminForumController.listCategories));
router.post("/forum/categories",                        requirePermission("admin.content.manage"), asyncHandler(adminForumController.createCategory));
router.patch("/forum/categories/:id",                   requirePermission("admin.content.manage"), asyncHandler(adminForumController.updateCategory));
router.get("/forum/threads",                            requirePermission("admin.content.manage"), asyncHandler(adminForumController.listThreads));
router.get("/forum/categories/:id/moderators",          requirePermission("admin.content.manage"), asyncHandler(adminForumController.listModerators));
router.post("/forum/categories/:id/moderators",         requirePermission("admin.content.manage"), asyncHandler(adminForumController.addModerator));
router.delete("/forum/moderators/:id",                  requirePermission("admin.content.manage"), asyncHandler(adminForumController.removeModerator));

// ════════════════════════════════════════════════════════════════════════════
//  MONETIZATION — Revenue, payouts, creators, subscribers  (creator.manage)
// ════════════════════════════════════════════════════════════════════════════
router.get("/monetization/overview",                requirePermission("creator.manage"), asyncHandler(adminMonetizationController.overview));
router.get("/monetization/payouts",                 requirePermission("creator.manage"), asyncHandler(adminMonetizationController.listPayouts));
router.post("/monetization/payouts/:id/mark-paid",  requirePermission("creator.manage"), asyncHandler(adminMonetizationController.markPayoutPaid));
router.post("/monetization/payouts/:id/mark-failed", requirePermission("creator.manage"), asyncHandler(adminMonetizationController.markPayoutFailed));
router.get("/monetization/creators",                requirePermission("creator.manage"), asyncHandler(adminMonetizationController.listCreators));
router.get("/monetization/subscribers",             requirePermission("creator.manage"), asyncHandler(adminMonetizationController.listSubscribers));

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS — App config & feature flags  (admin.system.config)
// ════════════════════════════════════════════════════════════════════════════
router.get("/settings/config",           requirePermission("admin.system.config"), asyncHandler(adminSettingsController.listConfig));
router.put("/settings/config/:key",      requirePermission("admin.system.config"), asyncHandler(adminSettingsController.upsertConfig));
router.delete("/settings/config/:key",   requirePermission("admin.system.config"), asyncHandler(adminSettingsController.deleteConfig));
router.get("/settings/flags",            requirePermission("admin.system.config"), asyncHandler(adminSettingsController.listFlags));
router.post("/settings/flags",           requirePermission("admin.system.config"), asyncHandler(adminSettingsController.createFlag));
router.patch("/settings/flags/:id",      requirePermission("admin.system.config"), asyncHandler(adminSettingsController.updateFlag));
router.delete("/settings/flags/:id",     requirePermission("admin.system.config"), asyncHandler(adminSettingsController.deleteFlag));

export = router;
