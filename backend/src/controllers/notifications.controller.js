const { ok, fail } = require("../utils/respond");
const NotificationEngine = require("../services/notificationEngine");
const prisma = require("../config/prisma");

function shapeNotification(row) {
  const actor = row.usersNotificationsActorIdTousers;
  return {
    id: row.id, type: row.type, body: row.body, isRead: row.isRead, createdAt: row.createdAt,
    actor: actor ? { id: actor.id, handle: actor.handle, displayName: actor.displayName, avatarColor: actor.avatarColor, avatarInitials: actor.avatarInitials, verified: actor.verified } : null,
    vibeId: row.vibeId, spaceId: row.spaceId, conversationId: row.conversationId,
  };
}

// ── GET /notifications ───────────────────────────────────────────────────
async function list(req, res) {
  const rows = await prisma.notifications.findMany({
    where: { userId: req.user.id },
    include: {
      usersNotificationsActorIdTousers: {
        select: { id: true, handle: true, displayName: true, avatarColor: true, avatarInitials: true, verified: true },
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
async function markRead(req, res) {
  await prisma.notifications.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true, readAt: new Date() },
  });
  return ok(res, { read: true });
}

// ── POST /notifications/read-all ─────────────────────────────────────────
async function markAllRead(req, res) {
  await prisma.notifications.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return ok(res, { allRead: true });
}

// ── GET /notifications/digest ─────────────────────────────────────────────
async function digest(req, res) {
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
const ALLOWED_PREFS = {
  email_likes: "emailLikes", email_follows: "emailFollows", email_mentions: "emailMentions", email_dms: "emailDms",
  push_likes: "pushLikes", push_follows: "pushFollows", push_mentions: "pushMentions", push_dms: "pushDms",
  in_app_all: "inAppAll",
};

async function updatePreferences(req, res) {
  const data = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (!(key in ALLOWED_PREFS)) continue;
    data[ALLOWED_PREFS[key]] = val;
  }
  if (!Object.keys(data).length) return fail(res, 400, "No valid preference fields");

  await prisma.notificationPreferences.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  });
  return ok(res, { updated: true });
}

module.exports = { list, markRead, markAllRead, digest, updatePreferences };
