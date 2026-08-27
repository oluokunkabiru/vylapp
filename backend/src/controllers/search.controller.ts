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
    // S-23: minors aren't discoverable through general search. This only
    // removes them from anonymous/keyword search results — someone who
    // already follows a minor account can still reach it directly (their
    // own profile page, follower list, an existing conversation).
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, handle, display_name, bio, avatar_color, avatar_initials, verified, connections_count
       FROM users WHERE (handle ILIKE ${`%${q}%`} OR display_name ILIKE ${`%${q}%`}) AND deleted_at IS NULL AND is_minor = FALSE LIMIT 20
    `;
    results.users = SearchEngine.rank(q, rows, { handle: 3, display_name: 2.5, bio: 1.5 }).slice(0, 10);
  }
  if (type === "all" || type === "vibes") {
    // S-28: same is_sensitive source-filter as the feed — a minor shouldn't
    // be able to reach flagged content just by searching for it instead.
    results.vibes = req.user?.isMinor
      ? await prisma.$queryRaw`
          SELECT v.id, v.content, v.tags, v.likes_count, u.handle FROM vibes v JOIN users u ON u.id = v.user_id
           WHERE v.content ILIKE ${`%${q}%`} AND v.is_deleted = FALSE AND v.is_sensitive = FALSE ORDER BY v.created_at DESC LIMIT 20
        `
      : await prisma.$queryRaw`
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
// V-13/V-14 — the composer's @mention and #hashtag autocomplete. `type`
// defaults to "user" so the one existing caller (if any) keeps working
// unchanged; the composer passes it explicitly for either trigger.
async function autocomplete(req: AuthedRequest, res: Response) {
  const q = String(req.query.q || "").trim();
  const type = (req.query.type as string) || "user";
  if (!q) return ok(res, { suggestions: [] });

  if (type === "hashtag") {
    const tags = await prisma.hashtags.findMany({
      where: { tag: { startsWith: q.toLowerCase() } },
      orderBy: { vibesCount: "desc" },
      take: 8,
      select: { tag: true, vibesCount: true },
    });
    return ok(res, { suggestions: tags.map(t => ({ type: "hashtag", value: t.tag, label: `#${t.tag}`, count: t.vibesCount })) });
  }

  // S-23 applies here too — a minor shouldn't turn up as an @mention
  // suggestion for someone who isn't already following them.
  const users: { handle: string; display_name: string; verified: boolean }[] = await prisma.$queryRaw`
    SELECT handle, display_name, verified FROM users WHERE handle ILIKE ${`${q}%`} AND is_minor = FALSE LIMIT 8
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
