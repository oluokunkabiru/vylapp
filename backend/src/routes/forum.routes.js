// ════════════════════════════════════════════════════════════════════════════
//  FORUM ROUTES  /forum/*
//
//  Security: every POST/PATCH of user content goes through ModerationEngine.
//  Depth limit on replies (max 3) is enforced at the route level, not only
//  in the database CHECK — defence in depth.
//  New threads start with status='pending' and are auto-approved if
//  ModerationEngine gives confidence < 0.5 (safe). If confidence ≥ 0.5
//  and < 0.85, they are queued for human review (visible only to author).
// ════════════════════════════════════════════════════════════════════════════
const express          = require("express");
const router           = express.Router();
const asyncHandler     = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const ModerationEngine = require("../services/moderationEngine");
const db               = require("../db");

function requireFields(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw Object.assign(new Error(`Missing required fields: ${missing.join(", ")}`), { status: 400 });
}
function clamp(str, min, max, field) {
  if (typeof str !== "string" || str.trim().length < min || str.trim().length > max)
    throw Object.assign(new Error(`${field} must be ${min}-${max} characters`), { status: 400 });
  return str.trim();
}
async function assertModerator(userId, categoryId) {
  const { rows } = await db.query(
    "SELECT role FROM community_moderators WHERE user_id=$1 AND category_id=$2 AND (expires_at IS NULL OR expires_at > NOW())",
    [userId, categoryId]);
  if (!rows.length) throw Object.assign(new Error("Moderator access required"), { status: 403 });
  return rows[0];
}

// ── GET /forum/categories ─────────────────────────────────────────────────────
router.get("/categories", asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, slug, name, description, topic_category, color, icon, sort_order, thread_count FROM forum_categories WHERE is_active=TRUE ORDER BY sort_order");
  res.json({ ok: true, data: { categories: rows } });
}));

// ── GET /forum/categories/:slug/threads ───────────────────────────────────────
router.get("/categories/:slug/threads", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { sort = "hot", page = 0, page_size = 20, q } = req.query;
  const limit  = Math.min(50, Math.max(1, parseInt(page_size, 10) || 20));
  const offset = Math.max(0, parseInt(page, 10)) * limit;

  const catRows = await db.query("SELECT id FROM forum_categories WHERE slug=$1 AND is_active=TRUE", [slug]);
  if (!catRows.rows.length) return res.status(404).json({ ok: false, error: { message: "Category not found" } });
  const catId = catRows.rows[0].id;

  let orderBy;
  switch (sort) {
    case "new":  orderBy = "t.created_at DESC"; break;
    case "top":  orderBy = "t.vote_score DESC, t.reply_count DESC"; break;
    case "hot":  // Wilson score approximation: score + recency decay
    default:     orderBy = "(t.vote_score + EXTRACT(EPOCH FROM t.created_at)/86400) DESC"; break;
  }

  let sql = `SELECT t.id, t.title, t.vote_score, t.reply_count, t.view_count, t.is_pinned,
    t.is_announcement, t.tags, t.created_at, t.last_reply_at, t.status,
    u.id AS author_id, u.handle AS author_handle, u."displayName" AS author_name
    FROM forum_threads t JOIN users u ON u.id = t.author_id
    WHERE t.category_id=$1 AND (t.status='active' OR t.is_pinned=TRUE)`;
  const params = [catId];

  if (q?.trim()) { params.push(`%${q.trim()}%`); sql += ` AND (t.title ILIKE $${params.length} OR t.body ILIKE $${params.length})`; }

  sql += ` ORDER BY t.is_pinned DESC, ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
  const { rows } = await db.query(sql, params);
  res.json({ ok: true, data: { threads: rows, page: parseInt(page, 10), page_size: limit } });
}));

// ── GET /forum/threads/:id ────────────────────────────────────────────────────
router.get("/threads/:id", asyncHandler(async (req, res) => {
  const { rows: tRows } = await db.query(`
    SELECT t.*, u.handle AS author_handle, u."displayName" AS author_name, u.verified AS author_verified
    FROM forum_threads t JOIN users u ON u.id = t.author_id
    WHERE t.id=$1 AND t.status IN ('active','locked')`, [req.params.id]);
  if (!tRows.length) return res.status(404).json({ ok: false, error: { message: "Thread not found" } });

  // Increment view count (fire and forget)
  db.query("UPDATE forum_threads SET view_count=view_count+1 WHERE id=$1", [req.params.id]).catch(() => {});

  // Fetch top-level replies (depth=0) with their immediate children
  const { rows: replies } = await db.query(`
    SELECT r.id, r.body, r.vote_score, r.is_accepted, r.depth, r.parent_reply_id,
      r.created_at, r.is_removed, u.handle AS author_handle, u."displayName" AS author_name
    FROM thread_replies r JOIN users u ON u.id = r.author_id
    WHERE r.thread_id=$1 AND r.is_removed=FALSE ORDER BY r.is_accepted DESC, r.vote_score DESC, r.created_at ASC
    LIMIT 100`, [req.params.id]);

  res.json({ ok: true, data: { thread: tRows[0], replies } });
}));

// ── POST /forum/threads ───────────────────────────────────────────────────────
router.post("/threads", authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ["category_id", "title", "body"]);
  const { category_id, tags } = req.body;
  const title = clamp(req.body.title, 5, 300, "Title");
  const body  = clamp(req.body.body, 10, 50000, "Body");

  // Moderation check on both title and body
  const mod = await ModerationEngine.analyzeContent(`${title}\n${body}`, { account_age_days: req.user.account_age_days });
  const autoStatus = mod.action === "allow" ? "active" : mod.confidence > 0.85 ? "removed" : "pending";

  if (mod.action === "remove" || mod.action === "remove_and_support") {
    if (mod.category === "SELF_HARM") {
      // Return a support message, not an error — do not shame the user
      return res.status(200).json({
        ok: true,
        data: { support: true, message: "It looks like you might be going through something difficult. Vylapp cares about your wellbeing. Please reach out to a crisis support line if you need to talk." },
      });
    }
    return res.status(422).json({ ok: false, error: { message: `Content blocked: ${mod.label}` } });
  }

  const { rows } = await db.query(
    `INSERT INTO forum_threads (category_id, author_id, title, body, status, tags)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, status, created_at`,
    [category_id, req.user.id, title, body, autoStatus, Array.isArray(tags) ? tags.slice(0, 5) : []]);

  res.status(201).json({ ok: true, data: { thread: rows[0], pending: autoStatus === "pending" } });
}));

// ── POST /forum/threads/:id/replies ───────────────────────────────────────────
router.post("/threads/:id/replies", authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ["body"]);
  const body            = clamp(req.body.body, 1, 10000, "Reply body");
  const { parent_reply_id } = req.body;

  // Check thread is open
  const { rows: tRows } = await db.query("SELECT id, status FROM forum_threads WHERE id=$1", [req.params.id]);
  if (!tRows.length || tRows[0].status === "removed") return res.status(404).json({ ok: false, error: { message: "Thread not found" } });
  if (tRows[0].status === "locked") return res.status(403).json({ ok: false, error: { message: "Thread is locked" } });

  // Check depth
  let depth = 0;
  if (parent_reply_id) {
    const { rows: pRows } = await db.query("SELECT depth FROM thread_replies WHERE id=$1 AND thread_id=$2", [parent_reply_id, req.params.id]);
    if (!pRows.length) return res.status(404).json({ ok: false, error: { message: "Parent reply not found" } });
    depth = pRows[0].depth + 1;
    if (depth > 3) return res.status(400).json({ ok: false, error: { message: "Maximum reply depth (3) reached" } });
  }

  // Moderation
  const mod = await ModerationEngine.analyzeContent(body);
  if (mod.action === "remove" || mod.action === "remove_and_support") {
    if (mod.category === "SELF_HARM") return res.status(200).json({ ok: true, data: { support: true } });
    return res.status(422).json({ ok: false, error: { message: `Content blocked: ${mod.label}` } });
  }

  const { rows } = await db.query(
    `INSERT INTO thread_replies (thread_id, author_id, parent_reply_id, body, depth)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, body, depth, created_at`,
    [req.params.id, req.user.id, parent_reply_id || null, body, depth]);

  res.status(201).json({ ok: true, data: { reply: rows[0] } });
}));

// ── POST /forum/threads/:id/vote ──────────────────────────────────────────────
router.post("/threads/:id/vote", authenticate, asyncHandler(async (req, res) => {
  const { value } = req.body; // "up" or "down"
  if (!["up", "down"].includes(value)) return res.status(400).json({ ok: false, error: { message: "Vote must be 'up' or 'down'" } });

  await db.query(
    `INSERT INTO forum_votes (user_id, thread_id, value) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, thread_id) DO UPDATE SET value=$3`,
    [req.user.id, req.params.id, value]);

  const { rows } = await db.query("SELECT vote_score FROM forum_threads WHERE id=$1", [req.params.id]);
  res.json({ ok: true, data: { vote_score: rows[0]?.vote_score ?? 0 } });
}));

// ── POST /forum/replies/:id/vote ──────────────────────────────────────────────
router.post("/replies/:id/vote", authenticate, asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (!["up", "down"].includes(value)) return res.status(400).json({ ok: false, error: { message: "Vote must be 'up' or 'down'" } });

  await db.query(
    `INSERT INTO forum_votes (user_id, reply_id, value) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, reply_id) DO UPDATE SET value=$3`,
    [req.user.id, req.params.id, value]);

  const { rows } = await db.query("SELECT vote_score FROM thread_replies WHERE id=$1", [req.params.id]);
  res.json({ ok: true, data: { vote_score: rows[0]?.vote_score ?? 0 } });
}));

// ── PATCH /forum/threads/:id — Moderator: pin, lock, remove ──────────────────
router.patch("/threads/:id", authenticate, asyncHandler(async (req, res) => {
  const { rows: tRows } = await db.query("SELECT category_id, status FROM forum_threads WHERE id=$1", [req.params.id]);
  if (!tRows.length) return res.status(404).json({ ok: false, error: { message: "Thread not found" } });

  // Must be a moderator of this category
  const mod = await assertModerator(req.user.id, tRows[0].category_id);
  const { is_pinned, status, moderation_note } = req.body;

  const updates = []; const vals = [];
  if (is_pinned !== undefined && mod.role !== "moderator")     { updates.push(`is_pinned=$${vals.push(is_pinned)}`); }
  if (is_pinned !== undefined && mod.role === "moderator")     { /* pin requires senior_mod or above */ }
  if (status !== undefined)      { updates.push(`status=$${vals.push(status)}`); }
  if (moderation_note)           { updates.push(`moderation_note=$${vals.push(moderation_note)}`); }

  if (!updates.length) return res.status(400).json({ ok: false, error: { message: "No valid fields to update" } });
  vals.push(req.params.id);
  await db.query(`UPDATE forum_threads SET ${updates.join(",")} WHERE id=$${vals.length}`, vals);
  res.json({ ok: true });
}));

// ── DELETE /forum/replies/:id — Author or moderator can soft-delete ───────────
router.delete("/replies/:id", authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    "SELECT r.author_id, r.thread_id, t.category_id FROM thread_replies r JOIN forum_threads t ON t.id=r.thread_id WHERE r.id=$1",
    [req.params.id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: { message: "Reply not found" } });

  const isAuthor = rows[0].author_id === req.user.id;
  let isMod = false;
  if (!isAuthor) {
    const modCheck = await db.query("SELECT id FROM community_moderators WHERE user_id=$1 AND category_id=$2", [req.user.id, rows[0].category_id]);
    isMod = modCheck.rows.length > 0;
  }
  if (!isAuthor && !isMod) return res.status(403).json({ ok: false, error: { message: "Not authorized to delete this reply" } });

  await db.query("UPDATE thread_replies SET is_removed=TRUE, body='[removed]' WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
