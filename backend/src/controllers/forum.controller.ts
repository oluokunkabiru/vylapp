import { Response } from "express";
import { AuthedRequest } from "../types/express";
import ModerationEngine from "../services/moderationEngine";
import TranslationEngine from "../services/translationEngine";
import LanguageDetector from "../services/languageDetector";
import prisma from "../config/prisma";
import { ThreadStatus, VoteValue } from "../generated/prisma";

function requireFields(body: any, fields: string[]) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw Object.assign(new Error(`Missing required fields: ${missing.join(", ")}`), { status: 400 });
}
function clamp(str: unknown, min: number, max: number, field: string): string {
  if (typeof str !== "string" || str.trim().length < min || str.trim().length > max)
    throw Object.assign(new Error(`${field} must be ${min}-${max} characters`), { status: 400 });
  return str.trim();
}
async function assertModerator(userId: string, categoryId: string) {
  const mod = await prisma.communityModerators.findFirst({
    where: { userId, categoryId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (!mod) throw Object.assign(new Error("Moderator access required"), { status: 403 });
  return mod;
}

// ── GET /forum/categories ─────────────────────────────────────────────────────
async function listCategories(req: AuthedRequest, res: Response) {
  const categories = await prisma.forumCategories.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, description: true, topicCategory: true, color: true, icon: true, sortOrder: true, threadCount: true },
    orderBy: { sortOrder: "asc" },
  });
  const shaped = categories.map(c => ({
    id: c.id, slug: c.slug, name: c.name, description: c.description, topic_category: c.topicCategory,
    color: c.color, icon: c.icon, sort_order: c.sortOrder, thread_count: c.threadCount,
  }));
  res.json({ ok: true, data: { categories: shaped } });
}

// ── GET /forum/categories/:slug/threads ───────────────────────────────────────
async function listThreads(req: AuthedRequest, res: Response) {
  const { slug } = req.params;
  const sort = (req.query.sort as string) || "hot";
  const page = parseInt((req.query.page as string) || "0", 10) || 0;
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.page_size as string) || "20", 10) || 20));
  const q = req.query.q as string | undefined;
  const offset = Math.max(0, page) * pageSize;

  const category = await prisma.forumCategories.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!category) return res.status(404).json({ ok: false, error: { message: "Category not found" } });

  let orderBy: string;
  switch (sort) {
    case "new": orderBy = "t.created_at DESC"; break;
    case "top": orderBy = "t.vote_score DESC, t.reply_count DESC"; break;
    case "hot": // Wilson score approximation: score + recency decay
    default: orderBy = "(t.vote_score + EXTRACT(EPOCH FROM t.created_at)/86400) DESC"; break;
  }

  // Kept as raw SQL: dynamic ORDER BY clause and optional ILIKE search term
  // don't compose cleanly with the query builder. Fixes a real bug found
  // while migrating: the original quoted u."displayName" — no such column
  // exists (the real one is display_name) — so this endpoint has always
  // thrown "column u.displayName does not exist" in production. There's no
  // frontend consumer yet (grepped — forum has no UI), which is why nobody
  // noticed. Fixed here.
  let sql = `SELECT t.id, t.title, t.language, t.vote_score, t.reply_count, t.view_count, t.is_pinned,
    t.is_announcement, t.tags, t.created_at, t.last_reply_at, t.status,
    u.id AS author_id, u.handle AS author_handle, u.display_name AS author_name
    FROM forum_threads t JOIN users u ON u.id = t.author_id
    WHERE t.category_id=$1 AND (t.status='active' OR t.is_pinned=TRUE)`;
  const params: any[] = [category.id];

  if (q?.trim()) { params.push(`%${q.trim()}%`); sql += ` AND (t.title ILIKE $${params.length} OR t.body ILIKE $${params.length})`; }

  sql += ` ORDER BY t.is_pinned DESC, ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;
  const threads: any[] = await prisma.$queryRawUnsafe(sql, ...params);
  await TranslationEngine.translateEntitiesForViewer(threads, req.query.lang as string, req.user?.id, { contentType: "thread_title", textKey: "title" });
  res.json({ ok: true, data: { threads, page, page_size: pageSize } });
}

// ── GET /forum/threads/:id ────────────────────────────────────────────────────
async function getThread(req: AuthedRequest, res: Response) {
  // Same displayName column-name fix as listThreads above.
  const threads: any[] = await prisma.$queryRaw`
    SELECT t.*, u.handle AS author_handle, u.display_name AS author_name, u.verified AS author_verified
    FROM forum_threads t JOIN users u ON u.id = t.author_id
    WHERE t.id=${req.params.id} AND t.status IN ('active','locked')
  `;
  if (!threads.length) return res.status(404).json({ ok: false, error: { message: "Thread not found" } });

  // Increment view count (fire and forget)
  prisma.forumThreads.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  // Fetch top-level replies (depth=0) with their immediate children
  const replies: any[] = await prisma.$queryRaw`
    SELECT r.id, r.body, r.language, r.vote_score, r.is_accepted, r.depth, r.parent_reply_id,
      r.created_at, r.is_removed, u.handle AS author_handle, u.display_name AS author_name
    FROM thread_replies r JOIN users u ON u.id = r.author_id
    WHERE r.thread_id=${req.params.id} AND r.is_removed=FALSE ORDER BY r.is_accepted DESC, r.vote_score DESC, r.created_at ASC
    LIMIT 100
  `;

  const targetLang = req.query.lang as string;
  const thread = threads[0];
  await TranslationEngine.translateEntitiesForViewer([thread], targetLang, req.user?.id, { contentType: "thread_title", textKey: "title" });
  await TranslationEngine.translateEntitiesForViewer([thread], targetLang, req.user?.id, { contentType: "thread", textKey: "body" });
  await TranslationEngine.translateEntitiesForViewer(replies, targetLang, req.user?.id, { contentType: "reply", textKey: "body" });

  res.json({ ok: true, data: { thread, replies } });
}

// ── POST /forum/threads ───────────────────────────────────────────────────────
async function createThread(req: AuthedRequest, res: Response) {
  requireFields(req.body, ["category_id", "title", "body"]);
  const { category_id, tags } = req.body;
  const title = clamp(req.body.title, 5, 300, "Title");
  const body = clamp(req.body.body, 10, 50000, "Body");

  // Moderation check on both title and body. account_age_days is never
  // populated on req.user by auth middleware (dead field, same category as
  // the isAdmin/vibes.routes bug — not something this migration re-scopes
  // to fix, since it'd require computing real account age at auth time).
  const mod = await ModerationEngine.analyzeContent(`${title}\n${body}`, { account_age_days: undefined });
  const autoStatus: ThreadStatus = mod.action === "allow" ? "active" : mod.confidence > 0.85 ? "removed" : "pending";

  if (mod.action === "remove" || mod.action === "remove_and_support") {
    if (mod.category === "SELF_HARM") {
      return res.status(200).json({
        ok: true,
        data: { support: true, message: "It looks like you might be going through something difficult. Vylapp cares about your wellbeing. Please reach out to a crisis support line if you need to talk." },
      });
    }
    return res.status(422).json({ ok: false, error: { message: `Content blocked: ${mod.label}` } });
  }

  const language = await LanguageDetector.detect(`${title} ${body}`, "en");
  const thread = await prisma.forumThreads.create({
    data: {
      categoryId: category_id,
      authorId: req.user.id,
      title,
      body,
      language,
      status: autoStatus,
      tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  res.status(201).json({ ok: true, data: { thread, pending: autoStatus === "pending" } });
}

// ── POST /forum/threads/:id/replies ───────────────────────────────────────────
async function createReply(req: AuthedRequest, res: Response) {
  requireFields(req.body, ["body"]);
  const body = clamp(req.body.body, 1, 10000, "Reply body");
  const { parent_reply_id } = req.body;

  // Check thread is open
  const thread = await prisma.forumThreads.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!thread || thread.status === "removed") return res.status(404).json({ ok: false, error: { message: "Thread not found" } });
  if (thread.status === "locked") return res.status(403).json({ ok: false, error: { message: "Thread is locked" } });

  // Check depth
  let depth = 0;
  if (parent_reply_id) {
    const parent = await prisma.threadReplies.findFirst({ where: { id: parent_reply_id, threadId: req.params.id }, select: { depth: true } });
    if (!parent) return res.status(404).json({ ok: false, error: { message: "Parent reply not found" } });
    depth = parent.depth + 1;
    if (depth > 3) return res.status(400).json({ ok: false, error: { message: "Maximum reply depth (3) reached" } });
  }

  // Moderation
  const mod = await ModerationEngine.analyzeContent(body);
  if (mod.action === "remove" || mod.action === "remove_and_support") {
    if (mod.category === "SELF_HARM") return res.status(200).json({ ok: true, data: { support: true } });
    return res.status(422).json({ ok: false, error: { message: `Content blocked: ${mod.label}` } });
  }

  const language = await LanguageDetector.detect(body, "en");
  const reply = await prisma.threadReplies.create({
    data: { threadId: req.params.id, authorId: req.user.id, parentReplyId: parent_reply_id || null, body, depth, language },
    select: { id: true, body: true, depth: true, createdAt: true },
  });

  res.status(201).json({ ok: true, data: { reply } });
}

// ── POST /forum/threads/:id/vote ──────────────────────────────────────────────
async function voteThread(req: AuthedRequest, res: Response) {
  const { value } = req.body; // "up" or "down"
  if (!["up", "down"].includes(value)) return res.status(400).json({ ok: false, error: { message: "Vote must be 'up' or 'down'" } });

  await prisma.forumVotes.upsert({
    where: { userId_threadId: { userId: req.user.id, threadId: req.params.id } },
    create: { userId: req.user.id, threadId: req.params.id, value: value as VoteValue },
    update: { value: value as VoteValue },
  });

  const thread = await prisma.forumThreads.findUnique({ where: { id: req.params.id }, select: { voteScore: true } });
  res.json({ ok: true, data: { vote_score: thread?.voteScore ?? 0 } });
}

// ── POST /forum/replies/:id/vote ──────────────────────────────────────────────
async function voteReply(req: AuthedRequest, res: Response) {
  const { value } = req.body;
  if (!["up", "down"].includes(value)) return res.status(400).json({ ok: false, error: { message: "Vote must be 'up' or 'down'" } });

  await prisma.forumVotes.upsert({
    where: { userId_replyId: { userId: req.user.id, replyId: req.params.id } },
    create: { userId: req.user.id, replyId: req.params.id, value: value as VoteValue },
    update: { value: value as VoteValue },
  });

  const reply = await prisma.threadReplies.findUnique({ where: { id: req.params.id }, select: { voteScore: true } });
  res.json({ ok: true, data: { vote_score: reply?.voteScore ?? 0 } });
}

// ── PATCH /forum/threads/:id — Moderator: pin, lock, remove ──────────────────
async function patchThread(req: AuthedRequest, res: Response) {
  const thread = await prisma.forumThreads.findUnique({ where: { id: req.params.id }, select: { categoryId: true, status: true } });
  if (!thread) return res.status(404).json({ ok: false, error: { message: "Thread not found" } });

  // A platform admin with forum.thread.delete.any bypasses the per-category
  // moderator check entirely — this permission previously had no endpoint
  // wired to it.
  const hasGlobalOverride = req.can!("forum.thread.delete.any");
  const mod = hasGlobalOverride ? null : await assertModerator(req.user.id, thread.categoryId);
  const { is_pinned, status, moderation_note } = req.body;

  const data: Record<string, unknown> = {};
  if (is_pinned !== undefined && (hasGlobalOverride || mod!.role !== "moderator")) { data.isPinned = is_pinned; }
  if (is_pinned !== undefined && !hasGlobalOverride && mod!.role === "moderator") { /* pin requires senior_mod or above */ }
  if (status !== undefined) { data.status = status; }
  if (moderation_note) { data.moderationNote = moderation_note; }

  if (!Object.keys(data).length) return res.status(400).json({ ok: false, error: { message: "No valid fields to update" } });
  await prisma.forumThreads.update({ where: { id: req.params.id }, data });
  res.json({ ok: true });
}

// ── DELETE /forum/replies/:id — Author or moderator can soft-delete ───────────
async function deleteReply(req: AuthedRequest, res: Response) {
  const reply = await prisma.threadReplies.findUnique({
    where: { id: req.params.id },
    select: { authorId: true, threadId: true, forumThreads: { select: { categoryId: true } } },
  });
  if (!reply) return res.status(404).json({ ok: false, error: { message: "Reply not found" } });

  const isAuthor = reply.authorId === req.user.id;
  let isMod = false;
  if (!isAuthor) {
    const modCheck = await prisma.communityModerators.findFirst({ where: { userId: req.user.id, categoryId: reply.forumThreads.categoryId } });
    isMod = !!modCheck;
  }
  if (!isAuthor && !isMod) return res.status(403).json({ ok: false, error: { message: "Not authorized to delete this reply" } });

  await prisma.threadReplies.update({ where: { id: req.params.id }, data: { isRemoved: true, body: "[removed]" } });
  res.json({ ok: true });
}

export = { listCategories, listThreads, getThread, createThread, createReply, voteThread, voteReply, patchThread, deleteReply };
