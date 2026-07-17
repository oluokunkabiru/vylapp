// ════════════════════════════════════════════════════════════════════════════
//  ADMIN CONTROLLER  /admin/*
//
//  Every route here sits behind requireAdmin (admin.access) at the router
//  level; individual mutating routes additionally require a specific
//  admin.* permission (checked via requirePermission in admin.routes.ts).
//  Every mutation writes a row to admin_audit_log — this is the first thing
//  in the codebase to actually use that table.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import rbac from "../rbac";
import { ReportStatus } from "../generated/prisma";

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

function shapeUser(u: any) {
  return {
    id: u.id, handle: u.handle, email: u.email, display_name: u.displayName, avatar_url: u.avatarUrl,
    verified: u.verified, is_creator: u.isCreator, is_admin: u.isAdmin,
    is_suspended: u.isSuspended, suspended_at: u.suspendedAt, suspended_reason: u.suspendedReason,
    is_deactivated: u.isDeactivated, deactivated_at: u.deactivatedAt,
    created_at: u.createdAt,
  };
}

// ── GET /admin/me — current admin's identity + effective permission summary ──
async function me(req: AuthedRequest, res: Response) {
  const summary = await rbac.getUserPermissionSummary(req.user.id);
  return ok(res, {
    user: { id: req.user.id, handle: req.user.handle, displayName: req.user.displayName },
    roles: summary.globalRoles.map((r: any) => r.name),
    permissions: summary.effectivePermissions,
  });
}

// ── GET /admin/users — paginated, searchable user list ───────────────────────
async function listUsers(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const q = (req.query.q as string | undefined)?.trim();
  const status = (req.query.status as string) || "all";

  const where: any = {};
  if (status === "suspended") where.isSuspended = true;
  else if (status === "deactivated") where.isDeactivated = true;
  else if (status === "active") { where.isSuspended = false; where.isDeactivated = false; }

  if (q) {
    where.OR = [
      { handle: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      select: {
        id: true, handle: true, email: true, displayName: true, avatarUrl: true, verified: true,
        isCreator: true, isAdmin: true, isSuspended: true, suspendedAt: true, suspendedReason: true,
        isDeactivated: true, deactivatedAt: true, createdAt: true,
      },
    }),
    prisma.users.count({ where }),
  ]);

  return ok(res, { users: users.map(shapeUser), page, page_size: pageSize, total });
}

// ── POST /admin/users/:id/suspend ─────────────────────────────────────────────
async function suspendUser(req: AuthedRequest, res: Response) {
  if (req.params.id === req.user.id) return fail(res, 400, "Cannot suspend your own account");
  const { reason } = req.body;
  const before = await prisma.users.findUnique({ where: { id: req.params.id }, select: { isSuspended: true, suspendedAt: true, suspendedReason: true } });
  if (!before) return fail(res, 404, "User not found");

  const user = await prisma.users.update({
    where: { id: req.params.id },
    data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason || null },
    select: { id: true, isSuspended: true, suspendedAt: true, suspendedReason: true },
  });
  await writeAudit(req.user.id, "user.suspend", "user", req.params.id, before, user, req.ip || null);
  return ok(res, { user: shapeUser({ ...user }) });
}

// ── POST /admin/users/:id/reinstate ───────────────────────────────────────────
async function reinstateUser(req: AuthedRequest, res: Response) {
  const before = await prisma.users.findUnique({ where: { id: req.params.id }, select: { isSuspended: true, suspendedAt: true, suspendedReason: true } });
  if (!before) return fail(res, 404, "User not found");

  const user = await prisma.users.update({
    where: { id: req.params.id },
    data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
    select: { id: true, isSuspended: true },
  });
  await writeAudit(req.user.id, "user.reinstate", "user", req.params.id, before, user, req.ip || null);
  return ok(res, { user: shapeUser({ ...user }) });
}

// ── POST /admin/users/:id/deactivate ──────────────────────────────────────────
async function deactivateUser(req: AuthedRequest, res: Response) {
  if (req.params.id === req.user.id) return fail(res, 400, "Cannot deactivate your own account");
  const before = await prisma.users.findUnique({ where: { id: req.params.id }, select: { isDeactivated: true, deactivatedAt: true } });
  if (!before) return fail(res, 404, "User not found");

  const user = await prisma.users.update({
    where: { id: req.params.id },
    data: { isDeactivated: true, deactivatedAt: new Date() },
    select: { id: true, isDeactivated: true, deactivatedAt: true },
  });
  await writeAudit(req.user.id, "user.deactivate", "user", req.params.id, before, user, req.ip || null);
  return ok(res, { user: shapeUser({ ...user }) });
}

// ── GET /admin/analytics/trends?days=30 ───────────────────────────────────────
async function analyticsTrends(req: AuthedRequest, res: Response) {
  const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || "30", 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [newUsers, newVibes, revenue] = await Promise.all([
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM users WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM vibes WHERE created_at >= ${since} AND is_deleted = FALSE GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; total: number }[]>`
      SELECT date_trunc('day', created_at) AS day, COALESCE(SUM(platform_fee_usd), 0)::float AS total
      FROM transactions WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
  ]);

  const toSeries = (rows: { day: Date }[], valueKey: string) =>
    rows.map(r => ({ date: r.day.toISOString().slice(0, 10), value: Number((r as any)[valueKey]) }));

  return ok(res, {
    days,
    new_users: toSeries(newUsers, "count"),
    new_vibes: toSeries(newVibes, "count"),
    revenue_usd: toSeries(revenue, "total"),
  });
}

// ── GET /admin/moderation/queue ───────────────────────────────────────────────
async function moderationQueue(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const status = (req.query.status as string) || "pending";

  const [reports, total] = await Promise.all([
    prisma.reports.findMany({
      where: { status: status as ReportStatus }, skip, take: pageSize, orderBy: { createdAt: "desc" },
    }),
    prisma.reports.count({ where: { status: status as ReportStatus } }),
  ]);
  return ok(res, { reports, page, page_size: pageSize, total });
}

// ── POST /admin/moderation/bulk-action ────────────────────────────────────────
// body: { reportIds: string[], action: "dismiss" | "resolve" | "remove_content", reason? }
async function moderationBulkAction(req: AuthedRequest, res: Response) {
  const { reportIds, action, reason } = req.body;
  if (!Array.isArray(reportIds) || !reportIds.length) return fail(res, 400, "reportIds must be a non-empty array");
  if (!["dismiss", "resolve", "remove_content"].includes(action)) return fail(res, 400, "Invalid action");

  const reports = await prisma.reports.findMany({ where: { id: { in: reportIds } }, select: { id: true, reportedVibeId: true } });
  const statusMap = { dismiss: "dismissed", resolve: "resolved_action", remove_content: "resolved_action" } as const;
  const actionTakenMap = { dismiss: "none", resolve: "none", remove_content: "removed" } as const;

  await prisma.$transaction(async (tx) => {
    await tx.reports.updateMany({
      where: { id: { in: reportIds } },
      data: { status: statusMap[action as keyof typeof statusMap], actionTaken: actionTakenMap[action as keyof typeof actionTakenMap], reviewedBy: req.user.id, reviewedAt: new Date() },
    });
    await tx.moderationActions.createMany({
      data: reports.map(r => ({ moderatorId: req.user.id, action: actionTakenMap[action as keyof typeof actionTakenMap], reportId: r.id, reason: reason || "Bulk admin action" })),
    });
    if (action === "remove_content") {
      const vibeIds = reports.map(r => r.reportedVibeId).filter((id): id is string => !!id);
      if (vibeIds.length) {
        await tx.vibes.updateMany({ where: { id: { in: vibeIds } }, data: { isDeleted: true, deletedAt: new Date(), moderationNote: reason || "Removed via admin bulk action" } });
      }
    }
  });

  await writeAudit(req.user.id, `moderation.bulk_${action}`, "report", null, { reportIds }, { count: reportIds.length }, req.ip || null);
  return ok(res, { updated: reportIds.length });
}

// ── GET /admin/audit ───────────────────────────────────────────────────────────
async function listAuditLog(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const [entries, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { users: { select: { handle: true, displayName: true } } },
    }),
    prisma.adminAuditLog.count(),
  ]);

  const shaped = entries.map(e => ({
    id: e.id, action: e.action, target_type: e.targetType, target_id: e.targetId,
    before_data: e.beforeData, after_data: e.afterData, ip_address: e.ipAddress, created_at: e.createdAt,
    admin: { handle: e.users.handle, display_name: e.users.displayName },
  }));
  return ok(res, { entries: shaped, page, page_size: pageSize, total });
}

export = {
  me, listUsers, suspendUser, reinstateUser, deactivateUser,
  analyticsTrends, moderationQueue, moderationBulkAction, listAuditLog,
};
