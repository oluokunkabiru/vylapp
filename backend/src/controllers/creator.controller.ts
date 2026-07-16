import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import CreatorEconomyEngine from "../services/creatorEconomyEngine";
import NotificationEngine from "../services/notificationEngine";
import ravenRoutes from "../routes/raven.routes";
import prisma from "../config/prisma";

const { ok, fail } = respond;
const { isBoosted } = ravenRoutes;

// The frontend (CreatorEarnings.jsx, Dashboard.jsx) reads these two shapes in
// snake_case directly off API responses — preserve that instead of leaking
// Prisma's camelCase model shape through unshaped.
function shapeProfile(p: any) {
  if (!p) return null;
  return {
    user_id: p.userId, bio_extended: p.bioExtended, categories: p.categories, social_links: p.socialLinks,
    stripe_account_id: p.stripeAccountId, stripe_onboarded: p.stripeOnboarded, payout_schedule: p.payoutSchedule,
    minimum_payout_usd: p.minimumPayoutUsd, total_earned_usd: p.totalEarnedUsd, total_withdrawn_usd: p.totalWithdrawnUsd,
    pending_balance_usd: p.pendingBalanceUsd, subscriber_count: p.subscriberCount,
    created_at: p.createdAt, updated_at: p.updatedAt,
  };
}

function shapeTier(t: any) {
  return {
    id: t.id, creator_id: t.creatorId, name: t.name, description: t.description,
    price_usd: t.priceUsd, billing_period: t.billingPeriod, perks: t.perks,
    max_subscribers: t.maxSubscribers, active: t.active, sort_order: t.sortOrder,
    created_at: t.createdAt, updated_at: t.updatedAt,
  };
}

// ── GET /creator/:userId/profile ─────────────────────────────────────────
async function getProfile(req: AuthedRequest, res: Response) {
  const [profile, tiers, products] = await Promise.all([
    prisma.creatorProfiles.findUnique({ where: { userId: req.params.userId } }),
    prisma.creatorSubscriptionTiers.findMany({ where: { creatorId: req.params.userId, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.digitalProducts.findMany({
      where: { creatorId: req.params.userId, active: true },
      select: { id: true, title: true, description: true, previewUrl: true, priceUsd: true, purchasesCount: true },
    }),
  ]);
  return ok(res, { profile: shapeProfile(profile), tiers: tiers.map(shapeTier), products });
}

// ── POST /creator/profile — become a creator / update profile ───────────
async function upsertProfile(req: AuthedRequest, res: Response) {
  const { bioExtended, categories, socialLinks, payoutSchedule } = req.body;
  await prisma.users.update({ where: { id: req.user.id }, data: { isCreator: true } });
  const profile = await prisma.creatorProfiles.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      bioExtended: bioExtended || null,
      categories: categories || [],
      socialLinks: socialLinks || {},
      payoutSchedule: payoutSchedule || "weekly",
    },
    update: {
      bioExtended: bioExtended || null,
      categories: categories || [],
      socialLinks: socialLinks || {},
      payoutSchedule: payoutSchedule || "weekly",
    },
  });
  return ok(res, { profile });
}

// ── POST /creator/:userId/tiers — create a subscription tier ─────────────
async function createTier(req: AuthedRequest, res: Response) {
  const { name, description, priceUsd, billingPeriod, perks } = req.body;
  if (!name || !priceUsd) return fail(res, 400, "name and priceUsd are required");
  const tier = await prisma.creatorSubscriptionTiers.create({
    data: {
      creatorId: req.user.id,
      name,
      description: description || null,
      priceUsd,
      billingPeriod: billingPeriod || "monthly",
      perks: perks || [],
    },
  });
  return ok(res, { tier }, 201);
}

// ── POST /creator/:creatorId/subscribe ────────────────────────────────────
async function subscribe(req: AuthedRequest, res: Response) {
  const { tierId } = req.body;
  const tier = await prisma.creatorSubscriptionTiers.findFirst({ where: { id: tierId, creatorId: req.params.creatorId } });
  if (!tier) return fail(res, 404, "Tier not found");

  const { boosted, reason: boostReason } = await isBoosted(req.params.creatorId);
  const split = CreatorEconomyEngine.splitSubscription(Number(tier.priceUsd), boosted);
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + (tier.billingPeriod === "annual" ? 365 : 30));

  const sub = await prisma.creatorSubscriptions.upsert({
    where: { subscriberId_creatorId: { subscriberId: req.user.id, creatorId: req.params.creatorId } },
    create: {
      subscriberId: req.user.id,
      creatorId: req.params.creatorId,
      tierId,
      priceUsd: tier.priceUsd,
      currentPeriodEnd: periodEnd,
    },
    update: {
      tierId,
      priceUsd: tier.priceUsd,
      status: "active",
      currentPeriodEnd: periodEnd,
    },
  });
  await prisma.transactions.create({
    data: {
      userId: req.user.id,
      counterpartyId: req.params.creatorId,
      type: "creator_subscription",
      direction: "debit",
      amountUsd: tier.priceUsd,
      platformFeeUsd: split.platform_cut,
      netUsd: tier.priceUsd,
      description: "Creator subscription",
      metadata: { rate: split.rate, boosted, boostReason },
    },
  });
  await prisma.creatorProfiles.update({
    where: { userId: req.params.creatorId },
    data: {
      subscriberCount: { increment: 1 },
      totalEarnedUsd: { increment: split.creator_net },
      pendingBalanceUsd: { increment: split.creator_net },
    },
  });
  const body = NotificationEngine.formatBody("creator_sub", req.user.displayName);
  await prisma.notifications.create({
    data: { userId: req.params.creatorId, actorId: req.user.id, type: "creator_sub", body },
  });

  return ok(res, { subscription: sub, split }, 201);
}

// ── POST /creator/:creatorId/super-vibe — tip a creator on a vibe ────────
async function superVibe(req: AuthedRequest, res: Response) {
  const { amountUsd, vibeId, emoji, message } = req.body;
  if (!amountUsd || amountUsd <= 0) return fail(res, 400, "amountUsd must be positive");
  const { boosted, reason: boostReason } = await isBoosted(req.params.creatorId);
  const split = CreatorEconomyEngine.splitSuperVibe(amountUsd, boosted);

  const superVibeRow = await prisma.superVibes.create({
    data: {
      senderId: req.user.id,
      recipientId: req.params.creatorId,
      vibeId: vibeId || null,
      amountUsd,
      emoji: emoji || "⚡",
      message: message || null,
      platformFeeUsd: split.platform_cut,
      creatorNetUsd: split.creator_net,
    },
  });
  await prisma.transactions.create({
    data: {
      userId: req.user.id,
      counterpartyId: req.params.creatorId,
      type: "super_vibe",
      direction: "debit",
      amountUsd,
      platformFeeUsd: split.platform_cut,
      netUsd: amountUsd,
      description: "Super Vibe tip",
      metadata: { rate: split.rate, boosted, boostReason },
    },
  });
  await prisma.creatorProfiles.upsert({
    where: { userId: req.params.creatorId },
    create: { userId: req.params.creatorId, totalEarnedUsd: split.creator_net, pendingBalanceUsd: split.creator_net },
    update: {
      totalEarnedUsd: { increment: split.creator_net },
      pendingBalanceUsd: { increment: split.creator_net },
    },
  });
  await prisma.users.update({
    where: { id: req.params.creatorId },
    data: { creatorEarningsUsd: { increment: split.creator_net } },
  });
  const body = NotificationEngine.formatBody("creator_tip", req.user.displayName, { amount: amountUsd });
  await prisma.notifications.create({
    data: { userId: req.params.creatorId, actorId: req.user.id, type: "creator_tip", vibeId: vibeId || null, body },
  });

  return ok(res, { superVibe: superVibeRow, split }, 201);
}

// ── GET /creator/me/earnings ──────────────────────────────────────────────
async function earnings(req: AuthedRequest, res: Response) {
  const [profile, ledger] = await Promise.all([
    prisma.creatorProfiles.findUnique({ where: { userId: req.user.id } }),
    prisma.transactions.findMany({
      where: { counterpartyId: req.user.id, direction: "debit" },
      select: { type: true, netUsd: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  // CreatorEconomyEngine.calculatePayout (still plain JS) reads e.net_usd —
  // shape to snake_case for it, same as the frontend's TxRow/ledger reads.
  const shapedLedger = ledger.map(e => ({ type: e.type, net_usd: e.netUsd, created_at: e.createdAt }));
  const payout = CreatorEconomyEngine.calculatePayout(shapedLedger);
  const boost = await isBoosted(req.user.id);
  return ok(res, { profile: shapeProfile(profile), recentLedger: shapedLedger, nextPayout: payout, revenueShare: boost });
}

// ── POST /creator/me/payout-request ───────────────────────────────────────
async function payoutRequest(req: AuthedRequest, res: Response) {
  const profile = await prisma.creatorProfiles.findUnique({ where: { userId: req.user.id }, select: { pendingBalanceUsd: true } });
  if (!profile || Number(profile.pendingBalanceUsd) < 10) {
    return fail(res, 400, "Balance below the $10 payout minimum");
  }
  const amount = Number(profile.pendingBalanceUsd);
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const payout = await prisma.creatorPayouts.create({
    data: { creatorId: req.user.id, amountUsd: amount, periodStart, periodEnd },
  });
  await prisma.creatorProfiles.update({
    where: { userId: req.user.id },
    data: { pendingBalanceUsd: 0, totalWithdrawnUsd: { increment: amount } },
  });
  return ok(res, { payout, note: "Payout recorded in the ledger. Wiring a real payout (Stripe Connect transfer) is the one piece that requires a regulated external processor." }, 201);
}

export = { getProfile, upsertProfile, createTier, subscribe, superVibe, earnings, payoutRequest };
