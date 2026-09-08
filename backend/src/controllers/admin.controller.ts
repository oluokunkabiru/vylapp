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
import ModerationQueue from "../services/moderationQueue";
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

function compactPerson(user: any) {
  return { id: user.id, handle: user.handle, display_name: user.displayName, avatar_url: user.avatarUrl };
}

// ── GET /admin/users/:id — account review, social graph, content and audit trail ──
// Deliberately excludes password hashes, OAuth/provider tokens, 2FA secrets and
// recovery codes. Admin review needs account context, never authentication secrets.
async function getUserDetails(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, handle: true, email: true, displayName: true, bio: true, website: true, location: true,
      currentCountry: true, currentCity: true, heritageCountries: true, avatarUrl: true, bannerUrl: true,
      roleTag: true, verified: true, verificationTier: true, isCreator: true, isAdmin: true, isBot: true,
      isMinor: true, provider: true, twoFactorEnabled: true, phone: true, phoneVerifiedAt: true,
      online: true, lastSeen: true, onboardingDone: true, interests: true, contentLanguage: true,
      privateAccount: true, allowDms: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionEndsAt: true,
      vibesCount: true, connectionsCount: true, followingCount: true, spacesHosted: true, creatorEarningsUsd: true,
      isSuspended: true, suspendedAt: true, suspendedReason: true, isDeactivated: true, deactivatedAt: true,
      createdAt: true, updatedAt: true,
    },
  });
  if (!user) return fail(res, 404, "User not found");

  const [access, vibes, followers, following, spaces, activity, notifications, reports, vibeTotal, followerTotal, followingTotal, spaceTotal, activityTotal, notificationTotal] = await Promise.all([
    rbac.getUserPermissionSummary(user.id),
    prisma.vibes.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, content: true, category: true, replyTo: true, quoteOf: true, isDeleted: true, createdAt: true, likesCount: true, repostsCount: true, repliesCount: true, viewsCount: true },
    }),
    prisma.connections.findMany({
      where: { followingId: user.id }, orderBy: { createdAt: "desc" }, take: 50,
      include: { usersConnectionsFollowerIdTousers: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.connections.findMany({
      where: { followerId: user.id }, orderBy: { createdAt: "desc" }, take: 50,
      include: { usersConnectionsFollowingIdTousers: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.spaces.findMany({
      where: { hostId: user.id }, orderBy: { createdAt: "desc" }, take: 30,
      select: { id: true, title: true, status: true, listenersCount: true, peakListeners: true, createdAt: true, startedAt: true, endedAt: true },
    }),
    prisma.userActivityLog.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
    }),
    prisma.notifications.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30,
      include: { usersNotificationsActorIdTousers: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.reports.count({ where: { OR: [{ reporterId: user.id }, { reportedUserId: user.id }] } }),
    prisma.vibes.count({ where: { userId: user.id } }),
    prisma.connections.count({ where: { followingId: user.id } }),
    prisma.connections.count({ where: { followerId: user.id } }),
    prisma.spaces.count({ where: { hostId: user.id } }),
    prisma.userActivityLog.count({ where: { userId: user.id } }),
    prisma.notifications.count({ where: { userId: user.id } }),
  ]);

  return ok(res, {
    user: { ...shapeUser(user), bio: user.bio, website: user.website, location: user.location, current_country: user.currentCountry, current_city: user.currentCity,
      heritage_countries: user.heritageCountries, banner_url: user.bannerUrl, role_tag: user.roleTag, verification_tier: user.verificationTier,
      is_minor: user.isMinor, provider: user.provider, two_factor_enabled: user.twoFactorEnabled, phone: user.phone, phone_verified_at: user.phoneVerifiedAt,
      online: user.online, last_seen: user.lastSeen, onboarding_done: user.onboardingDone, interests: user.interests, content_language: user.contentLanguage,
      private_account: user.privateAccount, allow_dms: user.allowDms, subscription_plan: user.subscriptionPlan, subscription_status: user.subscriptionStatus,
      subscription_ends_at: user.subscriptionEndsAt, vibes_count: user.vibesCount, connections_count: user.connectionsCount, following_count: user.followingCount,
      spaces_hosted: user.spacesHosted, creator_earnings_usd: Number(user.creatorEarningsUsd), updated_at: user.updatedAt },
    access: { roles: access.globalRoles.map((role: any) => ({ name: role.name, description: role.description })), permissions: access.effectivePermissions },
    content: { vibes, spaces },
    connections: {
      followers: followers.map(row => ({ user: compactPerson(row.usersConnectionsFollowerIdTousers), created_at: row.createdAt })),
      following: following.map(row => ({ user: compactPerson(row.usersConnectionsFollowingIdTousers), created_at: row.createdAt })),
    },
    activity: activity.map(entry => ({ id: entry.id, action: entry.action, entity_type: entry.entityType, entity_id: entry.entityId, metadata: entry.metadata, created_at: entry.createdAt })),
    notifications: notifications.map(note => ({ id: note.id, type: note.type, body: note.body, vibe_id: note.vibeId, space_id: note.spaceId, created_at: note.createdAt, actor: note.usersNotificationsActorIdTousers ? compactPerson(note.usersNotificationsActorIdTousers) : null })),
    moderation: { reports_involved: reports },
    totals: { vibes: vibeTotal, followers: followerTotal, following: followingTotal, spaces: spaceTotal, activity: activityTotal, notifications: notificationTotal },
  });
}

// ── POST /admin/users/:id/suspend ─────────────────────────────────────────────
// A-13: reason is mandatory — a suspension with no recorded "why" leaves
// nothing for a future reviewer or an appeal to go on.
async function suspendUser(req: AuthedRequest, res: Response) {
  if (req.params.id === req.user.id) return fail(res, 400, "Cannot suspend your own account");
  const { reason } = req.body;
  if (!String(reason || "").trim()) return fail(res, 400, "reason is required to suspend an account");
  const before = await prisma.users.findUnique({ where: { id: req.params.id }, select: { isSuspended: true, suspendedAt: true, suspendedReason: true } });
  if (!before) return fail(res, 404, "User not found");

  const user = await prisma.users.update({
    where: { id: req.params.id },
    data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason },
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
// A-13: reason mandatory, same as suspend. Users has no deactivated_reason
// column (unlike suspendedReason) — not worth a migration for this alone,
// so the reason is captured in the audit log's afterData, which is already
// the system-of-record for "who did what and why" (see listAuditLog).
async function deactivateUser(req: AuthedRequest, res: Response) {
  if (req.params.id === req.user.id) return fail(res, 400, "Cannot deactivate your own account");
  const { reason } = req.body;
  if (!String(reason || "").trim()) return fail(res, 400, "reason is required to deactivate an account");
  const before = await prisma.users.findUnique({ where: { id: req.params.id }, select: { isDeactivated: true, deactivatedAt: true } });
  if (!before) return fail(res, 404, "User not found");

  const user = await prisma.users.update({
    where: { id: req.params.id },
    data: { isDeactivated: true, deactivatedAt: new Date() },
    select: { id: true, isDeactivated: true, deactivatedAt: true },
  });
  await writeAudit(req.user.id, "user.deactivate", "user", req.params.id, before, { ...user, reason }, req.ip || null);
  return ok(res, { user: shapeUser({ ...user }) });
}

// ── GET /admin/analytics/trends?days=30 ───────────────────────────────────────
async function analyticsTrends(req: AuthedRequest, res: Response) {
  const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || "30", 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const [newUsers, newVibes, revenue, currentUsers, previousUsers, currentVibes, previousVibes, currentConnections, previousConnections, currentEngagement, previousEngagement, currentRevenue, previousRevenue] = await Promise.all([
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM users WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM vibes WHERE created_at >= ${since} AND is_deleted = FALSE GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; total: number }[]>`
      SELECT date_trunc('day', created_at) AS day, COALESCE(SUM(platform_fee_usd), 0)::float AS total
      FROM transactions WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.users.count({ where: { createdAt: { gte: since } } }),
    prisma.users.count({ where: { createdAt: { gte: previousSince, lt: since } } }),
    prisma.vibes.count({ where: { createdAt: { gte: since }, isDeleted: false } }),
    prisma.vibes.count({ where: { createdAt: { gte: previousSince, lt: since }, isDeleted: false } }),
    prisma.connections.count({ where: { createdAt: { gte: since } } }),
    prisma.connections.count({ where: { createdAt: { gte: previousSince, lt: since } } }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT (SELECT COUNT(*) FROM vibe_likes WHERE created_at >= ${since}) + (SELECT COUNT(*) FROM vibe_reposts WHERE created_at >= ${since}) + (SELECT COUNT(*) FROM vibes WHERE reply_to IS NOT NULL AND created_at >= ${since}) AS count`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT (SELECT COUNT(*) FROM vibe_likes WHERE created_at >= ${previousSince} AND created_at < ${since}) + (SELECT COUNT(*) FROM vibe_reposts WHERE created_at >= ${previousSince} AND created_at < ${since}) + (SELECT COUNT(*) FROM vibes WHERE reply_to IS NOT NULL AND created_at >= ${previousSince} AND created_at < ${since}) AS count`,
    prisma.transactions.aggregate({ where: { createdAt: { gte: since } }, _sum: { platformFeeUsd: true } }),
    prisma.transactions.aggregate({ where: { createdAt: { gte: previousSince, lt: since } }, _sum: { platformFeeUsd: true } }),
  ]);

  const toSeries = (rows: { day: Date }[], valueKey: string) =>
    rows.map(r => ({ date: r.day.toISOString().slice(0, 10), value: Number((r as any)[valueKey]) }));

  return ok(res, {
    days,
    new_users: toSeries(newUsers, "count"),
    new_vibes: toSeries(newVibes, "count"),
    revenue_usd: toSeries(revenue, "total"),
    comparison: {
      current: { users: currentUsers, vibes: currentVibes, connections: currentConnections, engagement: Number(currentEngagement[0]?.count || 0), revenue_usd: Number(currentRevenue._sum.platformFeeUsd || 0) },
      previous: { users: previousUsers, vibes: previousVibes, connections: previousConnections, engagement: Number(previousEngagement[0]?.count || 0), revenue_usd: Number(previousRevenue._sum.platformFeeUsd || 0) },
    },
  });
}

// ── GET /admin/moderation/queue ───────────────────────────────────────────────
// A-06/A-07: worst-first, minor-target-first — see moderationQueue.ts.
async function moderationQueue(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const status = ((req.query.status as string) || "pending") as ReportStatus;

  const { reports, total } = await ModerationQueue.fetchPrioritizedReports(status, skip, pageSize);
  return ok(res, { reports, page, page_size: pageSize, total });
}

// ── POST /admin/moderation/bulk-action ────────────────────────────────────────
// body: { reportIds: string[], action: "dismiss" | "resolve" | "remove_content", reason? }
// A-13: reason is mandatory for the two actions that actually do something
// destructive (resolve implies "warned/actioned", remove_content deletes
// real content) — "dismiss" just closes the report with no effect on the
// user/content, so it's left optional.
async function moderationBulkAction(req: AuthedRequest, res: Response) {
  const { reportIds, action, reason } = req.body;
  if (!Array.isArray(reportIds) || !reportIds.length) return fail(res, 400, "reportIds must be a non-empty array");
  if (!["dismiss", "resolve", "remove_content"].includes(action)) return fail(res, 400, "Invalid action");
  if (action !== "dismiss" && !String(reason || "").trim()) {
    return fail(res, 400, "reason is required for resolve/remove_content");
  }

  const reports = await prisma.reports.findMany({ where: { id: { in: reportIds } }, select: { id: true, reportedVibeId: true, reportedUserId: true, reportedSpaceId: true, reportedMessageId: true } });
  const statusMap = { dismiss: "dismissed", resolve: "resolved_action", remove_content: "resolved_action" } as const;
  const actionTakenMap = { dismiss: "none", resolve: "none", remove_content: "removed" } as const;

  // Same targetUserId-population bug fixed in moderation.controller.ts's
  // resolveReport — this createMany path never set it either, so trust
  // scores computed from bulk-actioned reports were silently undercounted.
  const targetUserIds = await Promise.all(reports.map(r => ModerationQueue.resolveTargetUserId(r)));

  await prisma.$transaction(async (tx) => {
    await tx.reports.updateMany({
      where: { id: { in: reportIds } },
      data: { status: statusMap[action as keyof typeof statusMap], actionTaken: actionTakenMap[action as keyof typeof actionTakenMap], reviewedBy: req.user.id, reviewedAt: new Date() },
    });
    await tx.moderationActions.createMany({
      data: reports.map((r, i) => ({
        moderatorId: req.user.id, action: actionTakenMap[action as keyof typeof actionTakenMap], reportId: r.id,
        reason: reason || "Bulk admin action (dismissed, no action taken)",
        targetUserId: targetUserIds[i], targetVibeId: r.reportedVibeId || null,
      })),
    });
    if (action === "remove_content") {
      const vibeIds = reports.map(r => r.reportedVibeId).filter((id): id is string => !!id);
      if (vibeIds.length) {
        await tx.vibes.updateMany({ where: { id: { in: vibeIds } }, data: { isDeleted: true, deletedAt: new Date(), moderationNote: reason || "Removed via admin bulk action" } });
      }
    }
  });

  await writeAudit(req.user.id, `moderation.bulk_${action}`, "report", null, { reportIds }, { count: reportIds.length, reason: reason || null }, req.ip || null);
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
  me, listUsers, getUserDetails, suspendUser, reinstateUser, deactivateUser,
  analyticsTrends, moderationQueue, moderationBulkAction, listAuditLog,
};
