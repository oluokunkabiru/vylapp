import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import SearchEngine from "../services/searchEngine";
import TrendingEngine from "../services/trendingEngine";
import prisma from "../config/prisma";

const { ok } = respond;

// ── GET /search?q=...&type=all|users|vibes|hashtags ──────────────────────
async function search(req: AuthedRequest, res: Response) {
  const q = String(req.query.q || "").trim();
  const type = (req.query.type as string) || "all";
  if (!q) return ok(res, { results: { users: [], vibes: [], hashtags: [] } });

  const results: { users: any[]; vibes: any[]; hashtags: any[] } = { users: [], vibes: [], hashtags: [] };

  if (type === "all" || type === "users") {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, handle, display_name, bio, avatar_color, avatar_initials, verified, connections_count
       FROM users WHERE (handle ILIKE ${`%${q}%`} OR display_name ILIKE ${`%${q}%`}) AND deleted_at IS NULL LIMIT 20
    `;
    results.users = SearchEngine.rank(q, rows, { handle: 3, display_name: 2.5, bio: 1.5 }).slice(0, 10);
  }
  if (type === "all" || type === "vibes") {
    results.vibes = await prisma.$queryRaw`
      SELECT v.id, v.content, v.tags, v.likes_count, u.handle FROM vibes v JOIN users u ON u.id = v.user_id
       WHERE v.content ILIKE ${`%${q}%`} AND v.is_deleted = FALSE ORDER BY v.created_at DESC LIMIT 20
    `;
  }
  if (type === "all" || type === "hashtags") {
    results.hashtags = await prisma.$queryRaw`
      SELECT tag, vibes_count FROM hashtags WHERE tag ILIKE ${`%${q}%`} ORDER BY vibes_count DESC LIMIT 10
    `;
  }

  if (req.user) {
    await prisma.searchHistory.create({ data: { userId: req.user.id, query: q, resultType: type } }).catch(() => {});
  }

  return ok(res, { results });
}

// ── GET /search/autocomplete?q=... ───────────────────────────────────────
async function autocomplete(req: AuthedRequest, res: Response) {
  const q = String(req.query.q || "").trim();
  if (!q) return ok(res, { suggestions: [] });
  const users: { handle: string; display_name: string; verified: boolean }[] = await prisma.$queryRaw`
    SELECT handle, display_name, verified FROM users WHERE handle ILIKE ${`${q}%`} LIMIT 8
  `;
  return ok(res, { suggestions: users.map(r => ({ type: "user", value: r.handle, label: r.display_name, verified: r.verified })) });
}

// ── GET /trending/topics?region=Global&category=... ─────────────────────
async function trendingTopics(req: AuthedRequest, res: Response) {
  const hashtags = await prisma.hashtags.findMany({
    select: { tag: true, vibesCount: true, dayVibesCount: true, weekVibesCount: true, lastSeen: true },
    orderBy: { dayVibesCount: "desc" },
    take: 30,
  });
  const shaped = hashtags.map(h => ({
    tag: h.tag, total_count: h.vibesCount, recent_count: h.dayVibesCount, prev_count: h.weekVibesCount, last_vibe_at: h.lastSeen,
  }));
  const limit = parseInt((req.query.limit as string) || "10", 10);
  const trending = TrendingEngine.getTrending(shaped, (req.query.region as string) || "Global", null, limit);
  return ok(res, { trending });
}

// ── GET /explore/topics ──────────────────────────────────────────────────
async function listTopics(req: AuthedRequest, res: Response) {
  const topics = await prisma.exploreTopics.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return ok(res, { topics });
}

// ── POST /explore/topics/:id/join ────────────────────────────────────────
async function joinTopic(req: AuthedRequest, res: Response) {
  await prisma.userTopicMemberships.upsert({
    where: { userId_topicId: { userId: req.user.id, topicId: req.params.id } },
    create: { userId: req.user.id, topicId: req.params.id },
    update: {},
  });
  await prisma.exploreTopics.update({ where: { id: req.params.id }, data: { memberCount: { increment: 1 } } });
  return ok(res, { joined: true });
}

export = { search, autocomplete, trendingTopics, listTopics, joinTopic };
