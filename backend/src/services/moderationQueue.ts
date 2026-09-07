// ════════════════════════════════════════════════════════════════════════════
//  MODERATION QUEUE — shared prioritized fetch (A-06 / A-07)
//
//  Both /moderation/reports (moderation.controller.ts, moderator-facing) and
//  /admin/moderation/queue (admin.controller.ts, admin-facing) list the same
//  underlying `reports` table with the same "what should a moderator look at
//  first" question — this is the one place that answers it, so the two
//  routes can't drift.
//
//  A-06 priority ordering: worst-content-first, not newest-first. Report
//  `reason` severity is expressed as a raw-SQL CASE rather than reordering
//  the ReportReason enum's declared values — Postgres enum labels can't be
//  reordered in place without a disruptive type rebuild, and the enum's
//  declaration order is a real DB-level contract (@@map etc.) not worth
//  touching for a queue-sort concern.
//
//  A-07 age visibility: `targetIsMinor` resolves whichever of the report's
//  four mutually-exclusive targets (vibe/user/space/message) is set, back to
//  that content's author/owner's `isMinor` flag — a minor-authored report
//  sorts to the very top regardless of reason, ahead of severity.
//
//  Also folds in same-target report count (how many other pending reports
//  point at the exact same vibe/user/space/message) as the final tiebreak —
//  a target with 5 reports outranks one with 1, before falling back to
//  oldest-first (this and the R2 gate's own "moderator response under 24h"
//  both want the oldest unresolved report surfaced, not buried under newer
//  ones of the same severity).
// ════════════════════════════════════════════════════════════════════════════
import prisma from "../config/prisma";
import { Prisma, ReportStatus } from "../generated/prisma";

interface QueuedReport {
  id: string;
  reporterId: string;
  reportedVibeId: string | null;
  reportedUserId: string | null;
  reportedSpaceId: string | null;
  reportedMessageId: string | null;
  reason: string;
  detail: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  actionTaken: string | null;
  createdAt: Date;
  targetIsMinor: boolean;
  similarReportCount: number;
}

const SEVERITY_CASE = Prisma.sql`
  CASE r.reason
    WHEN 'violence' THEN 0
    WHEN 'hate_speech' THEN 1
    WHEN 'harassment' THEN 2
    WHEN 'explicit_content' THEN 3
    WHEN 'impersonation' THEN 4
    WHEN 'misinformation' THEN 5
    WHEN 'copyright' THEN 6
    WHEN 'spam' THEN 7
    ELSE 8
  END
`;

async function fetchPrioritizedReports(status: ReportStatus, skip: number, take: number): Promise<{ reports: QueuedReport[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT
        r.id, r.reporter_id, r.reported_vibe_id, r.reported_user_id, r.reported_space_id, r.reported_message_id,
        r.reason, r.detail, r.status, r.reviewed_by, r.reviewed_at, r.action_taken, r.created_at,
        COALESCE(vu.is_minor, ru.is_minor, mu.is_minor, su.is_minor, false) AS target_is_minor,
        COALESCE(trc.cnt, 1)::int AS similar_report_count
      FROM reports r
      LEFT JOIN vibes v ON r.reported_vibe_id = v.id
      LEFT JOIN users vu ON v.user_id = vu.id
      LEFT JOIN users ru ON r.reported_user_id = ru.id
      LEFT JOIN messages m ON r.reported_message_id = m.id
      LEFT JOIN users mu ON m.sender_id = mu.id
      LEFT JOIN spaces s ON r.reported_space_id = s.id
      LEFT JOIN users su ON s.host_id = su.id
      LEFT JOIN (
        SELECT reported_vibe_id, reported_user_id, reported_space_id, reported_message_id, COUNT(*) AS cnt
        FROM reports WHERE status = ${status}::report_status
        GROUP BY reported_vibe_id, reported_user_id, reported_space_id, reported_message_id
      ) trc ON trc.reported_vibe_id IS NOT DISTINCT FROM r.reported_vibe_id
           AND trc.reported_user_id IS NOT DISTINCT FROM r.reported_user_id
           AND trc.reported_space_id IS NOT DISTINCT FROM r.reported_space_id
           AND trc.reported_message_id IS NOT DISTINCT FROM r.reported_message_id
      WHERE r.status = ${status}::report_status
      ORDER BY target_is_minor DESC, ${SEVERITY_CASE} ASC, similar_report_count DESC, r.created_at ASC
      LIMIT ${take} OFFSET ${skip}
    `,
    prisma.reports.count({ where: { status } }),
  ]);

  const reports: QueuedReport[] = rows.map(r => ({
    id: r.id, reporterId: r.reporter_id, reportedVibeId: r.reported_vibe_id, reportedUserId: r.reported_user_id,
    reportedSpaceId: r.reported_space_id, reportedMessageId: r.reported_message_id, reason: r.reason,
    detail: r.detail, status: r.status, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
    actionTaken: r.action_taken, createdAt: r.created_at,
    targetIsMinor: r.target_is_minor, similarReportCount: r.similar_report_count,
  }));

  return { reports, total };
}

// A-13-adjacent helper: resolveReport/moderationBulkAction both need to know
// *whose* isMinor-relevant moderation-action row this is (S-27 severity
// tuning and trustScore's violation count both key off ModerationActions
// .targetUserId) — a report can point at a vibe/space/message rather than a
// user directly, so this resolves it back to a concrete user id the same
// way the query above does, one report at a time.
async function resolveTargetUserId(report: { reportedUserId: string | null; reportedVibeId: string | null; reportedSpaceId: string | null; reportedMessageId: string | null }): Promise<string | null> {
  if (report.reportedUserId) return report.reportedUserId;
  if (report.reportedVibeId) {
    const v = await prisma.vibes.findUnique({ where: { id: report.reportedVibeId }, select: { userId: true } });
    return v?.userId || null;
  }
  if (report.reportedSpaceId) {
    const s = await prisma.spaces.findUnique({ where: { id: report.reportedSpaceId }, select: { hostId: true } });
    return s?.hostId || null;
  }
  if (report.reportedMessageId) {
    const m = await prisma.messages.findUnique({ where: { id: report.reportedMessageId }, select: { senderId: true } });
    return m?.senderId || null;
  }
  return null;
}

export = { fetchPrioritizedReports, resolveTargetUserId };
