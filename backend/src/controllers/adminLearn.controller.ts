// ════════════════════════════════════════════════════════════════════════════
//  ADMIN LEARN CONTROLLER  /admin/learn/*
//
//  Course review/publishing and educator management for the Learn pillar.
//  Course creation itself stays in learn.routes.ts (an educator authoring
//  their own draft) — this controller is the review/oversight layer on top:
//  list across every status, publish/unpublish, and manage educator profiles.
//  Sits behind requireAdmin + learn.manage at the router level.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import { CourseStatus, EducatorStatus } from "../generated/prisma";

const { ok, fail } = respond;

function pageParams(req: AuthedRequest, defaultSize = 20, maxSize = 100) {
  const page = Math.max(0, parseInt((req.query.page as string) || "0", 10) || 0);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt((req.query.page_size as string) || String(defaultSize), 10) || defaultSize));
  return { page, pageSize, skip: page * pageSize };
}

async function writeAudit(adminId: string, action: string, targetType: string | null, targetId: string | null, beforeData: unknown, afterData: unknown, ip: string | null) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, beforeData: beforeData as any, afterData: afterData as any, ipAddress: ip },
  });
}

function shapeCourse(c: any) {
  return {
    id: c.id, title: c.title, description: c.description, category: c.category, language: c.language,
    difficulty: c.difficulty, status: c.status, is_free: c.isFree, price_usd: c.priceUsd,
    cover_image_url: c.coverImageUrl, estimated_hours: c.estimatedHours, tags: c.tags,
    enrolment_count: c.enrolmentCount, total_lessons: c.totalLessons, avg_rating: c.avgRating,
    published_at: c.publishedAt, created_at: c.createdAt, updated_at: c.updatedAt,
    educator: {
      id: c.educatorProfiles.id, status: c.educatorProfiles.status,
      handle: c.educatorProfiles.usersEducatorProfilesUserIdTousers.handle,
      display_name: c.educatorProfiles.usersEducatorProfilesUserIdTousers.displayName,
    },
  };
}

// ── GET /admin/learn/courses ───────────────────────────────────────────────────
async function listCourses(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { status, category, q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status && status !== "all") where.status = status as CourseStatus;
  if (category) where.category = category;
  if (q?.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { educatorProfiles: { usersEducatorProfilesUserIdTousers: { handle: { contains: q.trim(), mode: "insensitive" } } } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.courses.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { educatorProfiles: { include: { usersEducatorProfilesUserIdTousers: { select: { handle: true, displayName: true } } } } },
    }),
    prisma.courses.count({ where }),
  ]);
  return ok(res, { courses: courses.map(shapeCourse), page, page_size: pageSize, total });
}

// ── GET /admin/learn/courses/:id ───────────────────────────────────────────────
async function getCourse(req: AuthedRequest, res: Response) {
  const course = await prisma.courses.findUnique({
    where: { id: req.params.id },
    include: { educatorProfiles: { include: { usersEducatorProfilesUserIdTousers: { select: { handle: true, displayName: true } } } } },
  });
  if (!course) return fail(res, 404, "Course not found");

  const lessons = await prisma.lessons.findMany({
    where: { courseId: course.id }, orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, type: true, sortOrder: true, durationMinutes: true, isFreePreview: true },
  });
  return ok(res, {
    course: shapeCourse(course),
    lessons: lessons.map(l => ({ id: l.id, title: l.title, type: l.type, sort_order: l.sortOrder, duration_minutes: l.durationMinutes, is_free_preview: l.isFreePreview })),
  });
}

// ── PATCH /admin/learn/courses/:id ─────────────────────────────────────────────
async function updateCourse(req: AuthedRequest, res: Response) {
  const before = await prisma.courses.findUnique({ where: { id: req.params.id } });
  if (!before) return fail(res, 404, "Course not found");

  const { title, description, category, language, difficulty, is_free, price_usd, tags } = req.body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = String(title).trim();
  if (description !== undefined) data.description = String(description).trim();
  if (category !== undefined) data.category = category;
  if (language !== undefined) data.language = language;
  if (difficulty !== undefined) data.difficulty = difficulty;
  if (is_free !== undefined) data.isFree = !!is_free;
  if (price_usd !== undefined) data.priceUsd = Math.max(0, parseFloat(price_usd) || 0);
  if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.slice(0, 10) : [];
  if (!Object.keys(data).length) return fail(res, 400, "No valid fields to update");

  const course = await prisma.courses.update({ where: { id: req.params.id }, data, select: { id: true, title: true, status: true } });
  await writeAudit(req.user.id, "learn.course.update", "course", req.params.id, before, course, req.ip || null);
  return ok(res, { course });
}

// ── POST /admin/learn/courses/:id/publish ──────────────────────────────────────
async function publishCourse(req: AuthedRequest, res: Response) {
  const before = await prisma.courses.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!before) return fail(res, 404, "Course not found");

  const course = await prisma.courses.update({
    where: { id: req.params.id },
    data: { status: "published", publishedAt: new Date() },
    select: { id: true, status: true, publishedAt: true },
  });
  await writeAudit(req.user.id, "learn.course.publish", "course", req.params.id, before, course, req.ip || null);
  return ok(res, { course });
}

// ── POST /admin/learn/courses/:id/unpublish ────────────────────────────────────
// Sends a published/pending_review course back to draft — e.g. after a
// content issue is found post-publish. Distinct from archiveCourse (which
// is the permanent removal path already wired in learn.routes.ts).
async function unpublishCourse(req: AuthedRequest, res: Response) {
  const before = await prisma.courses.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!before) return fail(res, 404, "Course not found");

  const course = await prisma.courses.update({
    where: { id: req.params.id }, data: { status: "draft" }, select: { id: true, status: true },
  });
  await writeAudit(req.user.id, "learn.course.unpublish", "course", req.params.id, before, course, req.ip || null);
  return ok(res, { course });
}

function shapeEducator(e: any) {
  return {
    id: e.id, bio: e.bio, subjects: e.subjects, languages_taught: e.languagesTaught, status: e.status,
    verified_at: e.verifiedAt, total_students: e.totalStudents, total_courses: e.totalCourses, avg_rating: e.avgRating,
    created_at: e.createdAt,
    user: { id: e.usersEducatorProfilesUserIdTousers.id, handle: e.usersEducatorProfilesUserIdTousers.handle, display_name: e.usersEducatorProfilesUserIdTousers.displayName },
  };
}

// ── GET /admin/learn/educators ──────────────────────────────────────────────────
async function listEducators(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { status, q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status && status !== "all") where.status = status as EducatorStatus;
  if (q?.trim()) where.usersEducatorProfilesUserIdTousers = { handle: { contains: q.trim(), mode: "insensitive" } };

  const [educators, total] = await Promise.all([
    prisma.educatorProfiles.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { usersEducatorProfilesUserIdTousers: { select: { id: true, handle: true, displayName: true } } },
    }),
    prisma.educatorProfiles.count({ where }),
  ]);
  return ok(res, { educators: educators.map(shapeEducator), page, page_size: pageSize, total });
}

async function setEducatorStatus(req: AuthedRequest, res: Response, status: EducatorStatus, action: string) {
  const before = await prisma.educatorProfiles.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!before) return fail(res, 404, "Educator profile not found");

  const data: any = { status };
  if (status === "verified") { data.verifiedAt = new Date(); data.verifiedBy = req.user.id; }
  const educator = await prisma.educatorProfiles.update({ where: { id: req.params.id }, data, select: { id: true, status: true, verifiedAt: true } });
  await writeAudit(req.user.id, action, "educator_profile", req.params.id, before, educator, req.ip || null);
  return ok(res, { educator });
}

// ── POST /admin/learn/educators/:id/verify ────────────────────────────────────
async function verifyEducator(req: AuthedRequest, res: Response) { return setEducatorStatus(req, res, "verified", "learn.educator.verify"); }
// ── POST /admin/learn/educators/:id/suspend ───────────────────────────────────
async function suspendEducator(req: AuthedRequest, res: Response) { return setEducatorStatus(req, res, "suspended", "learn.educator.suspend"); }
// ── POST /admin/learn/educators/:id/reinstate ─────────────────────────────────
async function reinstateEducator(req: AuthedRequest, res: Response) { return setEducatorStatus(req, res, "community", "learn.educator.reinstate"); }

// ── GET /admin/learn/stats ─────────────────────────────────────────────────────
async function stats(req: AuthedRequest, res: Response) {
  const [byStatus, totals, topCourses] = await Promise.all([
    prisma.courses.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.$queryRaw<{ enrolments: bigint; completions: bigint; educators: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM course_enrolments)::bigint AS enrolments,
        (SELECT COUNT(*) FROM course_enrolments WHERE status = 'completed')::bigint AS completions,
        (SELECT COUNT(*) FROM educator_profiles)::bigint AS educators
    `,
    prisma.courses.findMany({
      where: { status: "published" }, orderBy: { enrolmentCount: "desc" }, take: 5,
      select: { id: true, title: true, enrolmentCount: true, avgRating: true },
    }),
  ]);

  return ok(res, {
    by_status: Object.fromEntries(byStatus.map(r => [r.status, r._count._all])),
    enrolments: Number(totals[0]?.enrolments || 0),
    completions: Number(totals[0]?.completions || 0),
    educators: Number(totals[0]?.educators || 0),
    top_courses: topCourses.map(c => ({ id: c.id, title: c.title, enrolment_count: c.enrolmentCount, avg_rating: c.avgRating })),
  });
}

export = {
  listCourses, getCourse, updateCourse, publishCourse, unpublishCourse,
  listEducators, verifyEducator, suspendEducator, reinstateEducator, stats,
};
