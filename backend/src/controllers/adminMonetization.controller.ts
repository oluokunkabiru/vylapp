// ════════════════════════════════════════════════════════════════════════════
//  ADMIN MONETIZATION CONTROLLER  /admin/monetization/*
//
//  Revenue visibility and creator-payout operations. Payout status here is a
//  data-state change only — per the README's "Pending items", Stripe Connect
//  is schema-only with no actual money movement wired up yet. Marking a
//  payout paid/failed reflects reality once the money side exists; it does
//  not itself move money.
//  Sits behind requireAdmin + creator.manage at the router level.
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import SubscriptionEngine from "../services/subscriptionEngine";
import { PayoutStatus, SubscriptionStatus } from "../generated/prisma";

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

// ── GET /admin/monetization/overview?days=30 ──────────────────────────────────
async function overview(req: AuthedRequest, res: Response) {
  const days = Math.min(365, Math.max(1, parseInt((req.query.days as string) || "30", 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byType, totals, pendingPayouts] = await Promise.all([
    prisma.transactions.groupBy({
      by: ["type"], where: { createdAt: { gte: since } },
      _sum: { amountUsd: true, platformFeeUsd: true }, _count: { _all: true },
    }),
    prisma.$queryRaw<{ gross: number; fees: number; count: bigint }[]>`
      SELECT COALESCE(SUM(amount_usd), 0)::float AS gross, COALESCE(SUM(platform_fee_usd), 0)::float AS fees, COUNT(*)::bigint AS count
      FROM transactions WHERE created_at >= ${since}
    `,
    prisma.creatorPayouts.aggregate({ where: { status: "pending" }, _sum: { amountUsd: true }, _count: { _all: true } }),
  ]);

  return ok(res, {
    days,
    by_type: byType.map(r => ({ type: r.type, gross_usd: Number(r._sum.amountUsd || 0), platform_fee_usd: Number(r._sum.platformFeeUsd || 0), count: r._count._all })),
    gross_usd: Number(totals[0]?.gross || 0),
    platform_fee_usd: Number(totals[0]?.fees || 0),
    transaction_count: Number(totals[0]?.count || 0),
    pending_payouts_usd: Number(pendingPayouts._sum.amountUsd || 0),
    pending_payouts_count: pendingPayouts._count._all,
  });
}

function shapePayout(p: any) {
  return {
    id: p.id, amount_usd: p.amountUsd, status: p.status, period_start: p.periodStart, period_end: p.periodEnd,
    paid_at: p.paidAt, failed_at: p.failedAt, failure_reason: p.failureReason, created_at: p.createdAt,
    creator: { id: p.users.id, handle: p.users.handle, display_name: p.users.displayName },
  };
}

// ── GET /admin/monetization/payouts ────────────────────────────────────────────
async function listPayouts(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { status } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status && status !== "all") where.status = status as PayoutStatus;

  const [payouts, total] = await Promise.all([
    prisma.creatorPayouts.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { users: { select: { id: true, handle: true, displayName: true } } },
    }),
    prisma.creatorPayouts.count({ where }),
  ]);
  return ok(res, { payouts: payouts.map(shapePayout), page, page_size: pageSize, total });
}

// ── POST /admin/monetization/payouts/:id/mark-paid ────────────────────────────
async function markPayoutPaid(req: AuthedRequest, res: Response) {
  const before = await prisma.creatorPayouts.findUnique({ where: { id: req.params.id }, select: { status: true, creatorId: true, amountUsd: true } });
  if (!before) return fail(res, 404, "Payout not found");

  const { stripe_payout_id } = req.body;
  const payout = await prisma.$transaction(async (tx) => {
    const updated = await tx.creatorPayouts.update({
      where: { id: req.params.id },
      data: { status: "paid", paidAt: new Date(), stripePayoutId: stripe_payout_id || null },
      select: { id: true, status: true, paidAt: true },
    });
    await tx.creatorProfiles.update({
      where: { userId: before.creatorId },
      data: { totalWithdrawnUsd: { increment: before.amountUsd }, pendingBalanceUsd: { decrement: before.amountUsd } },
    }).catch(() => {});
    return updated;
  });
  await writeAudit(req.user.id, "monetization.payout.mark_paid", "creator_payout", req.params.id, before, payout, req.ip || null);
  return ok(res, { payout });
}

// ── POST /admin/monetization/payouts/:id/mark-failed ──────────────────────────
async function markPayoutFailed(req: AuthedRequest, res: Response) {
  const before = await prisma.creatorPayouts.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!before) return fail(res, 404, "Payout not found");

  const { reason } = req.body;
  const payout = await prisma.creatorPayouts.update({
    where: { id: req.params.id },
    data: { status: "failed", failedAt: new Date(), failureReason: reason || null },
    select: { id: true, status: true, failedAt: true, failureReason: true },
  });
  await writeAudit(req.user.id, "monetization.payout.mark_failed", "creator_payout", req.params.id, before, payout, req.ip || null);
  return ok(res, { payout });
}

// ── GET /admin/monetization/creators ──────────────────────────────────────────
async function listCreators(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (q?.trim()) where.users = { handle: { contains: q.trim(), mode: "insensitive" } };

  const [creators, total] = await Promise.all([
    prisma.creatorProfiles.findMany({
      where, skip, take: pageSize, orderBy: { totalEarnedUsd: "desc" },
      include: { users: { select: { id: true, handle: true, displayName: true } } },
    }),
    prisma.creatorProfiles.count({ where }),
  ]);

  const shaped = creators.map(c => ({
    user: { id: c.users.id, handle: c.users.handle, display_name: c.users.displayName },
    stripe_onboarded: c.stripeOnboarded, payout_schedule: c.payoutSchedule,
    total_earned_usd: c.totalEarnedUsd, total_withdrawn_usd: c.totalWithdrawnUsd, pending_balance_usd: c.pendingBalanceUsd,
    subscriber_count: c.subscriberCount,
  }));
  return ok(res, { creators: shaped, page, page_size: pageSize, total });
}

// ── GET /admin/monetization/subscribers ────────────────────────────────────────
async function listSubscribers(req: AuthedRequest, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const { plan, status } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (plan && plan !== "all") where.plan = plan;
  if (status && status !== "all") where.status = status as SubscriptionStatus;

  const [subs, total] = await Promise.all([
    prisma.platformSubscriptions.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { users: { select: { id: true, handle: true, displayName: true } } },
    }),
    prisma.platformSubscriptions.count({ where }),
  ]);

  const shaped = subs.map(s => ({
    id: s.id, plan: s.plan, status: s.status, price_usd: s.priceUsd, billing_period: s.billingPeriod,
    current_period_end: s.currentPeriodEnd, cancelled_at: s.cancelledAt, created_at: s.createdAt,
    user: { id: s.users.id, handle: s.users.handle, display_name: s.users.displayName },
  }));
  return ok(res, { subscribers: shaped, page, page_size: pageSize, total, plans: SubscriptionEngine.PLANS });
}

export = { overview, listPayouts, markPayoutPaid, markPayoutFailed, listCreators, listSubscribers };
