import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import ModerationEngine from "../services/moderationEngine";
import prisma from "../config/prisma";
import { ReportReason, ReportStatus } from "../generated/prisma";

const { ok, fail } = respond;

// ── POST /moderation/reports ─────────────────────────────────────────────
async function createReport(req: AuthedRequest, res: Response) {
  const { reason, detail, vibeId, userId, spaceId, messageId } = req.body;
  if (!reason) return fail(res, 400, "reason is required");
  const report = await prisma.reports.create({
    data: {
      reporterId: req.user.id,
      reportedVibeId: vibeId || null,
      reportedUserId: userId || null,
      reportedSpaceId: spaceId || null,
      reportedMessageId: messageId || null,
      reason: reason as ReportReason,
      detail: detail || null,
    },
  });

  // Auto-analyze if it's content we can read directly
  let analysis = null;
  if (vibeId) {
    const vibe = await prisma.vibes.findUnique({ where: { id: vibeId }, select: { content: true } });
    if (vibe) {
      const reportCount = await prisma.reports.count({ where: { reportedVibeId: vibeId } });
      // Original route never awaited this (analyzeContent is async) — analysis
      // was always an unresolved Promise, so the auto-remove-on-repeated-reports
      // branch below never actually ran. Fixed here; see commit message.
      analysis = await ModerationEngine.analyzeContent(vibe.content, { report_count: reportCount });
      if (analysis.action === "remove" || analysis.action === "remove_and_support") {
        await prisma.vibes.update({
          where: { id: vibeId },
          data: { isDeleted: true, deletedAt: new Date(), moderationNote: analysis.label },
        });
      }
    }
  }

  return ok(res, { report, analysis }, 201);
}

// ── GET /moderation/reports — admin queue ────────────────────────────────
async function listReports(req: AuthedRequest, res: Response) {
  const status = (req.query.status as string) || "pending";
  const reports = await prisma.reports.findMany({
    where: { status: status as ReportStatus },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(res, { reports });
}

// ── POST /moderation/reports/:id/resolve — admin action ──────────────────
async function resolveReport(req: AuthedRequest, res: Response) {
  const { actionTaken, status } = req.body; // 'removed'|'warned'|'suspended'|'none'
  await prisma.reports.update({
    where: { id: req.params.id },
    data: {
      status: (status || "resolved_action") as ReportStatus,
      actionTaken: actionTaken || "none",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });
  await prisma.moderationActions.create({
    data: { moderatorId: req.user.id, action: actionTaken || "none", reportId: req.params.id, reason: "Resolved via report queue" },
  });
  return ok(res, { resolved: true });
}

// ── GET /moderation/trust-score/:userId ──────────────────────────────────
async function trustScore(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({ where: { id: req.params.userId }, select: { createdAt: true } });
  if (!user) return fail(res, 404, "User not found");
  const violations = await prisma.moderationActions.count({ where: { targetUserId: req.params.userId } });
  const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000);
  const score = ModerationEngine.trustScore({ age_days: ageDays, violations });
  await prisma.trustSignals.upsert({
    where: { userId: req.params.userId },
    create: { userId: req.params.userId, trustScore: score.score },
    update: { trustScore: score.score, lastCalculated: new Date() },
  });
  return ok(res, { score });
}

export = { createReport, listReports, resolveReport, trustScore };
