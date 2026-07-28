// ════════════════════════════════════════════════════════════════════════════
//  ADMIN CONTENT CONTROLLER  /admin/content/*
//
//  Direct content browsing/moderation for Vibes and Spaces — separate from
//  the report-driven queue in admin.controller.ts (moderationQueue). This
//  lets an admin search and act on any vibe/space even if nobody reported it.
//  Sits behind requireAdmin + admin.content.manage at the router level.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";

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

function shapeVibe(v: any) {
  return {
    id: v.id, content: v.content, category: v.category, language: v.language, tags: v.tags,
    likes_count: v.likesCount, reposts_count: v.repostsCount, replies_count: v.repliesCount, views_count: v.viewsCount,
    is_sensitive: v.isSensitive, is_deleted: v.isDeleted, deleted_at: v.deletedAt, moderation_note: v.moderationNote,
    created_at: v.createdAt,
    author: { id: v.users.id, handle: v.users.handle, display_name: v.users.displayName, avatar_url: v.users.avatarUrl },
  };
}

// ── GET /admin/content/vibes ──────────────────────────────────────────────────
async function listVibes(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { q, author, category, status } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status === "deleted") where.isDeleted = true;
  else if (status === "active") where.isDeleted = false;
  if (category) where.category = category;
  if (q?.trim()) where.content = { contains: q.trim(), mode: "insensitive" };
  if (author?.trim()) where.users = { handle: { contains: author.trim(), mode: "insensitive" } };

  const [vibes, total] = await Promise.all([
    prisma.vibes.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { users: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.vibes.count({ where }),
  ]);
  return ok(res, { vibes: vibes.map(shapeVibe), page, page_size: pageSize, total });
}

// ── POST /admin/content/vibes/:id/remove ──────────────────────────────────────
async function removeVibe(req: AuthedRequest, res: Response) {
  const { reason } = req.body;
  const before = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { isDeleted: true, moderationNote: true } });
  if (!before) return fail(res, 404, "Vibe not found");

  const vibe = await prisma.vibes.update({
    where: { id: req.params.id },
    data: { isDeleted: true, deletedAt: new Date(), moderationNote: reason || "Removed by admin" },
    select: { id: true, isDeleted: true, moderationNote: true },
  });
  await writeAudit(req.user.id, "content.vibe.remove", "vibe", req.params.id, before, vibe, req.ip || null);
  return ok(res, { vibe });
}

// ── POST /admin/content/vibes/:id/restore ─────────────────────────────────────
async function restoreVibe(req: AuthedRequest, res: Response) {
  const before = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { isDeleted: true, moderationNote: true } });
  if (!before) return fail(res, 404, "Vibe not found");

  const vibe = await prisma.vibes.update({
    where: { id: req.params.id },
    data: { isDeleted: false, deletedAt: null, moderationNote: null },
    select: { id: true, isDeleted: true },
  });
  await writeAudit(req.user.id, "content.vibe.restore", "vibe", req.params.id, before, vibe, req.ip || null);
  return ok(res, { vibe });
}

function shapeSpaceAdmin(s: any) {
  return {
    id: s.id, title: s.title, description: s.description, category: s.category, status: s.status,
    is_video: s.isVideo, is_ticketed: s.isTicketed, ticket_price_usd: s.ticketPriceUsd,
    scheduled_for: s.scheduledFor, started_at: s.startedAt, ended_at: s.endedAt, duration_seconds: s.durationSeconds,
    listeners_count: s.listenersCount, peak_listeners: s.peakListeners, speakers_count: s.speakersCount,
    total_tips_usd: s.totalTipsUsd, recording_url: s.recordingUrl, created_at: s.createdAt,
    host: { id: s.users.id, handle: s.users.handle, display_name: s.users.displayName },
  };
}

// ── GET /admin/content/spaces ──────────────────────────────────────────────────
async function listSpaces(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { status, q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (q?.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { users: { handle: { contains: q.trim(), mode: "insensitive" } } },
    ];
  }

  const [spaces, total] = await Promise.all([
    prisma.spaces.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { users: { select: { id: true, handle: true, displayName: true } } },
    }),
    prisma.spaces.count({ where }),
  ]);
  return ok(res, { spaces: spaces.map(shapeSpaceAdmin), page, page_size: pageSize, total });
}

// ── POST /admin/content/spaces/:id/end — force-end regardless of host ────────
async function forceEndSpace(req: AuthedRequest, res: Response) {
  const space = await prisma.spaces.findUnique({ where: { id: req.params.id }, select: { status: true, startedAt: true, peakListeners: true } });
  if (!space) return fail(res, 404, "Space not found");
  if (space.status === "ended" || space.status === "cancelled") return fail(res, 400, "Space already ended");

  const durationSeconds = space.startedAt ? Math.floor((Date.now() - space.startedAt.getTime()) / 1000) : 0;
  const updated = await prisma.spaces.update({
    where: { id: req.params.id },
    data: { status: "ended", endedAt: new Date(), durationSeconds },
    select: { id: true, status: true, durationSeconds: true },
  });
  await writeAudit(req.user.id, "content.space.force_end", "space", req.params.id, space, updated, req.ip || null);
  return ok(res, { space: updated });
}

// ── GET /admin/content/spaces/:id/participants ────────────────────────────────
async function spaceParticipants(req: AuthedRequest, res: Response) {
  const rows = await prisma.spaceParticipants.findMany({
    where: { spaceId: req.params.id, leftAt: null },
    include: { users: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const shaped = rows.map(r => ({
    user: { id: r.users.id, handle: r.users.handle, display_name: r.users.displayName, avatar_url: r.users.avatarUrl },
    role: r.role, joined_at: r.joinedAt, was_speaker: r.wasSpeaker, tip_total_usd: r.tipTotalUsd,
  }));
  return ok(res, { participants: shaped });
}

export = { listVibes, removeVibe, restoreVibe, listSpaces, forceEndSpace, spaceParticipants };
