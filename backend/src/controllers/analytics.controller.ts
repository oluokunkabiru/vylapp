import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import AnalyticsEngine from "../services/analyticsEngine";
import prisma from "../config/prisma";

const { ok } = respond;

// ── GET /analytics/creator/me — creator dashboard snapshot ──────────────
async function creatorSnapshot(req: AuthedRequest, res: Response) {
  const [user, impressions, creatorProfile, tierAvg] = await Promise.all([
    prisma.users.findUnique({ where: { id: req.user.id }, select: { connectionsCount: true, vibesCount: true } }),
    prisma.vibes.aggregate({ _sum: { viewsCount: true, likesCount: true }, where: { userId: req.user.id } }),
    prisma.creatorProfiles.findUnique({ where: { userId: req.user.id }, select: { subscriberCount: true } }),
    prisma.creatorSubscriptionTiers.aggregate({ _avg: { priceUsd: true }, where: { creatorId: req.user.id } }),
  ]);

  const snapshot = AnalyticsEngine.creatorSnapshot({
    followers: user?.connectionsCount || 0,
    prev_followers: user?.connectionsCount || 0,
    impressions: impressions._sum.viewsCount || 0,
    engagements: impressions._sum.likesCount || 0,
    subscribers: creatorProfile?.subscriberCount || 0,
    sub_price: Number(tierAvg._avg.priceUsd || 0),
  });
  return ok(res, { snapshot });
}

// ── GET /analytics/platform — admin-only platform metrics ────────────────
async function platform(req: AuthedRequest, res: Response) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [dauRows, mauRows, totalUsers, totalVibes, revenue] = await Promise.all([
    prisma.userActivityLog.findMany({ where: { createdAt: { gt: oneDayAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.userActivityLog.findMany({ where: { createdAt: { gt: thirtyDaysAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.users.count(),
    prisma.vibes.count({ where: { isDeleted: false } }),
    prisma.transactions.aggregate({ _sum: { platformFeeUsd: true } }),
  ]);

  const dau = dauRows.length;
  const mau = mauRows.length || 1;
  const stickiness = AnalyticsEngine.stickinessRatio(dau, mau);
  return ok(res, {
    totalUsers,
    totalVibes,
    platformRevenueUsd: Number(revenue._sum.platformFeeUsd || 0),
    stickiness,
  });
}

export = { creatorSnapshot, platform };
