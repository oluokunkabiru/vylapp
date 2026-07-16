import { Request, Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import SubscriptionEngine from "../services/subscriptionEngine";
import prisma from "../config/prisma";
import { SubscriptionPlan, SubscriptionStatus } from "../generated/prisma";

const { ok, fail } = respond;

// ── GET /subscriptions/plans ─────────────────────────────────────────────
async function plans(req: Request, res: Response) {
  return ok(res, { plans: SubscriptionEngine.PLANS });
}

// ── POST /subscriptions/upgrade ──────────────────────────────────────────
async function upgrade(req: AuthedRequest, res: Response) {
  const { planId, billingPeriod } = req.body;
  const plan = SubscriptionEngine.planDetails(planId);
  if (!plan) return fail(res, 400, "Invalid plan");

  const periodEnd = SubscriptionEngine.billingPeriodEnd(planId, billingPeriod);
  const subscription = await prisma.platformSubscriptions.create({
    data: {
      userId: req.user.id,
      plan: planId as SubscriptionPlan,
      priceUsd: plan.price,
      billingPeriod: billingPeriod || "monthly",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.users.update({
    where: { id: req.user.id },
    data: {
      subscriptionPlan: planId as SubscriptionPlan,
      subscriptionStatus: "active" as SubscriptionStatus,
      subscriptionEndsAt: periodEnd,
      ...(plan.features.translation_langs ? { translationEnabled: true } : {}),
    },
  });

  return ok(res, { subscription, features: plan.features }, 201);
}

// ── POST /subscriptions/cancel ────────────────────────────────────────────
async function cancel(req: AuthedRequest, res: Response) {
  await prisma.platformSubscriptions.updateMany({
    where: { userId: req.user.id, status: "active" as SubscriptionStatus },
    data: { status: "cancelled" as SubscriptionStatus, cancelledAt: new Date() },
  });
  await prisma.users.update({ where: { id: req.user.id }, data: { subscriptionPlan: "free" as SubscriptionPlan } });
  return ok(res, { cancelled: true });
}

// ── GET /subscriptions/me/usage ──────────────────────────────────────────
async function usage(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { subscriptionPlan: true } });
  const usageSummary = SubscriptionEngine.usageSummary(user!.subscriptionPlan, {});
  return ok(res, { plan: user!.subscriptionPlan, usage: usageSummary });
}

export = { plans, upgrade, cancel, usage };
