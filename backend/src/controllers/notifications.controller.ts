import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import NotificationEngine from "../services/notificationEngine";
import prisma from "../config/prisma";

const { ok, fail } = respond;

function shapeNotification(row: any) {
  const actor = row.usersNotificationsActorIdTousers;
  return {
    id: row.id, type: row.type, body: row.body, isRead: row.isRead, createdAt: row.createdAt,
    actor: actor ? { id: actor.id, handle: actor.handle, displayName: actor.displayName, avatarColor: actor.avatarColor, avatarInitials: actor.avatarInitials, verified: actor.verificationTier !== "none" } : null,
    vibeId: row.vibeId, spaceId: row.spaceId, conversationId: row.conversationId,
    // G: grouping — groupCount > 1 means this card already represents
    // several like/repost events collapsed into one (see vibes.controller.ts's
    // createOrGroupNotification); most notifications are still 1:1 and this
    // is just always 1 for them.
    groupCount: row.groupCount,
  };
}

// ── GET /notifications ───────────────────────────────────────────────────
async function list(req: AuthedRequest, res: Response) {
  const rows = await prisma.notifications.findMany({
    where: { userId: req.user.id },
    include: {
      usersNotificationsActorIdTousers: {
        select: { id: true, handle: true, displayName: true, avatarColor: true, avatarInitials: true, verificationTier: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const ranked = NotificationEngine.rankNotifications(rows.map(shapeNotification), { muted_types: [] });
  const unreadCount = rows.filter(r => !r.isRead).length;
  return ok(res, { notifications: ranked, unreadCount });
}

// ── POST /notifications/:id/read ─────────────────────────────────────────
async function markRead(req: AuthedRequest, res: Response) {
  await prisma.notifications.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true, readAt: new Date() },
  });
  return ok(res, { read: true });
}

// ── POST /notifications/read-all ─────────────────────────────────────────
async function markAllRead(req: AuthedRequest, res: Response) {
  await prisma.notifications.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return ok(res, { allRead: true });
}

// ── GET /notifications/digest ─────────────────────────────────────────────
async function digest(req: AuthedRequest, res: Response) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentFollowers, impressions, earnings] = await Promise.all([
    prisma.connections.count({ where: { followingId: req.user.id, createdAt: { gt: since } } }),
    prisma.vibes.aggregate({ _sum: { viewsCount: true }, where: { userId: req.user.id, createdAt: { gt: since } } }),
    prisma.transactions.aggregate({ _sum: { netUsd: true }, where: { counterpartyId: req.user.id, direction: "debit", createdAt: { gt: since } } }),
  ]);

  const generated = NotificationEngine.generateDigest({
    new_followers: recentFollowers,
    impressions: impressions._sum.viewsCount || 0,
    earnings: Number(earnings._sum.netUsd || 0),
  });
  return ok(res, { digest: generated });
}

// ── PATCH /notifications/preferences ─────────────────────────────────────
// email_reposts/email_spaces/push_reposts/push_spaces/email_marketing had
// schema columns and zero way to set them via this endpoint — filled in
// alongside the G (quiet hours) gap below, same class of bug.
const ALLOWED_PREFS: Record<string, string> = {
  email_likes: "emailLikes", email_reposts: "emailReposts", email_follows: "emailFollows", email_mentions: "emailMentions",
  email_dms: "emailDms", email_spaces: "emailSpaces", email_marketing: "emailMarketing",
  push_likes: "pushLikes", push_reposts: "pushReposts", push_follows: "pushFollows", push_mentions: "pushMentions",
  push_dms: "pushDms", push_spaces: "pushSpaces",
  in_app_all: "inAppAll",
};

// HH:MM (24h, e.g. "22:30") -> a Date Prisma can store into a @db.Time
// column. Postgres TIME has no timezone of its own — the wall-clock value
// is interpreted against quiet_hours_timezone at read time (pushEngine.ts).
function parseTimeOfDay(value: unknown): Date | null {
  if (value === null) return null; // explicit clear
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) return undefined as any;
  return new Date(`1970-01-01T${value}:00Z`);
}

async function updatePreferences(req: AuthedRequest, res: Response) {
  const data: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (key in ALLOWED_PREFS) { data[ALLOWED_PREFS[key]] = val; continue; }
    // G: quiet hours — schema fields (quiet_hours_start/end/timezone)
    // existed with no way to set them; pushEngine.ts's sendToUser() is the
    // consumer (see that file for the actual suppression logic).
    if (key === "quiet_hours_start" || key === "quiet_hours_end") {
      const parsed = parseTimeOfDay(val);
      if (parsed === undefined) return fail(res, 400, `${key} must be "HH:MM" (24h) or null`);
      data[key === "quiet_hours_start" ? "quietHoursStart" : "quietHoursEnd"] = parsed;
    } else if (key === "quiet_hours_timezone") {
      if (val !== null && typeof val !== "string") return fail(res, 400, "quiet_hours_timezone must be an IANA timezone string or null");
      data.quietHoursTimezone = val;
    }
  }
  if (!Object.keys(data).length) return fail(res, 400, "No valid preference fields");

  await prisma.notificationPreferences.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  });
  return ok(res, { updated: true });
}

// ── POST /notifications/push-token — register/refresh an FCM device token ──
async function registerPushToken(req: AuthedRequest, res: Response) {
  const { token, platform, deviceName } = req.body;
  if (!token || !platform) return fail(res, 400, "token and platform are required");

  await prisma.pushTokens.upsert({
    where: { token },
    create: { userId: req.user.id, token, platform, deviceName: deviceName || null },
    update: { userId: req.user.id, platform, deviceName: deviceName || null, active: true },
  });
  return ok(res, { registered: true });
}

export = { list, markRead, markAllRead, digest, updatePreferences, registerPushToken };
