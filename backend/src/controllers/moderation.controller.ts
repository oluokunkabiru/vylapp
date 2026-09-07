import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import ModerationEngine from "../services/moderationEngine";
import ModerationQueue from "../services/moderationQueue";
import prisma from "../config/prisma";
import { ReportReason, ReportStatus } from "../generated/prisma";

const { ok, fail } = respond;

// ── POST /moderation/reports ─────────────────────────────────────────────
async function createReport(req: AuthedRequest, res: Response) {
  const { reason, detail, vibeId, userId, spaceId, messageId } = req.body;
  if (!reason) return fail(res, 400, "reason is required");
  if (!Object.values(ReportReason).includes(reason as ReportReason)) return fail(res, 400, "invalid report reason");
  const targets = [vibeId, userId, spaceId, messageId].filter(Boolean);
  if (targets.length !== 1) return fail(res, 400, "exactly one report target is required");
  if (typeof detail === "string" && detail.length > 1000) return fail(res, 400, "detail must be 1000 characters or fewer");
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
    const vibe = await prisma.vibes.findUnique({ where: { id: vibeId }, select: { content: true, userId: true } });
    if (vibe) {
      const [reportCount, author] = await Promise.all([
        prisma.reports.count({ where: { reportedVibeId: vibeId } }),
        prisma.users.findUnique({ where: { id: vibe.userId }, select: { isMinor: true } }),
      ]);
      // Original route never awaited this (analyzeContent is async) — analysis
      // was always an unresolved Promise, so the auto-remove-on-repeated-reports
      // branch below never actually ran. Fixed here; see commit message.
      analysis = await ModerationEngine.analyzeContent(vibe.content, { report_count: reportCount, is_minor: author?.isMinor });
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

// ── GET /moderation/reports — moderator queue ─────────────────────────────
// A-06/A-07: worst-first, minor-target-first — see moderationQueue.ts.
async function listReports(req: AuthedRequest, res: Response) {
  const status = ((req.query.status as string) || "pending") as ReportStatus;
  const { reports } = await ModerationQueue.fetchPrioritizedReports(status, 0, 50);
  return ok(res, { reports });
}

// ── POST /moderation/reports/:id/resolve — moderator action ──────────────
// A-13: a real disciplinary action (anything but "none"/dismissed) requires
// a reason — the queue used to let "removed"/"suspended" through with a
// hardcoded "Resolved via report queue" note that told a future reviewer
// (or the affected user, on appeal) nothing about why.
async function resolveReport(req: AuthedRequest, res: Response) {
  const { actionTaken, status, reason } = req.body; // 'removed'|'warned'|'suspended'|'none'
  if (actionTaken && actionTaken !== "none" && !String(reason || "").trim()) {
    return fail(res, 400, "reason is required for a disciplinary action");
  }

  const report = await prisma.reports.findUnique({
    where: { id: req.params.id },
    select: { reportedUserId: true, reportedVibeId: true, reportedSpaceId: true, reportedMessageId: true },
  });
  if (!report) return fail(res, 404, "Report not found");

  await prisma.reports.update({
    where: { id: req.params.id },
    data: {
      status: (status || "resolved_action") as ReportStatus,
      actionTaken: actionTaken || "none",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });

  // Was previously never set — trustScore()'s violation count filters on
  // targetUserId, so every resolved report silently contributed nothing to
  // the reported user's trust score no matter how many times they'd been
  // actioned. Resolved via the same target-resolution moderationQueue.ts
  // uses for the queue's own target_is_minor join.
  const targetUserId = await ModerationQueue.resolveTargetUserId(report);

  // Real bug found while wiring A-13/appeals: this endpoint recorded
  // "removed"/"suspended" as a label on the report and in moderation_actions,
  // but never actually removed the vibe or suspended the user — an admin
  // resolving a single report believed the consequence happened; nothing
  // did. (moderationBulkAction's remove_content branch already did this
  // correctly — this single-report path just never got the same treatment.)
  if (actionTaken === "removed" && report.reportedVibeId) {
    await prisma.vibes.update({
      where: { id: report.reportedVibeId },
      data: { isDeleted: true, deletedAt: new Date(), moderationNote: reason },
    });
  }
  if (actionTaken === "suspended" && targetUserId) {
    await prisma.users.update({
      where: { id: targetUserId },
      data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason },
    });
  }

  const action = await prisma.moderationActions.create({
    data: {
      moderatorId: req.user.id, action: actionTaken || "none", reportId: req.params.id,
      reason: reason || "Resolved via report queue (no action taken)",
      targetUserId, targetVibeId: report.reportedVibeId || null,
    },
  });
  return ok(res, { resolved: true, moderationActionId: action.id });
}

// ════════════════════════════════════════════════════════════════════════════
//  APPEALS (S, rest) — `ModerationEngine.reviewAppeal()` already existed
//  with zero callers, and `moderation.appeal.review` was already seeded as
//  an RBAC permission (referenceData.sql) with nothing gated behind it —
//  the same "seeded but unconsumed" shape as A-17's feature flags and
//  V-18's RBAC-permission-with-no-endpoint. This wires both up for real.
// ════════════════════════════════════════════════════════════════════════════

// ── POST /moderation/appeals — the affected user disputes an action ──────
async function createAppeal(req: AuthedRequest, res: Response) {
  const { moderationActionId, reason } = req.body;
  if (!moderationActionId) return fail(res, 400, "moderationActionId is required");
  const trimmedReason = String(reason || "").trim();
  if (trimmedReason.length < 10) return fail(res, 400, "reason must be at least 10 characters — explain why the decision was wrong");

  const action = await prisma.moderationActions.findUnique({ where: { id: moderationActionId }, select: { id: true, targetUserId: true, action: true } });
  if (!action) return fail(res, 404, "Moderation action not found");
  // Only the person the action was actually taken against can appeal it —
  // not the original reporter, not a bystander.
  if (action.targetUserId !== req.user.id) return fail(res, 403, "You can only appeal an action taken against your own account");
  if (action.action === "none") return fail(res, 400, "This action took no disciplinary effect — nothing to appeal");

  const existing = await prisma.moderationAppeals.findUnique({ where: { moderationActionId } });
  if (existing) return fail(res, 409, "This action has already been appealed");

  const appeal = await prisma.moderationAppeals.create({
    data: { moderationActionId, userId: req.user.id, reason: trimmedReason },
  });
  return ok(res, { appeal }, 201);
}

// ── GET /moderation/appeals — reviewer queue, oldest-pending-first ───────
async function listAppeals(req: AuthedRequest, res: Response) {
  const status = ((req.query.status as string) || "pending") as "pending" | "upheld" | "overturned";
  const appeals = await prisma.moderationAppeals.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { moderationActions: { select: { action: true, reason: true, targetVibeId: true, createdAt: true } } },
  });
  return ok(res, { appeals });
}

// ── POST /moderation/appeals/:id/review — reviewer decision ──────────────
// Runs ModerationEngine.reviewAppeal() against a *fresh* analysis of the
// original content (not a stored confidence/category — none was ever
// persisted on the moderation_actions row, only the final action string
// was) so the heuristic has something real to weigh the appeal's evidence
// against. An OVERTURN automatically reverses a vibe removal (the one
// side effect that's safe to fully automate); an overturned suspension is
// recorded but still needs the reviewer to run reinstateUser themselves —
// unsuspending a real account isn't something to do without a human
// looking at it, even when the heuristic leans that way.
async function reviewAppeal(req: AuthedRequest, res: Response) {
  const appeal = await prisma.moderationAppeals.findUnique({
    where: { id: req.params.id },
    include: { moderationActions: true },
  });
  if (!appeal) return fail(res, 404, "Appeal not found");
  if (appeal.status !== "pending") return fail(res, 400, "This appeal has already been reviewed");

  let analysis = { confidence: 0.5, category: "SAFE" };
  if (appeal.moderationActions.targetVibeId) {
    const vibe = await prisma.vibes.findUnique({ where: { id: appeal.moderationActions.targetVibeId }, select: { content: true } });
    if (vibe) analysis = await ModerationEngine.analyzeContent(vibe.content, {});
  }

  const result = ModerationEngine.reviewAppeal({ evidence: appeal.reason }, analysis);
  const newStatus = result.decision === "OVERTURN" ? "overturned" : "upheld";

  await prisma.moderationAppeals.update({
    where: { id: appeal.id },
    data: { status: newStatus, decision: result.reason, reviewedBy: req.user.id, reviewedAt: new Date() },
  });

  if (newStatus === "overturned" && appeal.moderationActions.action === "removed" && appeal.moderationActions.targetVibeId) {
    await prisma.vibes.update({
      where: { id: appeal.moderationActions.targetVibeId },
      data: { isDeleted: false, deletedAt: null, moderationNote: `Restored on appeal: ${result.reason}` },
    });
  }

  return ok(res, { status: newStatus, decision: result.reason });
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

export = { createReport, listReports, resolveReport, trustScore, createAppeal, listAppeals, reviewAppeal };
