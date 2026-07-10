const express = require("express");
const db = require("../config/db");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { requirePermission, requireAnyPermission } = require("../middleware/rbac");
const FeedEngine = require("../services/feedEngine");
const ModerationEngine = require("../services/moderationEngine");
const NotificationEngine = require("../services/notificationEngine");
const TranslationEngine = require("../services/translationEngine");
const LanguageDetector = require("../services/languageDetector");

const router = express.Router();

const FREE_DAILY_AI_TRANSLATIONS = 30;
const PRO_DAILY_AI_TRANSLATIONS = 500;

const VIBE_FIELDS = `
  v.id, v.user_id, v.content, v.category, v.tags, v.language,
  v.reply_to, v.repost_of, v.quote_of, v.is_paid_content,
  v.event_title, v.event_time, v.event_reminded_count, v.event_interested_count,
  v.likes_count, v.reposts_count, v.replies_count, v.views_count, v.bookmarks_count,
  v.is_autopilot, v.impact_badge, v.created_at,
  u.handle, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url, u.verified, u.role_tag
`;

function shapeVibe(row, viewerState) {
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

async function attachViewerState(rows, userId) {
  if (!userId || !rows.length) return rows.map(r => ({ row: r, state: null }));
  const ids = rows.map(r => r.id);
  const [likes, reposts, bookmarks] = await Promise.all([
    db.query(`SELECT vibe_id FROM vibe_likes WHERE user_id = $1 AND vibe_id = ANY($2)`, [userId, ids]),
    db.query(`SELECT vibe_id FROM vibe_reposts WHERE user_id = $1 AND vibe_id = ANY($2)`, [userId, ids]),
    db.query(`SELECT vibe_id FROM vibe_bookmarks WHERE user_id = $1 AND vibe_id = ANY($2)`, [userId, ids]),
  ]);
  const likedSet = new Set(likes.rows.map(r => r.vibe_id));
  const repostedSet = new Set(reposts.rows.map(r => r.vibe_id));
  const savedSet = new Set(bookmarks.rows.map(r => r.vibe_id));
  return rows.map(r => ({ row: r, state: { liked: likedSet.has(r.id), reposted: repostedSet.has(r.id), saved: savedSet.has(r.id) } }));
}

// Auto-translates a page of already-shaped vibes into `targetLang`, in place.
// Free-for-everyone by default: results are cached per (vibe, lang) so the
// AI-quality path only runs once per popular post, not once per viewer.
// Signed-in users get a daily AI-translation allowance (higher for Pro);
// once spent, remaining misses fall back to the offline dictionary rather
// than failing the request.
async function translateVibesForViewer(vibes, targetLang, userId) {
  if (!targetLang) return vibes;
  const candidates = vibes.filter(v => v.language && v.language !== targetLang && v.content);
  if (!candidates.length) return vibes;

  const { rows: cached } = await db.query(
    `SELECT vibe_id, content, method FROM vibe_translations WHERE target_lang = $1 AND vibe_id = ANY($2)`,
    [targetLang, candidates.map(v => v.id)]
  );
  const cacheMap = new Map(cached.map(r => [r.vibe_id, r]));

  let remainingAI = 0;
  if (userId) {
    const { rows } = await db.query(
      `SELECT COALESCE((SELECT subscription_plan FROM users WHERE id = $1), 'free') AS plan,
              COALESCE((SELECT count FROM translation_usage WHERE user_id = $1 AND day = CURRENT_DATE), 0) AS used`,
      [userId]
    );
    const cap = rows[0].plan !== "free" ? PRO_DAILY_AI_TRANSLATIONS : FREE_DAILY_AI_TRANSLATIONS;
    remainingAI = Math.max(0, cap - rows[0].used);
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
    await db.query(
      `INSERT INTO vibe_translations (vibe_id, target_lang, content, method) VALUES ($1,$2,$3,$4)
       ON CONFLICT (vibe_id, target_lang) DO UPDATE SET content = EXCLUDED.content, method = EXCLUDED.method`,
      [v.id, targetLang, result.text, result.method]
    ).catch(() => {});
    if (result.method === "claude") aiCallsMade++;
    v.translation = { text: result.text, method: result.method, fromLang: v.language, toLang: targetLang };
  }

  if (userId && aiCallsMade > 0) {
    await db.query(
      `INSERT INTO translation_usage (user_id, day, count) VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (user_id, day) DO UPDATE SET count = translation_usage.count + EXCLUDED.count`,
      [userId, aiCallsMade]
    ).catch(() => {});
  }

  return vibes;
}

// ── GET /vibes/feed — personalized home feed ─────────────────────────────
router.get("/feed", optionalAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || "0", 10);
  const pageSize = Math.min(parseInt(req.query.pageSize || "20", 10), 50);

  // Pull a candidate window (latest 100 non-reply vibes) for in-memory ranking.
  const { rows } = await db.query(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL
     ORDER BY v.created_at DESC LIMIT 100`
  );

  let userProfile = { interests: [], is_pro: false, followingIds: [] };
  if (req.user) {
    const u = await db.query(`SELECT interests, subscription_plan FROM users WHERE id = $1`, [req.user.id]);
    const following = await db.query(`SELECT following_id FROM connections WHERE follower_id = $1`, [req.user.id]);
    userProfile = {
      interests: u.rows[0]?.interests || [],
      is_pro: (u.rows[0]?.subscription_plan || "free") !== "free",
      followingIds: following.rows.map(r => r.following_id),
    };
  }

  const ranked = FeedEngine.rankFeed(rows, userProfile, { page, pageSize });
  const withState = await attachViewerState(ranked, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await translateVibesForViewer(shaped, req.query.lang, req.user?.id);
  return ok(res, { vibes: shaped, page, pageSize });
}));

// ── GET /vibes/category/:category — category feed (Explore filter chips) ─
router.get("/category/:category", optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id
     WHERE v.is_deleted = FALSE AND v.reply_to IS NULL AND v.category = $1
     ORDER BY v.created_at DESC LIMIT 50`,
    [req.params.category]
  );
  const withState = await attachViewerState(rows, req.user?.id);
  const shaped = withState.map(({ row, state }) => shapeVibe(row, state));
  await translateVibesForViewer(shaped, req.query.lang, req.user?.id);
  return ok(res, { vibes: shaped });
}));

// ── GET /vibes/:id — single vibe + its replies (comments) ───────────────
router.get("/:id", optionalAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id WHERE v.id = $1 AND v.is_deleted = FALSE`, [req.params.id]);
  if (!rows.length) return fail(res, 404, "Vibe not found");

  const replies = await db.query(
    `SELECT ${VIBE_FIELDS} FROM vibes v JOIN users u ON u.id = v.user_id WHERE v.reply_to = $1 AND v.is_deleted = FALSE ORDER BY v.created_at ASC LIMIT 100`,
    [req.params.id]
  );

  await db.query(`UPDATE vibes SET views_count = views_count + 1 WHERE id = $1`, [req.params.id]);
  await db.query(`INSERT INTO vibe_views (vibe_id, viewer_id, source) VALUES ($1,$2,$3)`, [req.params.id, req.user?.id || null, req.query.source || "direct"]).catch(() => {});

  const withState = await attachViewerState([rows[0], ...replies.rows], req.user?.id);
  const [main, ...rest] = withState;
  return ok(res, { vibe: shapeVibe(main.row, main.state), replies: rest.map(({ row, state }) => shapeVibe(row, state)) });
}));

// ── POST /vibes — create a vibe (post / reply / quote) ───────────────────
router.post("/", requireAuth, requirePermission("vibes.create"), asyncHandler(async (req, res) => {
  const { content, category, tags, replyTo, quoteOf, eventTitle, eventTime } = req.body;
  if (!content?.trim()) return fail(res, 400, "content is required");
  if (content.length > 500) return fail(res, 400, "content must be 500 characters or fewer");

  const moderation = ModerationEngine.analyzeContent(content);
  if (moderation.action === "remove" || moderation.action === "remove_and_support") {
    return fail(res, 422, `Post blocked: ${moderation.label}`, { moderation });
  }

  const language = await LanguageDetector.detect(content, "en");

  const { rows } = await db.query(
    `INSERT INTO vibes (user_id, content, category, tags, reply_to, quote_of, event_title, event_time, is_sensitive, language)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, content.trim(), category || "GENERAL", tags || [], replyTo || null, quoteOf || null,
     eventTitle || null, eventTime || null, moderation.action === "flag_for_review", language]
  );
  const vibe = rows[0];

  // Update hashtag registry
  for (const tag of (tags || [])) {
    await db.query(
      `INSERT INTO hashtags (tag, vibes_count, day_vibes_count, week_vibes_count, last_seen) VALUES ($1,1,1,1,NOW())
       ON CONFLICT (tag) DO UPDATE SET vibes_count = hashtags.vibes_count + 1, day_vibes_count = hashtags.day_vibes_count + 1,
         week_vibes_count = hashtags.week_vibes_count + 1, last_seen = NOW()`,
      [tag.replace(/^#/, "").toLowerCase()]
    ).catch(() => {});
  }

  // Notify the parent author on reply
  if (replyTo) {
    const parent = await db.query(`SELECT user_id FROM vibes WHERE id = $1`, [replyTo]);
    if (parent.rows.length && parent.rows[0].user_id !== req.user.id) {
      const body = NotificationEngine.formatBody("reply", req.user.displayName);
      await db.query(
        `INSERT INTO notifications (user_id, actor_id, type, vibe_id, body) VALUES ($1,$2,'reply',$3,$4)`,
        [parent.rows[0].user_id, req.user.id, vibe.id, body]
      );
    }
  }

  return ok(res, { vibe: shapeVibe({ ...vibe, handle: req.user.handle, display_name: req.user.displayName }) }, 201);
}));

// ── DELETE /vibes/:id ──────────────────────────────────────────────────────
router.delete("/:id", requireAuth, requireAnyPermission("vibes.delete.own", "vibes.delete.any"), asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT user_id FROM vibes WHERE id = $1`, [req.params.id]);
  if (!rows.length) return fail(res, 404, "Vibe not found");
  if (rows[0].user_id !== req.user.id && !req.user.isAdmin) return fail(res, 403, "Not your vibe");
  await db.query(`UPDATE vibes SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, [req.params.id]);
  return ok(res, { deleted: true });
}));

// ── POST /vibes/:id/like  &  DELETE /vibes/:id/like ──────────────────────
router.post("/:id/like", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO vibe_likes (user_id, vibe_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  const v = await db.query(`SELECT user_id, likes_count FROM vibes WHERE id = $1`, [req.params.id]);
  if (v.rows.length && v.rows[0].user_id !== req.user.id) {
    const body = NotificationEngine.formatBody("like", req.user.displayName);
    await db.query(`INSERT INTO notifications (user_id, actor_id, type, vibe_id, body) VALUES ($1,$2,'like',$3,$4)`, [v.rows[0].user_id, req.user.id, req.params.id, body]);
  }
  return ok(res, { liked: true, likesCount: v.rows[0]?.likes_count });
}));

router.delete("/:id/like", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`DELETE FROM vibe_likes WHERE user_id = $1 AND vibe_id = $2`, [req.user.id, req.params.id]);
  return ok(res, { liked: false });
}));

// ── POST /vibes/:id/repost  &  DELETE ─────────────────────────────────────
router.post("/:id/repost", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO vibe_reposts (user_id, vibe_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  const v = await db.query(`SELECT user_id FROM vibes WHERE id = $1`, [req.params.id]);
  if (v.rows.length && v.rows[0].user_id !== req.user.id) {
    const body = NotificationEngine.formatBody("repost", req.user.displayName);
    await db.query(`INSERT INTO notifications (user_id, actor_id, type, vibe_id, body) VALUES ($1,$2,'repost',$3,$4)`, [v.rows[0].user_id, req.user.id, req.params.id, body]);
  }
  return ok(res, { reposted: true });
}));

router.delete("/:id/repost", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`DELETE FROM vibe_reposts WHERE user_id = $1 AND vibe_id = $2`, [req.user.id, req.params.id]);
  return ok(res, { reposted: false });
}));

// ── POST /vibes/:id/bookmark  &  DELETE ───────────────────────────────────
router.post("/:id/bookmark", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`INSERT INTO vibe_bookmarks (user_id, vibe_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id]);
  await db.query(`UPDATE vibes SET bookmarks_count = bookmarks_count + 1 WHERE id = $1`, [req.params.id]);
  return ok(res, { saved: true });
}));

router.delete("/:id/bookmark", requireAuth, asyncHandler(async (req, res) => {
  await db.query(`DELETE FROM vibe_bookmarks WHERE user_id = $1 AND vibe_id = $2`, [req.user.id, req.params.id]);
  await db.query(`UPDATE vibes SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = $1`, [req.params.id]);
  return ok(res, { saved: false });
}));

// ── GET /vibes/me/bookmarks ────────────────────────────────────────────────
router.get("/me/bookmarks", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${VIBE_FIELDS} FROM vibe_bookmarks b JOIN vibes v ON v.id = b.vibe_id JOIN users u ON u.id = v.user_id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const withState = await attachViewerState(rows, req.user.id);
  return ok(res, { vibes: withState.map(({ row, state }) => shapeVibe(row, state)) });
}));

module.exports = { router, shapeVibe, VIBE_FIELDS };
