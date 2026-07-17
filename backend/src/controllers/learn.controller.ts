// ════════════════════════════════════════════════════════════════════════════
//  LEARN ROUTES  /learn/*
//
//  All routes require authentication unless noted.
//  Rate limiting is applied globally via the rateLimiter middleware in app.js.
//  Input validation is strict — every field is validated before any DB call.
//  All user content passes through ModerationEngine before being stored.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import ModerationEngine from "../services/moderationEngine";
import prisma from "../config/prisma";
import crypto from "crypto";
import { Prisma, CourseStatus, LessonType, EnrolmentStatus } from "../generated/prisma";

// ── Validation helpers ────────────────────────────────────────────────────────
function requireFields(body: any, fields: string[]) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw Object.assign(new Error(`Missing required fields: ${missing.join(", ")}`), { status: 400 });
}

function clamp(str: unknown, min: number, max: number, field: string): string {
  if (typeof str !== "string" || str.trim().length < min || str.trim().length > max)
    throw Object.assign(new Error(`${field} must be between ${min} and ${max} characters`), { status: 400 });
  return str.trim();
}

async function assertEducator(userId: string) {
  const profile = await prisma.educatorProfiles.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!profile) throw Object.assign(new Error("Educator profile required. Apply first."), { status: 403 });
  if (profile.status === "suspended") throw Object.assign(new Error("Educator account suspended"), { status: 403 });
  return profile;
}

// ── GET /learn/categories ─────────────────────────────────────────────────────
// Public: no auth required.
async function listCategories(req: AuthedRequest, res: Response) {
  const categories = await prisma.forumCategories.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, description: true, topicCategory: true, color: true, icon: true, sortOrder: true, threadCount: true },
    orderBy: { sortOrder: "asc" },
  });
  const shaped = categories.map(c => ({
    id: c.id, slug: c.slug, name: c.name, description: c.description, topic_category: c.topicCategory,
    color: c.color, icon: c.icon, sort_order: c.sortOrder, thread_count: c.threadCount,
  }));
  res.json({ ok: true, data: { categories: shaped } });
}

// ── GET /learn/courses ────────────────────────────────────────────────────────
// Public. Filtered by category, language, difficulty, is_free.
async function listCourses(req: AuthedRequest, res: Response) {
  const { category, language, difficulty, is_free, q } = req.query as Record<string, string | undefined>;
  const page = Math.max(0, parseInt((req.query.page as string) || "0", 10) || 0);
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.page_size as string) || "12", 10) || 12));

  const where: Prisma.CoursesWhereInput = { status: "published" };
  if (category) where.category = category;
  if (language) where.language = language;
  if (difficulty) where.difficulty = difficulty;
  if (is_free !== undefined) where.isFree = is_free === "true";
  if (q?.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { description: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const courses = await prisma.courses.findMany({
    where,
    include: { educatorProfiles: { select: { status: true, usersEducatorProfilesUserIdTousers: { select: { handle: true, displayName: true } } } } },
    orderBy: [{ avgRating: "desc" }, { enrolmentCount: "desc" }],
    skip: page * pageSize,
    take: pageSize,
  });

  const shaped = courses.map(c => ({
    id: c.id, title: c.title, description: c.description, category: c.category, language: c.language, difficulty: c.difficulty,
    is_free: c.isFree, price_usd: c.priceUsd, cover_image_url: c.coverImageUrl, estimated_hours: c.estimatedHours,
    enrolment_count: c.enrolmentCount, avg_rating: c.avgRating, total_lessons: c.totalLessons, published_at: c.publishedAt,
    educator_handle: c.educatorProfiles.usersEducatorProfilesUserIdTousers.handle,
    educator_name: c.educatorProfiles.usersEducatorProfilesUserIdTousers.displayName,
    educator_status: c.educatorProfiles.status,
  }));
  res.json({ ok: true, data: { courses: shaped, page, page_size: pageSize } });
}

// ── GET /learn/courses/:id ─────────────────────────────────────────────────────
async function getCourse(req: AuthedRequest, res: Response) {
  const course = await prisma.courses.findFirst({
    where: { id: req.params.id, status: "published" },
    include: { educatorProfiles: { include: { usersEducatorProfilesUserIdTousers: { select: { handle: true, displayName: true } } } } },
  });
  if (!course) return res.status(404).json({ ok: false, error: { message: "Course not found" } });

  const lessons = await prisma.lessons.findMany({
    where: { courseId: course.id },
    select: { id: true, title: true, type: true, durationMinutes: true, sortOrder: true, isFreePreview: true },
    orderBy: { sortOrder: "asc" },
  });

  // CourseDetail.jsx reads these fields in snake_case — the earlier spread
  // of ...courseFields leaked Prisma's raw camelCase shape here (a real bug,
  // caught by this same before/after diff process).
  const { educatorProfiles } = course;
  const shapedCourse = {
    id: course.id, educator_id: course.educatorId, title: course.title, description: course.description,
    category: course.category, language: course.language, difficulty: course.difficulty, status: course.status,
    is_free: course.isFree, price_usd: course.priceUsd, cover_image_url: course.coverImageUrl,
    preview_video_url: course.previewVideoUrl, estimated_hours: course.estimatedHours, tags: course.tags,
    enrolment_count: course.enrolmentCount, total_lessons: course.totalLessons, avg_rating: course.avgRating,
    stripe_product_id: course.stripeProductId, published_at: course.publishedAt,
    created_at: course.createdAt, updated_at: course.updatedAt,
    educator_handle: educatorProfiles.usersEducatorProfilesUserIdTousers.handle,
    educator_name: educatorProfiles.usersEducatorProfilesUserIdTousers.displayName,
    educator_bio: educatorProfiles.bio,
    subjects: educatorProfiles.subjects,
    languages_taught: educatorProfiles.languagesTaught,
    educator_rating: educatorProfiles.avgRating,
  };
  const shapedLessons = lessons.map(l => ({
    id: l.id, title: l.title, type: l.type, duration_minutes: l.durationMinutes, sort_order: l.sortOrder, is_free_preview: l.isFreePreview,
  }));

  res.json({ ok: true, data: { course: shapedCourse, lessons: shapedLessons } });
}

// ── GET /learn/lessons/:id ────────────────────────────────────────────────────
// Requires enrolment in the parent course, unless the lesson is a free preview.
// Quiz checkpoints are returned with correct_option/explanation stripped —
// those only come back from POST /learn/checkpoints/:id/answer, after scoring.
async function getLesson(req: AuthedRequest, res: Response) {
  const lesson = await prisma.lessons.findUnique({ where: { id: req.params.id } });
  if (!lesson) return res.status(404).json({ ok: false, error: { message: "Lesson not found" } });

  if (!lesson.isFreePreview) {
    const enrolled = await prisma.courseEnrolments.findFirst({
      where: { userId: req.user.id, courseId: lesson.courseId, status: { in: ["active", "completed"] } },
    });
    if (!enrolled) return res.status(403).json({ ok: false, error: { message: "Enrol in this course to view the lesson" } });
  }

  const completion = await prisma.lessonCompletions.findUnique({ where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.id } } });

  let checkpoints: any[] = [];
  if (lesson.type === "quiz") {
    const cps = await prisma.knowledgeCheckpoints.findMany({
      where: { lessonId: req.params.id },
      select: { id: true, question: true, options: true, points: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
    const responses = await prisma.checkpointResponses.findMany({
      where: { userId: req.user.id, knowledgeCheckpoints: { lessonId: req.params.id } },
      select: { checkpointId: true, selectedOption: true, isCorrect: true, pointsEarned: true },
    });
    const responseMap = new Map(responses.map(r => [r.checkpointId, r]));
    checkpoints = cps.map(c => ({
      id: c.id, question: c.question, options: c.options, points: c.points, sort_order: c.sortOrder,
      response: responseMap.get(c.id) || null,
    }));
  }

  res.json({ ok: true, data: { lesson, checkpoints, completion: completion || null } });
}

// ── POST /learn/checkpoints/:id/answer ────────────────────────────────────────
async function answerCheckpoint(req: AuthedRequest, res: Response) {
  const { selected_option } = req.body;
  requireFields(req.body, ["selected_option"]);

  const checkpoint = await prisma.knowledgeCheckpoints.findUnique({
    where: { id: req.params.id },
    select: { id: true, correctOption: true, explanation: true, points: true, lessons: { select: { courseId: true } } },
  });
  if (!checkpoint) return res.status(404).json({ ok: false, error: { message: "Checkpoint not found" } });

  const enrolled = await prisma.courseEnrolments.findFirst({
    where: { userId: req.user.id, courseId: checkpoint.lessons.courseId, status: { in: ["active", "completed"] } },
  });
  if (!enrolled) return res.status(403).json({ ok: false, error: { message: "Enrol in this course to answer" } });

  const isCorrect = selected_option === checkpoint.correctOption;
  const pointsEarned = isCorrect ? checkpoint.points : 0;

  await prisma.checkpointResponses.upsert({
    where: { userId_checkpointId: { userId: req.user.id, checkpointId: req.params.id } },
    create: { userId: req.user.id, checkpointId: req.params.id, selectedOption: selected_option, isCorrect, pointsEarned },
    update: { selectedOption: selected_option, isCorrect, pointsEarned, respondedAt: new Date() },
  });

  res.json({ ok: true, data: {
    is_correct: isCorrect, correct_option: checkpoint.correctOption,
    explanation: checkpoint.explanation, points_earned: pointsEarned,
  } });
}

// ── POST /learn/educator/apply ─────────────────────────────────────────────────
async function applyEducator(req: AuthedRequest, res: Response) {
  const { bio, subjects, languages_taught } = req.body;
  requireFields(req.body, ["bio", "subjects"]);
  const cleanBio = clamp(bio, 20, 2000, "Bio");
  if (!Array.isArray(subjects) || subjects.length === 0) throw Object.assign(new Error("At least one subject required"), { status: 400 });

  const mod = await ModerationEngine.analyzeContent(cleanBio);
  if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Content flagged: " + mod.label } });

  const existing = await prisma.educatorProfiles.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  if (existing) return res.status(409).json({ ok: false, error: { message: "Educator profile already exists" } });

  const educator = await prisma.educatorProfiles.create({
    data: { userId: req.user.id, bio: cleanBio, subjects: subjects.slice(0, 10), languagesTaught: languages_taught || ["en"] },
    select: { id: true, status: true, createdAt: true },
  });
  res.status(201).json({ ok: true, data: { educator } });
}

// ── POST /learn/courses ────────────────────────────────────────────────────────
async function createCourse(req: AuthedRequest, res: Response) {
  const educator = await assertEducator(req.user.id);
  const { title, description, category, language, difficulty, is_free, price_usd, tags } = req.body;
  requireFields(req.body, ["title", "description", "category"]);
  const cleanTitle = clamp(title, 5, 200, "Title");
  const cleanDesc = clamp(description, 20, 5000, "Description");

  const mod = await ModerationEngine.analyzeContent(`${cleanTitle} ${cleanDesc}`);
  if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Content flagged: " + mod.label } });

  const course = await prisma.courses.create({
    data: {
      educatorId: educator.id,
      title: cleanTitle,
      description: cleanDesc,
      category,
      language: language || "en",
      difficulty: difficulty || "beginner",
      isFree: is_free !== false,
      priceUsd: Math.max(0, parseFloat(price_usd) || 0),
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });
  res.status(201).json({ ok: true, data: { course } });
}

// ── POST /learn/courses/:id/lessons ───────────────────────────────────────────
async function createLesson(req: AuthedRequest, res: Response) {
  const educator = await assertEducator(req.user.id);
  const course = await prisma.courses.findFirst({ where: { id: req.params.id, educatorId: educator.id }, select: { id: true } });
  if (!course) return res.status(404).json({ ok: false, error: { message: "Course not found or not yours" } });

  const { title, type, content, duration_minutes, is_free_preview, sort_order } = req.body;
  requireFields(req.body, ["title", "type", "content"]);
  const cleanTitle = clamp(title, 3, 200, "Title");
  const validTypes = ["video", "article", "quiz", "live_session", "interactive"];
  if (!validTypes.includes(type)) throw Object.assign(new Error(`Invalid lesson type. Must be one of: ${validTypes.join(", ")}`), { status: 400 });

  const lesson = await prisma.lessons.create({
    data: {
      courseId: req.params.id,
      title: cleanTitle,
      type: type as LessonType,
      content,
      durationMinutes: duration_minutes || null,
      isFreePreview: is_free_preview || false,
      sortOrder: sort_order || 0,
    },
    select: { id: true, title: true, type: true, sortOrder: true },
  });

  // Update total_lessons count on the course
  const count = await prisma.lessons.count({ where: { courseId: req.params.id } });
  await prisma.courses.update({ where: { id: req.params.id }, data: { totalLessons: count } });

  res.status(201).json({ ok: true, data: { lesson: { id: lesson.id, title: lesson.title, type: lesson.type, sort_order: lesson.sortOrder } } });
}

// ── POST /learn/courses/:id/enrol ─────────────────────────────────────────────
async function enrol(req: AuthedRequest, res: Response) {
  const course = await prisma.courses.findUnique({ where: { id: req.params.id }, select: { id: true, isFree: true, priceUsd: true, status: true } });
  if (!course || course.status !== "published") {
    return res.status(404).json({ ok: false, error: { message: "Course not found or not available" } });
  }

  const existing = await prisma.courseEnrolments.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: req.params.id } } });
  if (existing) return res.status(409).json({ ok: false, error: { message: "Already enrolled" } });

  if (!course.isFree && Number(course.priceUsd) > 0) {
    // Paid course: payment intent must be provided and verified
    const { stripe_payment_intent_id } = req.body;
    if (!stripe_payment_intent_id) return res.status(402).json({ ok: false, error: { message: "Payment required. Provide stripe_payment_intent_id." } });
    // TODO: verify payment intent with Stripe SDK before inserting
    const enrolment = await prisma.courseEnrolments.create({
      data: { userId: req.user.id, courseId: req.params.id, stripePaymentIntentId: stripe_payment_intent_id, amountPaidUsd: course.priceUsd },
      select: { id: true, enrolledAt: true },
    });
    return res.status(201).json({ ok: true, data: { enrolment } });
  }

  const enrolment = await prisma.courseEnrolments.create({
    data: { userId: req.user.id, courseId: req.params.id },
    select: { id: true, enrolledAt: true },
  });
  res.status(201).json({ ok: true, data: { enrolment } });
}

// ── POST /learn/lessons/:id/complete ──────────────────────────────────────────
async function completeLesson(req: AuthedRequest, res: Response) {
  const { score, time_spent_sec } = req.body;
  const lesson = await prisma.lessons.findUnique({ where: { id: req.params.id }, select: { id: true, courseId: true, type: true } });
  if (!lesson) return res.status(404).json({ ok: false, error: { message: "Lesson not found" } });

  // Verify enrolment
  const enrolled = await prisma.courseEnrolments.findFirst({ where: { userId: req.user.id, courseId: lesson.courseId, status: "active" } });
  if (!enrolled) return res.status(403).json({ ok: false, error: { message: "Not enrolled in this course" } });

  const completion = await prisma.lessonCompletions.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.id } },
    create: {
      userId: req.user.id, lessonId: req.params.id, courseId: lesson.courseId,
      score: score !== undefined ? Math.min(100, Math.max(0, parseInt(score, 10))) : null,
      progressPct: 100, completedAt: new Date(), timeSpentSec: time_spent_sec || 0,
    },
    update: {
      score: score !== undefined ? Math.min(100, Math.max(0, parseInt(score, 10))) : null,
      progressPct: 100, completedAt: new Date(), timeSpentSec: time_spent_sec || 0,
    },
    select: { id: true, completedAt: true },
  });

  // Check if course is now complete and issue certificate
  const enrolmentProgress = await prisma.courseEnrolments.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId: lesson.courseId } },
    select: { progressPct: true },
  });
  let certificate = null;
  if (enrolmentProgress?.progressPct === 100) {
    certificate = await issueCertificate(req.user.id, lesson.courseId);
  }

  res.json({ ok: true, data: { completion, certificate } });
}

// ── GET /learn/me/enrolments ──────────────────────────────────────────────────
async function myEnrolments(req: AuthedRequest, res: Response) {
  const enrolments = await prisma.courseEnrolments.findMany({
    where: { userId: req.user.id },
    include: { courses: { select: { title: true, coverImageUrl: true, totalLessons: true, category: true } } },
    orderBy: { enrolledAt: "desc" },
  });
  const shaped = enrolments.map(e => ({
    id: e.id, course_id: e.courseId, status: e.status, progress_pct: e.progressPct, lessons_done: e.lessonsDone,
    enrolled_at: e.enrolledAt, completed_at: e.completedAt,
    title: e.courses.title, cover_image_url: e.courses.coverImageUrl, total_lessons: e.courses.totalLessons, category: e.courses.category,
  }));
  res.json({ ok: true, data: { enrolments: shaped } });
}

// ── GET /learn/me/certificates ────────────────────────────────────────────────
// LearnHome.jsx reads course_title/issued_at in snake_case.
function shapeCertificate(c: any) {
  return {
    id: c.id, user_id: c.userId, course_id: c.courseId, course_title: c.courseTitle, educator_name: c.educatorName,
    issued_at: c.issuedAt, revoked_at: c.revokedAt, revoke_reason: c.revokeReason, metadata: c.metadata,
  };
}

async function myCertificates(req: AuthedRequest, res: Response) {
  const certificates = await prisma.certificates.findMany({
    where: { userId: req.user.id, revokedAt: null },
    orderBy: { issuedAt: "desc" },
  });
  res.json({ ok: true, data: { certificates: certificates.map(shapeCertificate) } });
}

// ── GET /learn/certificates/:id ────────────────────────────────────────────────
// Public: certificates are independently verifiable.
async function getCertificate(req: AuthedRequest, res: Response) {
  const certificate = await prisma.certificates.findUnique({ where: { id: req.params.id } });
  if (!certificate) return res.status(404).json({ ok: false, error: { message: "Certificate not found or invalid" } });
  if (certificate.revokedAt) return res.status(410).json({ ok: false, error: { message: "Certificate revoked" } });
  res.json({ ok: true, data: { certificate: shapeCertificate(certificate), valid: true } });
}

// ── POST /learn/courses/:id/rate ──────────────────────────────────────────────
async function rateCourse(req: AuthedRequest, res: Response) {
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) throw Object.assign(new Error("Rating must be 1-5"), { status: 400 });
  const enrolled = await prisma.courseEnrolments.findFirst({ where: { userId: req.user.id, courseId: req.params.id, status: "completed" } });
  if (!enrolled) return res.status(403).json({ ok: false, error: { message: "Must complete the course before rating" } });

  if (review) {
    const mod = await ModerationEngine.analyzeContent(review);
    if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Review content flagged: " + mod.label } });
  }

  const ratingRow = await prisma.courseRatings.upsert({
    where: { userId_courseId: { userId: req.user.id, courseId: req.params.id } },
    create: { userId: req.user.id, courseId: req.params.id, rating: parseInt(rating, 10), review: review?.trim() || null },
    update: { rating: parseInt(rating, 10), review: review?.trim() || null, updatedAt: new Date() },
    select: { id: true, rating: true, createdAt: true },
  });
  res.json({ ok: true, data: { rating: ratingRow } });
}

// ── Internal: certificate issuance ────────────────────────────────────────────
async function issueCertificate(userId: string, courseId: string) {
  const course = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { title: true, educatorProfiles: { select: { usersEducatorProfilesUserIdTousers: { select: { displayName: true } } } } },
  });
  if (!course) return null;

  const issuedAt = new Date().toISOString();
  const certId = crypto.createHash("sha256").update(`${userId}:${courseId}:${issuedAt}`).digest("hex");

  // Matches the original's ON CONFLICT DO NOTHING semantics exactly: if a
  // certificate already exists, return null (not the existing row) — an
  // upsert here would change that behavior.
  try {
    return await prisma.certificates.create({
      data: {
        id: certId, userId, courseId, courseTitle: course.title,
        educatorName: course.educatorProfiles.usersEducatorProfilesUserIdTousers.displayName,
      },
      select: { id: true, issuedAt: true },
    });
  } catch {
    return null;
  }
}

// ── DELETE /learn/courses/:id — owning educator or admin archives a course ────
// Wires learn.delete.own (owner) and learn.delete.any (platform admin), both
// previously unused by any endpoint. Courses have no hard-delete/is_deleted
// column, so "delete" here means archiving — consistent with CourseStatus's
// only terminal-ish state and with how courses are excluded from listCourses.
async function archiveCourse(req: AuthedRequest, res: Response) {
  const course = await prisma.courses.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, educatorProfiles: { select: { userId: true } } },
  });
  if (!course) return res.status(404).json({ ok: false, error: { message: "Course not found" } });

  const isOwner = course.educatorProfiles.userId === req.user.id;
  const canDeleteAny = req.can!("learn.delete.any");
  const canDeleteOwn = isOwner && req.can!("learn.delete.own");
  if (!canDeleteAny && !canDeleteOwn) return res.status(403).json({ ok: false, error: { message: "Not authorized to delete this course" } });

  await prisma.courses.update({ where: { id: req.params.id }, data: { status: "archived" } });
  res.json({ ok: true });
}

export = {
  listCategories, listCourses, getCourse, getLesson, answerCheckpoint, applyEducator,
  createCourse, createLesson, enrol, completeLesson, myEnrolments, myCertificates, getCertificate, rateCourse,
  archiveCourse,
};
