import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import RavenEngine from "../services/ravenEngine";
import prisma from "../config/prisma";

const { ok } = respond;

// Raven points aren't in the base schema as a dedicated column, so we
// derive them from activity already tracked elsewhere (vibes, spaces,
// connections, badges) rather than adding new state to track separately.
async function computePoints(userId: string): Promise<number> {
  const [vibesCount, user, badgesCount] = await Promise.all([
    prisma.vibes.count({ where: { userId, isDeleted: false } }),
    prisma.users.findUnique({ where: { id: userId }, select: { spacesHosted: true } }),
    prisma.userBadges.count({ where: { userId } }),
  ]);
  return (
    vibesCount * RavenEngine.POINT_MAP.vibe_posted +
    (user?.spacesHosted || 0) * RavenEngine.POINT_MAP.space_hosted +
    badgesCount * 15
  );
}

// Whether a user currently qualifies for the revenue-share boost (see
// creatorEconomyEngine.js): permanent founding-member status, or having
// reached the Verified tier through points — either is sufficient.
async function isBoosted(userId: string): Promise<{ boosted: boolean; reason: string | null }> {
  const user = await prisma.users.findUnique({ where: { id: userId }, select: { isFoundingMember: true } });
  if (user?.isFoundingMember) return { boosted: true, reason: "founding" };
  const points = await computePoints(userId);
  if (RavenEngine.getTier(points).key === "verified") return { boosted: true, reason: "verified" };
  return { boosted: false, reason: null };
}

// ── GET /raven/me ─────────────────────────────────────────────────────────
async function me(req: AuthedRequest, res: Response) {
  const points = await computePoints(req.user.id);
  return ok(res, { tier: RavenEngine.getTier(points) });
}

// ── GET /raven/leaderboard ────────────────────────────────────────────────
async function leaderboard(req: AuthedRequest, res: Response) {
  const users = await prisma.users.findMany({
    select: { id: true, handle: true, displayName: true, avatarColor: true, avatarInitials: true, vibesCount: true, spacesHosted: true },
    orderBy: { vibesCount: "desc" },
    take: 20,
  });
  const withPoints = users.map(u => ({
    ...u,
    points: u.vibesCount * RavenEngine.POINT_MAP.vibe_posted + u.spacesHosted * RavenEngine.POINT_MAP.space_hosted,
  }));
  const ranked = withPoints
    .map(u => ({ ...u, tier: RavenEngine.getTier(u.points) }))
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ rank: i + 1, handle: u.handle, displayName: u.displayName, points: u.points, tier: u.tier.label, badge: u.tier.badge }));
  return ok(res, { leaderboard: ranked });
}

export = { me, leaderboard, computePoints, isBoosted };
