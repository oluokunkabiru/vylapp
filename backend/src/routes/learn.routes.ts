import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import learnController from "../controllers/learn.controller";

const { authenticate } = authMiddleware;

const router = express.Router();

// ── GET /learn/categories ─────────────────────────────────────────────────────
// Public: no auth required.
router.get("/categories", asyncHandler(learnController.listCategories));

// ── GET /learn/courses ────────────────────────────────────────────────────────
// Public. Filtered by category, language, difficulty, is_free.
router.get("/courses", asyncHandler(learnController.listCourses));

// ── GET /learn/courses/:id ─────────────────────────────────────────────────────
router.get("/courses/:id", asyncHandler(learnController.getCourse));

// ── GET /learn/lessons/:id ────────────────────────────────────────────────────
router.get("/lessons/:id", authenticate, asyncHandler(learnController.getLesson));

// ── POST /learn/checkpoints/:id/answer ────────────────────────────────────────
router.post("/checkpoints/:id/answer", authenticate, asyncHandler(learnController.answerCheckpoint));

// ── POST /learn/educator/apply ─────────────────────────────────────────────────
router.post("/educator/apply", authenticate, asyncHandler(learnController.applyEducator));

// ── POST /learn/courses ────────────────────────────────────────────────────────
router.post("/courses", authenticate, asyncHandler(learnController.createCourse));

// ── POST /learn/courses/:id/lessons ───────────────────────────────────────────
router.post("/courses/:id/lessons", authenticate, asyncHandler(learnController.createLesson));

// ── POST /learn/courses/:id/enrol ─────────────────────────────────────────────
router.post("/courses/:id/enrol", authenticate, asyncHandler(learnController.enrol));

// ── POST /learn/lessons/:id/complete ──────────────────────────────────────────
router.post("/lessons/:id/complete", authenticate, asyncHandler(learnController.completeLesson));

// ── GET /learn/me/enrolments ──────────────────────────────────────────────────
router.get("/me/enrolments", authenticate, asyncHandler(learnController.myEnrolments));

// ── GET /learn/me/certificates ────────────────────────────────────────────────
router.get("/me/certificates", authenticate, asyncHandler(learnController.myCertificates));

// ── GET /learn/certificates/:id ────────────────────────────────────────────────
// Public: certificates are independently verifiable.
router.get("/certificates/:id", asyncHandler(learnController.getCertificate));

// ── POST /learn/courses/:id/rate ──────────────────────────────────────────────
router.post("/courses/:id/rate", authenticate, asyncHandler(learnController.rateCourse));

// ── DELETE /learn/courses/:id — owning educator (learn.delete.own) or admin (learn.delete.any)
router.delete("/courses/:id", authenticate, asyncHandler(learnController.archiveCourse));

export = router;
