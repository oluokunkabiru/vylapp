import { Request, Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";

const { ok, fail } = respond;

function publicUser(row: any, viewerFollows?: boolean) {
  return {
    id: row.id, handle: row.handle, displayName: row.displayName, bio: row.bio,
    location: row.location, website: row.website,
    currentCountry: row.currentCountry, currentCity: row.currentCity, heritageCountries: row.heritageCountries,
    avatarColor: row.avatarColor, avatarInitials: row.avatarInitials, avatarUrl: row.avatarUrl,
    bannerUrl: row.bannerUrl, roleTag: row.roleTag, verified: row.verified,
    verificationTier: row.verificationTier, isCreator: row.isCreator,
    vibesCount: row.vibesCount, connectionsCount: row.connectionsCount, followingCount: row.followingCount,
    spacesHosted: row.spacesHosted, createdAt: row.createdAt,
    viewerFollows: viewerFollows ?? undefined,
  };
}

// ── GET /users/discover — diaspora discovery by current/heritage country ─
// Registered before /:handle so "discover" isn't swallowed as a handle lookup.
async function discover(req: AuthedRequest, res: Response) {
  const country = String(req.query.country || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return fail(res, 400, "country must be a 2-letter country code");

  const users = await prisma.users.findMany({
    where: {
      deletedAt: null,
      id: { not: req.user.id },
      OR: [{ currentCountry: country }, { heritageCountries: { has: country } }],
    },
    orderBy: { connectionsCount: "desc" },
    take: 20,
  });
  return ok(res, { users: users.map(r => publicUser(r)) });
}

// ── GET /users/:handle ───────────────────────────────────────────────────
async function getByHandle(req: Request, res: Response) {
  const user = await prisma.users.findFirst({ where: { handle: req.params.handle, deletedAt: null } });
  if (!user) return fail(res, 404, "User not found");
  let viewerFollows: boolean | undefined;
  if (req.user) {
    const f = await prisma.connections.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
    });
    viewerFollows = !!f;
  }
  return ok(res, { user: publicUser(user, viewerFollows) });
}

// ── PATCH /users/me ──────────────────────────────────────────────────────
const ALLOWED_ME_FIELDS: Record<string, string> = {
  display_name: "displayName", bio: "bio", location: "location", website: "website",
  avatar_color: "avatarColor", avatar_url: "avatarUrl", banner_url: "bannerUrl", private_account: "privateAccount",
};

async function updateMe(req: AuthedRequest, res: Response) {
  const data: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(req.body)) {
    const col = key.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
    if (!(col in ALLOWED_ME_FIELDS)) continue;
    data[ALLOWED_ME_FIELDS[col]] = val;
  }
  if (!Object.keys(data).length) return fail(res, 400, "No valid fields to update");
  const user = await prisma.users.update({ where: { id: req.user.id }, data });
  return ok(res, { user: publicUser(user) });
}

// ── POST /users/:id/connect (follow) ─────────────────────────────────────
async function connect(req: AuthedRequest, res: Response) {
  const targetId = req.params.id;
  if (targetId === req.user.id) return fail(res, 400, "Cannot connect with yourself");
  const target = await prisma.users.findUnique({ where: { id: targetId }, select: { id: true, privateAccount: true } });
  if (!target) return fail(res, 404, "User not found");

  if (target.privateAccount) {
    await prisma.connectionRequests.upsert({
      where: { requesterId_targetId: { requesterId: req.user.id, targetId } },
      create: { requesterId: req.user.id, targetId },
      update: {},
    });
    await prisma.notifications.create({
      data: { userId: targetId, actorId: req.user.id, type: "connection_request", body: "sent you a connection request" },
    });
    return ok(res, { status: "requested" });
  }

  await prisma.connections.upsert({
    where: { followerId_followingId: { followerId: req.user.id, followingId: targetId } },
    create: { followerId: req.user.id, followingId: targetId },
    update: {},
  });
  await prisma.notifications.create({
    data: { userId: targetId, actorId: req.user.id, type: "follow", body: "started connecting with you" },
  });
  return ok(res, { status: "connected" });
}

// ── DELETE /users/:id/connect (unfollow) ─────────────────────────────────
async function disconnect(req: AuthedRequest, res: Response) {
  await prisma.connections.deleteMany({ where: { followerId: req.user.id, followingId: req.params.id } });
  return ok(res, { status: "disconnected" });
}

// ── GET /users/:id/connections (followers) ───────────────────────────────
async function listConnections(req: Request, res: Response) {
  const rows = await prisma.connections.findMany({
    where: { followingId: req.params.id },
    include: { usersConnectionsFollowerIdTousers: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(res, { connections: rows.map(r => publicUser(r.usersConnectionsFollowerIdTousers)) });
}

// ── GET /users/:id/following ──────────────────────────────────────────────
async function listFollowing(req: Request, res: Response) {
  const rows = await prisma.connections.findMany({
    where: { followerId: req.params.id },
    include: { usersConnectionsFollowingIdTousers: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(res, { following: rows.map(r => publicUser(r.usersConnectionsFollowingIdTousers)) });
}

// ── POST /users/:id/block ────────────────────────────────────────────────
async function block(req: AuthedRequest, res: Response) {
  await prisma.userBlocks.upsert({
    where: { blockerId_blockedId: { blockerId: req.user.id, blockedId: req.params.id } },
    create: { blockerId: req.user.id, blockedId: req.params.id },
    update: {},
  });
  await prisma.connections.deleteMany({
    where: {
      OR: [
        { followerId: req.user.id, followingId: req.params.id },
        { followerId: req.params.id, followingId: req.user.id },
      ],
    },
  });
  return ok(res, { blocked: true });
}

async function unblock(req: AuthedRequest, res: Response) {
  await prisma.userBlocks.deleteMany({ where: { blockerId: req.user.id, blockedId: req.params.id } });
  return ok(res, { blocked: false });
}

// ── POST /users/:id/mute ─────────────────────────────────────────────────
async function mute(req: AuthedRequest, res: Response) {
  await prisma.userMutes.upsert({
    where: { muterId_mutedId: { muterId: req.user.id, mutedId: req.params.id } },
    create: { muterId: req.user.id, mutedId: req.params.id },
    update: {},
  });
  return ok(res, { muted: true });
}

export = { publicUser, discover, getByHandle, updateMe, connect, disconnect, listConnections, listFollowing, block, unblock, mute };
