import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import SpacesEngine from "../services/spacesEngine";
import NotificationEngine from "../services/notificationEngine";
import CreatorEconomyEngine from "../services/creatorEconomyEngine";
import ravenRoutes from "../routes/raven.routes";
import prisma from "../config/prisma";

const { ok, fail } = respond;
const { isBoosted } = ravenRoutes;

function shapeSpace(row: any) {
  return {
    id: row.id, title: row.title, description: row.description, category: row.category,
    tags: row.tags, color: row.color, isVideo: row.is_video, isTicketed: row.is_ticketed,
    ticketPriceUsd: row.ticket_price_usd, status: row.status,
    scheduledFor: row.scheduled_for, startedAt: row.started_at, endedAt: row.ended_at,
    listenersCount: row.listeners_count, peakListeners: row.peak_listeners, speakersCount: row.speakers_count,
    totalTipsUsd: row.total_tips_usd, recordingUrl: row.recording_url,
    host: { id: row.host_id, handle: row.handle, displayName: row.display_name, avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, verified: row.verified },
    createdAt: row.created_at,
  };
}

// Kept as a raw column list ($queryRaw below) for the same reason as
// vibes.controller.ts's VIBE_FIELDS: preserves the exact join/ordering
// (status='live' first, NULLS LAST) and the snake_case shape shapeSpace
// already expects.
const SPACE_FIELDS = `s.*, u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.verified`;

// ── GET /spaces — live + upcoming ─────────────────────────────────────────
async function list(req: AuthedRequest, res: Response) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${SPACE_FIELDS} FROM spaces s JOIN users u ON u.id = s.host_id
     WHERE s.status IN ('live','scheduled') ORDER BY (s.status = 'live') DESC, s.scheduled_for ASC NULLS LAST, s.created_at DESC LIMIT 50
  `);
  return ok(res, { spaces: rows.map(shapeSpace) });
}

// ── POST /spaces — create / schedule ─────────────────────────────────────
async function create(req: AuthedRequest, res: Response) {
  const { title, description, category, tags, isVideo, scheduledFor, ticketPriceUsd } = req.body;
  if (!title?.trim()) return fail(res, 400, "title is required");
  const space = await prisma.spaces.create({
    data: {
      hostId: req.user.id,
      title: title.trim(),
      description: description || null,
      category: category || "GENERAL",
      tags: tags || [],
      isVideo: !!isVideo,
      isTicketed: !!ticketPriceUsd,
      ticketPriceUsd: ticketPriceUsd || null,
      status: "scheduled",
      scheduledFor: scheduledFor || null,
    },
  });
  await prisma.conversations.create({
    data: { type: "space_chat", name: title, spaceId: space.id, createdBy: req.user.id },
  }).catch(() => {});
  return ok(res, {
    space: shapeSpace({
      id: space.id, title: space.title, description: space.description, category: space.category,
      tags: space.tags, color: space.color, is_video: space.isVideo, is_ticketed: space.isTicketed,
      ticket_price_usd: space.ticketPriceUsd, status: space.status,
      scheduled_for: space.scheduledFor, started_at: space.startedAt, ended_at: space.endedAt,
      listeners_count: space.listenersCount, peak_listeners: space.peakListeners, speakers_count: space.speakersCount,
      total_tips_usd: space.totalTipsUsd, recording_url: space.recordingUrl, created_at: space.createdAt,
      host_id: space.hostId, handle: req.user.handle, display_name: req.user.displayName,
    }),
    calendarLinks: SpacesEngine.calendarLinks(title, space.id),
  }, 201);
}

// ── POST /spaces/:id/start ────────────────────────────────────────────────
async function start(req: AuthedRequest, res: Response) {
  const space = await prisma.spaces.findUnique({ where: { id: req.params.id }, select: { hostId: true } });
  if (!space) return fail(res, 404, "Space not found");
  if (space.hostId !== req.user.id) return fail(res, 403, "Only the host can start this Space");
  await prisma.spaces.update({ where: { id: req.params.id }, data: { status: "live", startedAt: new Date() } });

  // Notify followers
  const followers = await prisma.connections.findMany({
    where: { followingId: req.user.id, notifySpaces: true },
    select: { followerId: true },
  });
  const body = NotificationEngine.formatBody("space_live", req.user.displayName);
  for (const f of followers) {
    await prisma.notifications.create({
      data: { userId: f.followerId, actorId: req.user.id, type: "space_live", spaceId: req.params.id, body },
    });
  }
  return ok(res, { status: "live" });
}

// ── POST /spaces/:id/end ─────────────────────────────────────────────────
async function end(req: AuthedRequest, res: Response) {
  const space = await prisma.spaces.findUnique({ where: { id: req.params.id }, select: { hostId: true, startedAt: true, peakListeners: true } });
  if (!space) return fail(res, 404, "Space not found");
  if (space.hostId !== req.user.id) return fail(res, 403, "Only the host can end this Space");
  const durationSeconds = space.startedAt ? Math.floor((Date.now() - space.startedAt.getTime()) / 1000) : 0;
  await prisma.spaces.update({ where: { id: req.params.id }, data: { status: "ended", endedAt: new Date(), durationSeconds } });
  return ok(res, { status: "ended", durationSeconds, peakListeners: space.peakListeners });
}

// ── POST /spaces/:id/join ────────────────────────────────────────────────
async function join(req: AuthedRequest, res: Response) {
  const space = await prisma.spaces.findUnique({ where: { id: req.params.id } });
  if (!space) return fail(res, 404, "Space not found");
  const role = space.hostId === req.user.id ? "host" : "listener";

  await prisma.spaceParticipants.upsert({
    where: { spaceId_userId: { spaceId: req.params.id, userId: req.user.id } },
    create: { spaceId: req.params.id, userId: req.user.id, role },
    update: { leftAt: null, role },
  });
  // GREATEST needs the post-increment value, so this stays a single raw
  // statement rather than a read-then-compare round trip.
  const updated: { listeners_count: number }[] = await prisma.$queryRaw`
    UPDATE spaces SET listeners_count = listeners_count + 1, peak_listeners = GREATEST(peak_listeners, listeners_count + 1)
     WHERE id = ${req.params.id} RETURNING listeners_count
  `;
  return ok(res, {
    role, listenersCount: updated[0].listeners_count,
    rtcToken: SpacesEngine.generateRtcToken(),
    translationToken: SpacesEngine.generateTranslationToken(),
  });
}

// ── POST /spaces/:id/leave ───────────────────────────────────────────────
async function leave(req: AuthedRequest, res: Response) {
  await prisma.spaceParticipants.updateMany({
    where: { spaceId: req.params.id, userId: req.user.id },
    data: { leftAt: new Date() },
  });
  await prisma.$executeRaw`UPDATE spaces SET listeners_count = GREATEST(0, listeners_count - 1) WHERE id = ${req.params.id}`;
  return ok(res, { left: true });
}

// ── POST /spaces/:id/remind ──────────────────────────────────────────────
async function remind(req: AuthedRequest, res: Response) {
  await prisma.spaceReminders.upsert({
    where: { spaceId_userId: { spaceId: req.params.id, userId: req.user.id } },
    create: { spaceId: req.params.id, userId: req.user.id },
    update: {},
  });
  return ok(res, { reminderSet: true });
}

// ── POST /spaces/:id/tip ─────────────────────────────────────────────────
async function tip(req: AuthedRequest, res: Response) {
  const { amountUsd, message } = req.body;
  if (!amountUsd || amountUsd <= 0) return fail(res, 400, "amountUsd must be positive");
  const space = await prisma.spaces.findUnique({ where: { id: req.params.id }, select: { hostId: true } });
  if (!space) return fail(res, 404, "Space not found");
  const { boosted, reason: boostReason } = await isBoosted(space.hostId);
  const split = CreatorEconomyEngine.splitSuperVibe(amountUsd, boosted);
  const tipRow = await prisma.spaceTips.create({
    data: { spaceId: req.params.id, tipperId: req.user.id, recipientId: space.hostId, amountUsd, message: message || null },
  });
  await prisma.spaces.update({ where: { id: req.params.id }, data: { totalTipsUsd: { increment: amountUsd } } });
  await prisma.transactions.create({
    data: {
      userId: req.user.id, counterpartyId: space.hostId, type: "tip", direction: "debit",
      amountUsd, platformFeeUsd: split.platform_cut, netUsd: amountUsd, description: "Space tip",
      metadata: { rate: split.rate, boosted, boostReason },
    },
  });
  return ok(res, { tip: tipRow, split }, 201);
}

export = { shapeSpace, list, create, start, end, join, leave, remind, tip };
