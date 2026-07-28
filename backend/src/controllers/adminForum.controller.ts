// ════════════════════════════════════════════════════════════════════════════
//  ADMIN FORUM CONTROLLER  /admin/forum/*
//
//  Structural forum management: categories/boards and community moderator
//  assignment. Thread-level actions (pin/lock/remove) already have a working
//  endpoint at PATCH /forum/threads/:id (forum.controller.ts) which a
//  platform admin can call directly via forum.thread.delete.any — this
//  controller adds the cross-category admin thread listing that endpoint's
//  single-category counterpart (GET /forum/categories/:slug/threads) can't
//  provide, plus category CRUD and moderator management.
//  Sits behind requireAdmin + admin.content.manage at the router level.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import { ThreadStatus, ForumModRole } from "../generated/prisma";

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

function shapeCategory(c: any) {
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description, parent_id: c.parentId,
    topic_category: c.topicCategory, color: c.color, icon: c.icon, sort_order: c.sortOrder,
    is_active: c.isActive, thread_count: c.threadCount, created_at: c.createdAt,
  };
}

// ── GET /admin/forum/categories ────────────────────────────────────────────────
// Includes inactive categories — the public /forum/categories only returns active ones.
async function listCategories(req: AuthedRequest, res: Response) {
  const categories = await prisma.forumCategories.findMany({ orderBy: { sortOrder: "asc" } });
  return ok(res, { categories: categories.map(shapeCategory) });
}

// ── POST /admin/forum/categories ───────────────────────────────────────────────
async function createCategory(req: AuthedRequest, res: Response) {
  const { slug, name, description, topic_category, color, icon, sort_order } = req.body;
  if (!slug?.trim() || !name?.trim()) return fail(res, 400, "slug and name are required");

  const category = await prisma.forumCategories.create({
    data: {
      slug: slug.trim(), name: name.trim(), description: description || null,
      topicCategory: topic_category || null, color: color || null, icon: icon || null,
      sortOrder: sort_order ?? 0,
    },
  });
  await writeAudit(req.user.id, "forum.category.create", "forum_category", category.id, null, category, req.ip || null);
  return ok(res, { category: shapeCategory(category) }, 201);
}

// ── PATCH /admin/forum/categories/:id ──────────────────────────────────────────
async function updateCategory(req: AuthedRequest, res: Response) {
  const before = await prisma.forumCategories.findUnique({ where: { id: req.params.id } });
  if (!before) return fail(res, 404, "Category not found");

  const { name, description, color, icon, sort_order, is_active } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = String(name).trim();
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;
  if (icon !== undefined) data.icon = icon;
  if (sort_order !== undefined) data.sortOrder = sort_order;
  if (is_active !== undefined) data.isActive = !!is_active;
  if (!Object.keys(data).length) return fail(res, 400, "No valid fields to update");

  const category = await prisma.forumCategories.update({ where: { id: req.params.id }, data });
  await writeAudit(req.user.id, "forum.category.update", "forum_category", req.params.id, before, category, req.ip || null);
  return ok(res, { category: shapeCategory(category) });
}

// ── GET /admin/forum/threads — cross-category, any status ────────────────────
async function listThreads(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { status, category_id, q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status && status !== "all") where.status = status as ThreadStatus;
  if (category_id) where.categoryId = category_id;
  if (q?.trim()) where.title = { contains: q.trim(), mode: "insensitive" };

  const [threads, total] = await Promise.all([
    prisma.forumThreads.findMany({
      where, skip, take: pageSize, orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        users: { select: { id: true, handle: true, displayName: true } },
        forumCategories: { select: { id: true, slug: true, name: true } },
      },
    }),
    prisma.forumThreads.count({ where }),
  ]);

  const shaped = threads.map(t => ({
    id: t.id, title: t.title, status: t.status, is_pinned: t.isPinned, is_announcement: t.isAnnouncement,
    view_count: t.viewCount, reply_count: t.replyCount, vote_score: t.voteScore, tags: t.tags,
    moderation_note: t.moderationNote, created_at: t.createdAt, last_reply_at: t.lastReplyAt,
    author: { id: t.users.id, handle: t.users.handle, display_name: t.users.displayName },
    category: t.forumCategories,
  }));
  return ok(res, { threads: shaped, page, page_size: pageSize, total });
}

function shapeModerator(m: any) {
  return {
    id: m.id, role: m.role, permissions: m.permissions, assigned_at: m.assignedAt, expires_at: m.expiresAt,
    user: { id: m.usersCommunityModeratorsUserIdTousers.id, handle: m.usersCommunityModeratorsUserIdTousers.handle, display_name: m.usersCommunityModeratorsUserIdTousers.displayName },
  };
}

// ── GET /admin/forum/categories/:id/moderators ────────────────────────────────
async function listModerators(req: AuthedRequest, res: Response) {
  const moderators = await prisma.communityModerators.findMany({
    where: { categoryId: req.params.id },
    include: { usersCommunityModeratorsUserIdTousers: { select: { id: true, handle: true, displayName: true } } },
    orderBy: { assignedAt: "desc" },
  });
  return ok(res, { moderators: moderators.map(shapeModerator) });
}

// ── POST /admin/forum/categories/:id/moderators — body: { handle, role? } ────
async function addModerator(req: AuthedRequest, res: Response) {
  const { handle, role } = req.body;
  if (!handle?.trim()) return fail(res, 400, "handle is required");

  const user = await prisma.users.findUnique({ where: { handle: handle.trim() }, select: { id: true } });
  if (!user) return fail(res, 404, "No user with that handle");

  const existing = await prisma.communityModerators.count({ where: { categoryId: req.params.id } });
  if (existing >= 5) return fail(res, 400, "A category can have at most 5 moderators");

  const moderator = await prisma.communityModerators.create({
    data: { categoryId: req.params.id, userId: user.id, role: (role || "moderator") as ForumModRole, assignedBy: req.user.id },
    include: { usersCommunityModeratorsUserIdTousers: { select: { id: true, handle: true, displayName: true } } },
  });
  await writeAudit(req.user.id, "forum.moderator.add", "community_moderator", moderator.id, null, { userId: user.id, categoryId: req.params.id }, req.ip || null);
  return ok(res, { moderator: shapeModerator(moderator) }, 201);
}

// ── DELETE /admin/forum/moderators/:id ────────────────────────────────────────
async function removeModerator(req: AuthedRequest, res: Response) {
  const moderator = await prisma.communityModerators.findUnique({ where: { id: req.params.id } });
  if (!moderator) return fail(res, 404, "Moderator assignment not found");

  await prisma.communityModerators.delete({ where: { id: req.params.id } });
  await writeAudit(req.user.id, "forum.moderator.remove", "community_moderator", req.params.id, moderator, null, req.ip || null);
  return ok(res, { removed: true });
}

export = { listCategories, createCategory, updateCategory, listThreads, listModerators, addModerator, removeModerator };
