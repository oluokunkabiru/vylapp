import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import FeedEngine from "../services/feedEngine";
import ModerationEngine from "../services/moderationEngine";
import NotificationEngine from "../services/notificationEngine";
import TranslationEngine from "../services/translationEngine";
import LanguageDetector from "../services/languageDetector";
import prisma from "../config/prisma";

const { ok, fail } = respond;

const FREE_DAILY_AI_TRANSLATIONS = 30;
const PRO_DAILY_AI_TRANSLATIONS = 500;

// Kept as a raw column list (used by $queryRaw below): the feed/category/
// single-vibe/bookmarks queries stay as parameterized raw SQL rather than
// Prisma relations — FeedEngine.rankFeed (still plain JS) reads
// vibe.likes_count/replies_count/reposts_count/created_at/is_paid_content
// directly off each row, and shapeVibe below expects the same snake_case
// shape it always has. Re-deriving this via Prisma relations would require
// either changing FeedEngine or re-mapping every row an extra time for no
// behavioral gain — the exact join is already correct.
const VIBE_FIELDS = `
  v.id, v.user_id, v.content, v.category, v.tags, v.language,
  v.reply_to, v.repost_of, v.quote_of, v.is_paid_content,
  v.event_title, v.event_time, v.event_reminded_count, v.event_interested_count,
  v.likes_count, v.reposts_count, v.replies_count, v.views_count, v.bookmarks_count,
  v.is_autopilot, v.impact_badge, v.created_at,
  u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url, u.verified, u.role_tag
`;

function shapeVibe(row: any, viewerState?: any) {
  return {
    id: row.id,
    content: row.content,
    category: row.category,
    tags: row.tags,
    language: row.language,
    replyTo: row.reply_to,
    repostOf: row.repost_of,
    quoteOf: row.quote_of,
    isPaidContent: row.is_paid_content,
    event: row.event_title ? { title: row.event_title, time: row.event_time, reminded: row.event_reminded_count, interested: row.event_interested_count } : null,
    counts: { likes: row.likes_count, reposts: row.reposts_count, replies: row.replies_count, views: row.views_count, bookmarks: row.bookmarks_count },
    isAutopilot: row.is_autopilot,
    impactBadge: row.impact_badge,
    createdAt: row.created_at,
    author: {
      id: row.user_id, handle: row.handle, displayName: row.display_name,
      avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, avatarUrl: row.avatar_url,
      verified: row.verified, roleTag: row.role_tag,
    },
    viewer: viewerState || undefined,
  };
}

async function attachViewerState(rows: any[], userId?: string | null) {
  if (!userId || !rows.length) return rows.map(r => ({ row: r, state: null }));
  const ids = rows.map(r => r.id);
  const [likes, reposts, bookmarks] = await Promise.all([
    prisma.vibeLikes.findMany({ where: { userId, vibeId: { in: ids } }, select: { vibeId: true } }),
    prisma.vibeReposts.findMany({ where: { userId, vibeId: { in: ids } }, select: { vibeId: true } }),
    prisma.vibeBookmarks.findMany({ where: { userId, vibeId: { in: ids } }, select: { vibeId: true } }),
  ]);
  const likedSet = new Set(likes.map(r => r.vibeId));
  const repostedSet = new Set(reposts.map(r => r.vibeId));
  const savedSet = new Set(bookmarks.map(r => r.vibeId));
  return rows.map(r => ({ row: r, state: { liked: likedSet.has(r.id), reposted: repostedSet.has(r.id), saved: savedSet.has(r.id) } }));
}

// Auto-translates a page of already-shaped vibes into `targetLang`, in place.
// Free-for-everyone by default: results are cached per (vibe, lang) so the
// AI-quality path only runs once per popular post, not once per viewer.
// Signed-in users get a daily AI-translation allowance (higher for Pro);
// once spent, remaining misses fall back to the offline dictionary rather
// than failing the request.
async function translateVibesForViewer(vibes: any[], targetLang: string | undefined, userId?: string | null) {
  if (!targetLang) return vibes;
  const candidates = vibes.filter(v => v.language && v.language !== targetLang && v.content);
  if (!candidates.length) return vibes;

  const cached = await prisma.vibeTranslations.findMany({
    where: { targetLang, vibeId: { in: candidates.map(v => v.id) } },
    select: { vibeId: true, content: true, method: true },
  });
  const cacheMap = new Map(cached.map(r => [r.vibeId, r]));

  let remainingAI = 0;
  if (userId) {
    const [user, usage] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId }, select: { subscriptionPlan: true } }),
      prisma.translationUsage.findUnique({ where: { userId_day: { userId, day: new Date() } } }),
    ]);
    const cap = (user?.subscriptionPlan || "free") !== "free" ? PRO_DAILY_AI_TRANSLATIONS : FREE_DAILY_AI_TRANSLATIONS;
    remainingAI = Math.max(0, cap - (usage?.count || 0));
  }

  let aiCallsMade = 0;
  for (const v of candidates) {
    const hit = cacheMap.get(v.id);
    if (hit) {
      v.translation = { text: hit.content, method: hit.method, fromLang: v.language, toLang: targetLang };
      continue;
    }
    const result = await TranslationEngine.translate(v.content, v.language, targetLang, "post", {
      allowAI: aiCallsMade < remainingAI,
    });
    if (result.method === "untranslated" || result.method === "passthrough") continue;
    await prisma.vibeTranslations.upsert({
      where: { vibeId_targetLang: { vibeId: v.id, targetLang } },
      create: { vibeId: v.id, targetLang, content: result.text, method: result.method },
      update: { content: result.text, method: result.method },
    }).catch(() => {});
    if (result.method === "claude") aiCallsMade++;
    v.translation = { text: result.text, method: result.method, fromLang: v.language, toLang: targetLang };
  }

  if (userId && aiCallsMade > 0) {
    await prisma.translationUsage.upsert({
      where: { userId_day: { userId, day: new Date() } },
      create: { userId, day: new Date(), count: aiCallsMade },
      update: { count: { increment: aiCallsMade } },
    }).catch(() => {});
  }

  return vibes;
}

// ── GET /vibes/feed — personalized home feed ─────────────────────────────
async function feed(req: AuthedRequest, res: Response) {
  const page = parseInt((req.query.page as string) || "0", 10);
  const pageSize = Math.min(parseInt((req.query.pageSize as string) || "20", 10), 50);

  // Pull a candidate window (latest 100 non-reply vibes) for in-memory ranking.
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL
     ORDER BY v.created_at DESC LIMIT 100
  `);

  let userProfile: { interests: string[]; is_pro: boolean; followingIds: string[] } = { interests: [], is_pro: false, followingIds: [] };
  if (req.user) {
    const [user, following] = await Promise.all([
      prisma.users.findUnique({ where: { id: req.user.id }, select: { interests: true, subscriptionPlan: true } }),
      prisma.connections.findMany({ where: { followerId: req.user.id }, select: { followingId: true } }),
    ]);
    userProfile = {
      interests: user?.interests || [],
      is_pro: (user?.subscriptionPlan || "free") !== "free",
      followingIds: following.map(r => r.followingId),
    };
  }

  const ranked = FeedEngine.rankFeed(rows, userProfile, { page, pageSize });
  const withState = await attachViewerState(ranked, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await translateVibesForViewer(shaped, req.query.lang as string, req.user?.id);
  return ok(res, { vibes: shaped, page, pageSize });
}

// ── GET /vibes/category/:category — category feed (Explore filter chips) ─
async function categoryFeed(req: AuthedRequest, res: Response) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL AND v.category = $1
     ORDER BY v.created_at DESC LIMIT 50
  `, req.params.category);
  const withState = await attachViewerState(rows, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await translateVibesForViewer(shaped, req.query.lang as string, req.user?.id);
  return ok(res, { vibes: shaped });
}

// ── GET /vibes/:id — single vibe + its replies (comments) ───────────────
async function getOne(req: AuthedRequest, res: Response) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id WHERE v.id = $1 AND v.is_deleted = FALSE`,
    req.params.id
  );
  if (!rows.length) return fail(res, 404, "Vibe not found");

  const replies: any[] = await prisma.$queryRawUnsafe(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id WHERE v.reply_to = $1 AND v.is_deleted = FALSE ORDER BY v.created_at ASC LIMIT 100`,
    req.params.id
  );

  await prisma.vibes.update({ where: { id: req.params.id }, data: { viewsCount: { increment: 1 } } });
  await prisma.vibeViews.create({
    data: { vibeId: req.params.id, viewerId: req.user?.id || null, source: (req.query.source as string) || "direct" },
  }).catch(() => {});

  const withState = await attachViewerState([rows[0], ...replies], req.user?.id);
  const [main, ...rest] = withState;
  return ok(res, { vibe: shapeVibe(main.row, main.state), replies: rest.map(({ row, state }) => shapeVibe(row, state)) });
}

// ── POST /vibes — create a vibe (post / reply / quote) ───────────────────
async function create(req: AuthedRequest, res: Response) {
  const { content, category, tags, replyTo, quoteOf, eventTitle, eventTime } = req.body;
  if (!content?.trim()) return fail(res, 400, "content is required");
  if (content.length > 500) return fail(res, 400, "content must be 500 characters or fewer");

  const moderation = await ModerationEngine.analyzeContent(content);
  if (moderation.action === "remove" || moderation.action === "remove_and_support") {
    return fail(res, 422, `Post blocked: ${moderation.label}`, { moderation });
  }

  const language = await LanguageDetector.detect(content, "en");

  const vibe = await prisma.vibes.create({
    data: {
      userId: req.user.id,
      content: content.trim(),
      category: category || "GENERAL",
      tags: tags || [],
      replyTo: replyTo || null,
      quoteOf: quoteOf || null,
      eventTitle: eventTitle || null,
      eventTime: eventTime || null,
      isSensitive: moderation.action === "flag_for_review",
      language,
    },
  });

  // Update hashtag registry
  for (const tag of (tags || [])) {
    const normalized = tag.replace(/^#/, "").toLowerCase();
    await prisma.hashtags.upsert({
      where: { tag: normalized },
      create: { tag: normalized, vibesCount: 1, dayVibesCount: 1, weekVibesCount: 1, lastSeen: new Date() },
      update: { vibesCount: { increment: 1 }, dayVibesCount: { increment: 1 }, weekVibesCount: { increment: 1 }, lastSeen: new Date() },
    }).catch(() => {});
  }

  // Notify the parent author on reply
  if (replyTo) {
    const parent = await prisma.vibes.findUnique({ where: { id: replyTo }, select: { userId: true } });
    if (parent && parent.userId !== req.user.id) {
      const body = NotificationEngine.formatBody("reply", req.user.displayName);
      await prisma.notifications.create({
        data: { userId: parent.userId, actorId: req.user.id, type: "reply", vibeId: vibe.id, body },
      });
    }
  }

  // shapeVibe expects the snake_case row shape $queryRaw produces elsewhere
  // in this file, not Prisma's camelCase create() result — map explicitly.
  return ok(res, {
    vibe: shapeVibe({
      user_id: vibe.userId, content: vibe.content, category: vibe.category, tags: vibe.tags, language: vibe.language,
      reply_to: vibe.replyTo, repost_of: vibe.repostOf, quote_of: vibe.quoteOf, is_paid_content: vibe.isPaidContent,
      event_title: vibe.eventTitle, event_time: vibe.eventTime, event_reminded_count: vibe.eventRemindedCount, event_interested_count: vibe.eventInterestedCount,
      likes_count: vibe.likesCount, reposts_count: vibe.repostsCount, replies_count: vibe.repliesCount, views_count: vibe.viewsCount, bookmarks_count: vibe.bookmarksCount,
      is_autopilot: vibe.isAutopilot, impact_badge: vibe.impactBadge, created_at: vibe.createdAt, id: vibe.id,
      handle: req.user.handle, display_name: req.user.displayName,
    }),
  }, 201);
}

// ── DELETE /vibes/:id ──────────────────────────────────────────────────────
async function remove(req: AuthedRequest, res: Response) {
  const vibe = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { userId: true } });
  if (!vibe) return fail(res, 404, "Vibe not found");
  // Original checked req.user.isAdmin, which auth middleware never sets (dead
  // code — grep confirms it's referenced nowhere else), so the "delete any
  // vibe" path never worked even though requireAnyPermission above already
  // grants vibes.delete.any to moderators/admins. Using req.can(...) — the
  // helper actually attached by middleware/auth.js — makes that grant real.
  if (vibe.userId !== req.user.id && !req.can!("vibes.delete.any")) return fail(res, 403, "Not your vibe");
  await prisma.vibes.update({ where: { id: req.params.id }, data: { isDeleted: true, deletedAt: new Date() } });
  return ok(res, { deleted: true });
}

// ── POST /vibes/:id/like  &  DELETE /vibes/:id/like ──────────────────────
async function like(req: AuthedRequest, res: Response) {
  await prisma.vibeLikes.upsert({
    where: { userId_vibeId: { userId: req.user.id, vibeId: req.params.id } },
    create: { userId: req.user.id, vibeId: req.params.id },
    update: {},
  });
  const vibe = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { userId: true, likesCount: true } });
  if (vibe && vibe.userId !== req.user.id) {
    const body = NotificationEngine.formatBody("like", req.user.displayName);
    await prisma.notifications.create({ data: { userId: vibe.userId, actorId: req.user.id, type: "like", vibeId: req.params.id, body } });
  }
  return ok(res, { liked: true, likesCount: vibe?.likesCount });
}

async function unlike(req: AuthedRequest, res: Response) {
  await prisma.vibeLikes.deleteMany({ where: { userId: req.user.id, vibeId: req.params.id } });
  return ok(res, { liked: false });
}

// ── POST /vibes/:id/repost  &  DELETE ─────────────────────────────────────
async function repost(req: AuthedRequest, res: Response) {
  await prisma.vibeReposts.upsert({
    where: { userId_vibeId: { userId: req.user.id, vibeId: req.params.id } },
    create: { userId: req.user.id, vibeId: req.params.id },
    update: {},
  });
  const vibe = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { userId: true } });
  if (vibe && vibe.userId !== req.user.id) {
    const body = NotificationEngine.formatBody("repost", req.user.displayName);
    await prisma.notifications.create({ data: { userId: vibe.userId, actorId: req.user.id, type: "repost", vibeId: req.params.id, body } });
  }
  return ok(res, { reposted: true });
}

async function unrepost(req: AuthedRequest, res: Response) {
  await prisma.vibeReposts.deleteMany({ where: { userId: req.user.id, vibeId: req.params.id } });
  return ok(res, { reposted: false });
}

// ── POST /vibes/:id/bookmark  &  DELETE ───────────────────────────────────
async function bookmark(req: AuthedRequest, res: Response) {
  await prisma.vibeBookmarks.upsert({
    where: { userId_vibeId: { userId: req.user.id, vibeId: req.params.id } },
    create: { userId: req.user.id, vibeId: req.params.id },
    update: {},
  });
  await prisma.vibes.update({ where: { id: req.params.id }, data: { bookmarksCount: { increment: 1 } } });
  return ok(res, { saved: true });
}

async function unbookmark(req: AuthedRequest, res: Response) {
  await prisma.vibeBookmarks.deleteMany({ where: { userId: req.user.id, vibeId: req.params.id } });
  // GREATEST(0, ...) floor has no atomic Prisma query-builder equivalent —
  // kept as raw SQL rather than a non-atomic read-then-clamp round trip.
  await prisma.$executeRaw`UPDATE vibes SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = ${req.params.id}`;
  return ok(res, { saved: false });
}

// ── GET /vibes/me/bookmarks ────────────────────────────────────────────────
async function myBookmarks(req: AuthedRequest, res: Response) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibe_bookmarks b JOIN vibes v ON v.id = b.vibe_id JOIN users u ON u.id = v.user_id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT 50
  `, req.user.id);
  const withState = await attachViewerState(rows, req.user.id);
  return ok(res, { vibes: withState.map(({ row, state }) => shapeVibe(row, state)) });
}

export = {
  shapeVibe, VIBE_FIELDS,
  feed, categoryFeed, getOne, create, remove, like, unlike, repost, unrepost, bookmark, unbookmark, myBookmarks,
};
