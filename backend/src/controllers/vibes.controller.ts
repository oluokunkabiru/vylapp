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

// G: notification grouping. Notifications.groupKey/groupCount existed on
// the schema with nothing setting them — every like/repost created its own
// row, so a popular vibe generated a wall of near-identical notifications
// instead of one "Alice and 4 others liked your vibe" card. Grouped by
// (type, vibeId), scoped to the recipient's still-unread window only — a
// month-old already-read like shouldn't silently reattach to today's; once
// something's been seen it's a closed chapter, not a place to keep adding.
// Bumps createdAt on the existing row so a grouped card resurfaces to the
// top on new activity, same as the apps this pattern is modeled on.
async function createOrGroupNotification(userId: string, actorId: string, type: "like" | "repost", vibeId: string, actorName: string) {
  const groupKey = `${type}:${vibeId}`;
  const existing = await prisma.notifications.findFirst({ where: { userId, groupKey, isRead: false } });
  if (existing) {
    const verb = type === "like" ? "liked" : "reposted";
    const body = existing.groupCount === 1
      ? `${actorName} and 1 other ${verb} your vibe`
      : `${actorName} and ${existing.groupCount} others ${verb} your vibe`;
    await prisma.notifications.update({
      where: { id: existing.id },
      data: { groupCount: { increment: 1 }, actorId, body, createdAt: new Date() },
    });
    return;
  }
  const body = NotificationEngine.formatBody(type, actorName);
  await prisma.notifications.create({ data: { userId, actorId, type, vibeId, body, groupKey, groupCount: 1 } });
}

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
  v.is_autopilot, v.impact_badge, v.created_at, v.is_edited, v.is_sensitive, v.content_audience,
  u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url,
  (u.verification_tier <> 'none') AS verified, u.role_tag
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
    contentAudience: row.content_audience || "general",
    impactBadge: row.impact_badge,
    createdAt: row.created_at,
    isEdited: !!row.is_edited,
    media: row.media || [],
    author: {
      id: row.user_id, handle: row.handle, displayName: row.display_name,
      avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, avatarUrl: row.avatar_url,
      verified: row.verified, roleTag: row.role_tag,
      viewerFollows: typeof row.viewer_follows === "boolean" ? row.viewer_follows : undefined,
      connectionRequested: typeof row.connection_requested === "boolean" ? row.connection_requested : undefined,
    },
    viewer: viewerState || undefined,
  };
}

function shapeVibeMedia(row: any) {
  return {
    id: row.id,
    mediaType: row.mediaType,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    sizeBytes: row.sizeBytes == null ? null : Number(row.sizeBytes),
    altText: row.altText,
  };
}

async function attachMediaToVibes(vibes: any[]) {
  if (!vibes.length) return vibes;
  const rows = await prisma.vibeMedia.findMany({
    where: { vibeId: { in: vibes.map(v => v.id) } },
    orderBy: [{ vibeId: "asc" }, { sortOrder: "asc" }],
  });
  const byVibe = new Map<string, any[]>();
  for (const row of rows) {
    const list = byVibe.get(row.vibeId) || [];
    list.push(shapeVibeMedia(row));
    byVibe.set(row.vibeId, list);
  }
  for (const vibe of vibes) vibe.media = byVibe.get(vibe.id) || [];
  return vibes;
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

// Auto-translation for a page of shaped vibes now lives in TranslationEngine
// (translateVibesForViewer) — shared with forum/messages via the same daily
// AI quota, see translationEngine.ts. Kept as a thin alias here so callers
// below don't change.
const translateVibesForViewer = TranslationEngine.translateVibesForViewer.bind(TranslationEngine);

// ── GET /vibes/feed — personalized home feed ─────────────────────────────
async function feed(req: AuthedRequest, res: Response) {
  const page = parseInt((req.query.page as string) || "0", 10);
  const pageSize = Math.min(parseInt((req.query.pageSize as string) || "20", 10), 50);

  // S-28: adult/flagged content filtered at source for minors, not just
  // hidden client-side — the is_sensitive flag is exactly the flag_for_review
  // moderation outcome set at post time, so this excludes it from the
  // candidate window before ranking ever sees it.
  const audienceClause = req.user?.ageBand === "child"
    ? "AND v.content_audience = 'kids'"
    : req.user?.ageBand === "teen" ? "AND v.content_audience <> 'adult' AND v.is_sensitive = FALSE"
    : !req.user ? "AND v.content_audience = 'kids'" : "";
  // S (rest): muted words. POSITION(...) rather than ILIKE '%word%' — a
  // muted word is raw user input and ILIKE would treat any literal % or _
  // in it as a wildcard; POSITION does a plain substring check instead.
  const relationshipClause = req.user ? `
    AND NOT EXISTS (SELECT 1 FROM user_mutes um WHERE um.muter_id = $1 AND um.muted_id = v.user_id)
    AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE (ub.blocker_id = $1 AND ub.blocked_id = v.user_id) OR (ub.blocked_id = $1 AND ub.blocker_id = v.user_id))
    AND NOT EXISTS (SELECT 1 FROM muted_words mw WHERE mw.user_id = $1 AND POSITION(LOWER(mw.word) IN LOWER(v.content)) > 0)
  ` : "";
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL ${audienceClause} ${relationshipClause}
     ORDER BY v.created_at DESC LIMIT 100
  `, ...(req.user ? [req.user.id] : []));

  let userProfile: { interests: string[]; is_pro: boolean; followingIds: string[]; requestedIds: string[] } = {
    interests: [], is_pro: false, followingIds: [], requestedIds: [],
  };
  if (req.user) {
    const [user, following, requested] = await Promise.all([
      prisma.users.findUnique({ where: { id: req.user.id }, select: { interests: true, subscriptionPlan: true } }),
      prisma.connections.findMany({ where: { followerId: req.user.id }, select: { followingId: true } }),
      prisma.connectionRequests.findMany({
        where: { requesterId: req.user.id, status: "pending" },
        select: { targetId: true },
      }),
    ]);
    userProfile = {
      interests: user?.interests || [],
      is_pro: (user?.subscriptionPlan || "free") !== "free",
      followingIds: following.map(r => r.followingId),
      requestedIds: requested.map(r => r.targetId),
    };
  }

  const ranked = FeedEngine.rankFeed(rows, userProfile, { page, pageSize });
  const withState = await attachViewerState(ranked, req.user?.id);
  const followingIds = new Set(userProfile.followingIds);
  const requestedIds = new Set(userProfile.requestedIds);
  const shaped = withState.map(({ row, state }) => shapeVibe({
    ...row,
    viewer_follows: followingIds.has(row.user_id),
    connection_requested: requestedIds.has(row.user_id),
  }, state));
  await attachMediaToVibes(shaped);
  await translateVibesForViewer(shaped, req.query.lang as string, req.user?.id);
  // B1: additive field so the caller can tell "stop paginating" from "this
  // page happens to be empty" without guessing from array length. Computed
  // against the 100-row candidate window pulled above — real limit until
  // V-02 replaces this offset scheme with cursor pagination (see plan).
  const hasMore = (page + 1) * pageSize < rows.length;
  return ok(res, { vibes: shaped, page, pageSize, hasMore });
}

// ── GET /vibes/user/:handle — complete chronological profile timeline ───────
// Profiles must not be populated by filtering the ranked home feed: that
// candidate window is intentionally limited and can omit an author's older
// posts. This is the authoritative timeline for a person.
async function userVibes(req: AuthedRequest, res: Response) {
  const page = Math.max(0, parseInt((req.query.page as string) || "0", 10) || 0);
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || "30", 10) || 30));
  const audienceClause = req.user?.ageBand === "child"
    ? "AND v.content_audience = 'kids'"
    : req.user?.ageBand === "teen" ? "AND v.content_audience <> 'adult' AND v.is_sensitive = FALSE"
    : !req.user ? "AND v.content_audience = 'kids'" : "";
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE u.handle = $1 AND v.is_deleted = FALSE AND v.reply_to IS NULL ${audienceClause}
     ORDER BY v.created_at DESC LIMIT $2 OFFSET $3
  `, req.params.handle, pageSize, page * pageSize);
  const withState = await attachViewerState(rows, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  if (req.user && shaped.length) {
    const follows = await prisma.connections.findUnique({ where: { followerId_followingId: { followerId: req.user.id, followingId: shaped[0].author.id } } });
    shaped.forEach(vibe => { vibe.author.viewerFollows = !!follows; });
  }
  await attachMediaToVibes(shaped);
  await translateVibesForViewer(shaped, req.query.lang as string, req.user?.id);
  return ok(res, { vibes: shaped, page, pageSize, hasMore: shaped.length === pageSize });
}

// ── GET /vibes/category/:category — category feed (Explore filter chips) ─
async function categoryFeed(req: AuthedRequest, res: Response) {
  const audienceClause = req.user?.ageBand === "child"
    ? "AND v.content_audience = 'kids'"
    : req.user?.ageBand === "teen" ? "AND v.content_audience <> 'adult' AND v.is_sensitive = FALSE"
    : !req.user ? "AND v.content_audience = 'kids'" : "";
  const relationshipClause = req.user ? `
    AND NOT EXISTS (SELECT 1 FROM user_mutes um WHERE um.muter_id = $2 AND um.muted_id = v.user_id)
    AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE (ub.blocker_id = $2 AND ub.blocked_id = v.user_id) OR (ub.blocked_id = $2 AND ub.blocker_id = v.user_id))
    AND NOT EXISTS (SELECT 1 FROM muted_words mw WHERE mw.user_id = $2 AND POSITION(LOWER(mw.word) IN LOWER(v.content)) > 0)
  ` : "";
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL AND v.category = $1 ${audienceClause} ${relationshipClause}
     ORDER BY v.created_at DESC LIMIT 50
  `, req.params.category, ...(req.user ? [req.user.id] : []));
  const withState = await attachViewerState(rows, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await attachMediaToVibes(shaped);
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
  // S-28: a minor can't route around the feed filter by opening a sensitive
  // vibe's direct link — treat it the same as not existing for them.
  const audience = rows[0].content_audience || "general";
  if (!req.user || req.user.ageBand === "child" ? audience !== "kids" : req.user.ageBand === "teen" && (audience === "adult" || rows[0].is_sensitive)) return fail(res, 404, "Vibe not found");

  const replyClause = req.user?.ageBand === "child" ? "AND v.content_audience = 'kids'" : req.user?.ageBand === "teen" ? "AND v.content_audience <> 'adult' AND v.is_sensitive = FALSE" : !req.user ? "AND v.content_audience = 'kids'" : "";
  const replies: any[] = await prisma.$queryRawUnsafe(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id WHERE v.reply_to = $1 AND v.is_deleted = FALSE ${replyClause} ORDER BY v.created_at ASC LIMIT 100`,
    req.params.id
  );

  await prisma.vibes.update({ where: { id: req.params.id }, data: { viewsCount: { increment: 1 } } });
  await prisma.vibeViews.create({
    data: { vibeId: req.params.id, viewerId: req.user?.id || null, source: (req.query.source as string) || "direct" },
  }).catch(() => {});

  const withState = await attachViewerState([rows[0], ...replies], req.user?.id);
  const [main, ...rest] = withState;
  const shaped = [shapeVibe(main.row, main.state), ...rest.map(({ row, state }) => shapeVibe(row, state))];
  await attachMediaToVibes(shaped);
  return ok(res, { vibe: shaped[0], replies: shaped.slice(1) });
}

// ── POST /vibes — create a vibe (post / reply / quote) ───────────────────
async function create(req: AuthedRequest, res: Response) {
  const { content, category, tags, replyTo, quoteOf, eventTitle, eventTime, mediaIds, language: declaredLanguage, audience } = req.body;
  const contentAudience = ["kids", "general", "adult"].includes(audience) ? audience : "general";
  if (contentAudience === "adult" && req.user.ageBand !== "adult") return fail(res, 403, "Only adults can publish adult-audience content");
  const cleanContent = typeof content === "string" ? content.trim() : "";
  const uniqueMediaIds = Array.isArray(mediaIds) ? [...new Set(mediaIds.filter((id: unknown) => typeof id === "string"))] as string[] : [];
  if (!cleanContent && !uniqueMediaIds.length) return fail(res, 400, "content or media is required");
  if (cleanContent.length > 500) return fail(res, 400, "content must be 500 characters or fewer");
  if (uniqueMediaIds.length > 4) return fail(res, 400, "A vibe can contain at most 4 media items");

  const mediaAssets = uniqueMediaIds.length ? await prisma.mediaAssets.findMany({
    where: { id: { in: uniqueMediaIds }, uploadedBy: req.user.id, mediaType: { in: ["image", "video"] } },
  }) : [];
  if (mediaAssets.length !== uniqueMediaIds.length) return fail(res, 400, "One or more media uploads are invalid or do not belong to you");
  mediaAssets.sort((a, b) => uniqueMediaIds.indexOf(a.id) - uniqueMediaIds.indexOf(b.id));

  let moderation: any = { action: "allow", label: null };
  if (cleanContent) {
    moderation = await ModerationEngine.analyzeContent(cleanContent, { is_minor: req.user.isMinor });
    if (moderation.action === "remove" || moderation.action === "remove_and_support") {
      return fail(res, 422, `Post blocked: ${moderation.label}`, { moderation });
    }
  }

  // T-10: what the author says the post is written in wins over the
  // statistical detector — franc-min is unreliable on short text, and a
  // detector can't know which of two languages a code-switched post is
  // "really" in. Only trust it if it's a language we actually recognize;
  // an unrecognized/garbage value falls through to auto-detect rather
  // than getting stored verbatim.
  const language = (typeof declaredLanguage === "string" && TranslationEngine.getLang(declaredLanguage))
    ? declaredLanguage
    : cleanContent ? await LanguageDetector.detect(cleanContent, "en") : "en";

  const vibe = await prisma.$transaction(async tx => {
    const created = await tx.vibes.create({
      data: {
        userId: req.user.id,
        content: cleanContent,
        category: category || "GENERAL",
        tags: tags || [],
        replyTo: replyTo || null,
        quoteOf: quoteOf || null,
        eventTitle: eventTitle || null,
        eventTime: eventTime || null,
        isSensitive: moderation.action === "flag_for_review",
        contentAudience,
        language,
      },
    });
    if (mediaAssets.length) {
      await tx.vibeMedia.createMany({ data: mediaAssets.map((asset, sortOrder) => ({
        vibeId: created.id,
        mediaType: asset.mediaType,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
        sizeBytes: asset.sizeBytes,
        sortOrder,
      })) });
    }
    return created;
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
  const shaped = shapeVibe({
      user_id: vibe.userId, content: vibe.content, category: vibe.category, tags: vibe.tags, language: vibe.language,
      reply_to: vibe.replyTo, repost_of: vibe.repostOf, quote_of: vibe.quoteOf, is_paid_content: vibe.isPaidContent,
      event_title: vibe.eventTitle, event_time: vibe.eventTime, event_reminded_count: vibe.eventRemindedCount, event_interested_count: vibe.eventInterestedCount,
      likes_count: vibe.likesCount, reposts_count: vibe.repostsCount, replies_count: vibe.repliesCount, views_count: vibe.viewsCount, bookmarks_count: vibe.bookmarksCount,
      is_autopilot: vibe.isAutopilot, impact_badge: vibe.impactBadge, created_at: vibe.createdAt, id: vibe.id,
      content_audience: vibe.contentAudience,
      handle: req.user.handle, display_name: req.user.displayName,
  });
  await attachMediaToVibes([shaped]);
  return ok(res, { vibe: shaped }, 201);
}

// ── PATCH /vibes/:id — V-18: edit with a permanent, visible marker ────────
async function update(req: AuthedRequest, res: Response) {
  const { content, language: declaredLanguage } = req.body;
  if (!content?.trim()) return fail(res, 400, "content is required");
  if (content.length > 500) return fail(res, 400, "content must be 500 characters or fewer");

  const existing = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { userId: true, isDeleted: true } });
  if (!existing || existing.isDeleted) return fail(res, 404, "Vibe not found");
  // Strictly own-only — unlike delete, there's no "edit any" permission in
  // the RBAC seed data. Rewriting someone else's words isn't a moderation
  // action; removing them is.
  if (existing.userId !== req.user.id) return fail(res, 403, "You can only edit your own vibes");

  const moderation = await ModerationEngine.analyzeContent(content, { is_minor: req.user.isMinor });
  if (moderation.action === "remove" || moderation.action === "remove_and_support") {
    return fail(res, 422, `Post blocked: ${moderation.label}`, { moderation });
  }

  const tags = [...content.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
  const language = (typeof declaredLanguage === "string" && TranslationEngine.getLang(declaredLanguage))
    ? declaredLanguage
    : await LanguageDetector.detect(content, "en");

  const vibe = await prisma.vibes.update({
    where: { id: req.params.id },
    data: { content: content.trim(), tags, language, isEdited: true, isSensitive: moderation.action === "flag_for_review" },
  });

  const shaped = shapeVibe({
      user_id: vibe.userId, content: vibe.content, category: vibe.category, tags: vibe.tags, language: vibe.language,
      reply_to: vibe.replyTo, repost_of: vibe.repostOf, quote_of: vibe.quoteOf, is_paid_content: vibe.isPaidContent,
      event_title: vibe.eventTitle, event_time: vibe.eventTime, event_reminded_count: vibe.eventRemindedCount, event_interested_count: vibe.eventInterestedCount,
      likes_count: vibe.likesCount, reposts_count: vibe.repostsCount, replies_count: vibe.repliesCount, views_count: vibe.viewsCount, bookmarks_count: vibe.bookmarksCount,
      is_autopilot: vibe.isAutopilot, impact_badge: vibe.impactBadge, created_at: vibe.createdAt, id: vibe.id, is_edited: vibe.isEdited,
      handle: req.user.handle, display_name: req.user.displayName,
  });
  await attachMediaToVibes([shaped]);
  return ok(res, { vibe: shaped });
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
    await createOrGroupNotification(vibe.userId, req.user.id, "like", req.params.id, req.user.displayName);
  }
  return ok(res, { liked: true, likesCount: vibe?.likesCount });
}

async function unlike(req: AuthedRequest, res: Response) {
  await prisma.vibeLikes.deleteMany({ where: { userId: req.user.id, vibeId: req.params.id } });
  return ok(res, { liked: false });
}

// ── POST /vibes/:id/repost  &  DELETE ─────────────────────────────────────
async function repost(req: AuthedRequest, res: Response) {
  const existing = await prisma.vibeReposts.findUnique({
    where: { userId_vibeId: { userId: req.user.id, vibeId: req.params.id } },
  });
  if (!existing) {
    await prisma.vibeReposts.create({ data: { userId: req.user.id, vibeId: req.params.id } });
  }
  const vibe = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { userId: true, repostsCount: true } });
  if (!existing && vibe && vibe.userId !== req.user.id) {
    await createOrGroupNotification(vibe.userId, req.user.id, "repost", req.params.id, req.user.displayName);
  }
  return ok(res, { reposted: true, repostsCount: vibe?.repostsCount });
}

async function unrepost(req: AuthedRequest, res: Response) {
  await prisma.vibeReposts.deleteMany({ where: { userId: req.user.id, vibeId: req.params.id } });
  const vibe = await prisma.vibes.findUnique({ where: { id: req.params.id }, select: { repostsCount: true } });
  return ok(res, { reposted: false, repostsCount: vibe?.repostsCount });
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
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await attachMediaToVibes(shaped);
  return ok(res, { vibes: shaped });
}

export = {
  shapeVibe, VIBE_FIELDS,
  feed, userVibes, categoryFeed, getOne, create, update, remove, like, unlike, repost, unrepost, bookmark, unbookmark, myBookmarks,
};
