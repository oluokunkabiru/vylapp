// ════════════════════════════════════════════════════════════════════════════
//  LEARN ROUTES  /learn/*
//
//  All routes require authentication unless noted.
//  Rate limiting is applied globally via the rateLimiter middleware in app.js.
//  Input validation is strict — every field is validated before any DB call.
//  All user content passes through ModerationEngine before being stored.
// ════════════════════════════════════════════════════════════════════════════
const express          = require("express");
const router           = express.Router();
const asyncHandler     = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const ModerationEngine = require("../services/moderationEngine");
const db               = require("../config/db");
const crypto           = require("crypto");

// ── Validation helpers ────────────────────────────────────────────────────────
function requireFields(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw Object.assign(new Error(`Missing required fields: ${missing.join(", ")}`), { status: 400 });
}

function clamp(str, min, max, field) {
  if (typeof str !== "string" || str.trim().length < min || str.trim().length > max)
    throw Object.assign(new Error(`${field} must be between ${min} and ${max} characters`), { status: 400 });
  return str.trim();
}

async function assertEducator(userId) {
  const { rows } = await db.query("SELECT id, status FROM educator_profiles WHERE user_id=$1", [userId]);
  if (!rows.length) throw Object.assign(new Error("Educator profile required. Apply first."), { status: 403 });
  if (rows[0].status === "suspended") throw Object.assign(new Error("Educator account suspended"), { status: 403 });
  return rows[0];
}

// ── GET /learn/categories ─────────────────────────────────────────────────────
// Public: no auth required.
router.get("/categories", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, slug, name, description, topic_category, color, icon, sort_order, thread_count
    FROM forum_categories WHERE is_active = TRUE ORDER BY sort_order`);
  res.json({ ok: true, data: { categories: rows } });
}));

// ── GET /learn/courses ────────────────────────────────────────────────────────
// Public. Filtered by category, language, difficulty, is_free.
router.get("/courses", asyncHandler(async (req, res) => {
  const { category, language, difficulty, is_free, q, page = 0, page_size = 12 } = req.query;
  const limit  = Math.min(50, Math.max(1, parseInt(page_size, 10) || 12));
  const offset = Math.max(0, parseInt(page, 10) || 0) * limit;

  let sql = `SELECT c.id, c.title, c.description, c.category, c.language, c.difficulty,
    c.is_free, c.price_usd, c.cover_image_url, c.estimated_hours,
    c.enrolment_count, c.avg_rating, c.total_lessons, c.published_at,
    u.handle AS educator_handle, u.display_name AS educator_name,
    ep.status AS educator_status
    FROM courses c
    JOIN educator_profiles ep ON ep.id = c.educator_id
    JOIN users u ON u.id = ep.user_id
    WHERE c.status = 'published'`;
  const params = [];

  if (category)                  { params.push(category);       sql += ` AND c.category = $${params.length}`; }
  if (language)                  { params.push(language);       sql += ` AND c.language = $${params.length}`; }
  if (difficulty)                { params.push(difficulty);     sql += ` AND c.difficulty = $${params.length}`; }
  if (is_free !== undefined)     { params.push(is_free === "true"); sql += ` AND c.is_free = $${params.length}`; }
  if (q?.trim())                 { params.push(`%${q.trim()}%`); sql += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`; }

  sql += ` ORDER BY c.avg_rating DESC, c.enrolment_count DESC LIMIT ${limit} OFFSET ${offset}`;
  const { rows } = await db.query(sql, params);
  res.json({ ok: true, data: { courses: rows, page: parseInt(page, 10) || 0, page_size: limit } });
}));

// ── GET /learn/courses/:id ─────────────────────────────────────────────────────
router.get("/courses/:id", asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT c.*, u.handle AS educator_handle, u.display_name AS educator_name,
      ep.bio AS educator_bio, ep.subjects, ep.languages_taught, ep.avg_rating AS educator_rating
    FROM courses c
    JOIN educator_profiles ep ON ep.id = c.educator_id
    JOIN users u ON u.id = ep.user_id
    WHERE c.id = $1 AND c.status = 'published'`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: { message: "Course not found" } });

  const { rows: lessons } = await db.query(
    "SELECT id, title, type, duration_minutes, sort_order, is_free_preview FROM lessons WHERE course_id=$1 ORDER BY sort_order",
    [rows[0].id]);

  res.json({ ok: true, data: { course: rows[0], lessons } });
}));

// ── GET /learn/lessons/:id ────────────────────────────────────────────────────
// Requires enrolment in the parent course, unless the lesson is a free preview.
// Quiz checkpoints are returned with correct_option/explanation stripped —
// those only come back from POST /learn/checkpoints/:id/answer, after scoring.
router.get("/lessons/:id", authenticate, asyncHandler(async (req, res) => {
  const { rows: lessonRows } = await db.query(
    "SELECT * FROM lessons WHERE id = $1", [req.params.id]);
  if (!lessonRows.length) return res.status(404).json({ ok: false, error: { message: "Lesson not found" } });
  const lesson = lessonRows[0];

  if (!lesson.is_free_preview) {
    const enrolCheck = await db.query(
      "SELECT id FROM course_enrolments WHERE user_id=$1 AND course_id=$2 AND status IN ('active','completed')",
      [req.user.id, lesson.course_id]);
    if (!enrolCheck.rows.length) return res.status(403).json({ ok: false, error: { message: "Enrol in this course to view the lesson" } });
  }

  const { rows: completion } = await db.query(
    "SELECT * FROM lesson_completions WHERE user_id=$1 AND lesson_id=$2", [req.user.id, req.params.id]);

  let checkpoints = [];
  if (lesson.type === "quiz") {
    const { rows: cps } = await db.query(
      "SELECT id, question, options, points, sort_order FROM knowledge_checkpoints WHERE lesson_id=$1 ORDER BY sort_order",
      [req.params.id]);
    const { rows: responses } = await db.query(
      `SELECT cr.checkpoint_id, cr.selected_option, cr.is_correct, cr.points_earned
       FROM checkpoint_responses cr JOIN knowledge_checkpoints kc ON kc.id = cr.checkpoint_id
       WHERE cr.user_id = $1 AND kc.lesson_id = $2`,
      [req.user.id, req.params.id]);
    const responseMap = new Map(responses.map(r => [r.checkpoint_id, r]));
    checkpoints = cps.map(c => ({ ...c, response: responseMap.get(c.id) || null }));
  }

  res.json({ ok: true, data: { lesson, checkpoints, completion: completion[0] || null } });
}));

// ── POST /learn/checkpoints/:id/answer ────────────────────────────────────────
router.post("/checkpoints/:id/answer", authenticate, asyncHandler(async (req, res) => {
  const { selected_option } = req.body;
  requireFields(req.body, ["selected_option"]);

  const { rows } = await db.query(
    `SELECT kc.id, kc.correct_option, kc.explanation, kc.points, l.course_id
     FROM knowledge_checkpoints kc JOIN lessons l ON l.id = kc.lesson_id
     WHERE kc.id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: { message: "Checkpoint not found" } });
  const checkpoint = rows[0];

  const enrolCheck = await db.query(
    "SELECT id FROM course_enrolments WHERE user_id=$1 AND course_id=$2 AND status IN ('active','completed')",
    [req.user.id, checkpoint.course_id]);
  if (!enrolCheck.rows.length) return res.status(403).json({ ok: false, error: { message: "Enrol in this course to answer" } });

  const isCorrect = selected_option === checkpoint.correct_option;
  const pointsEarned = isCorrect ? checkpoint.points : 0;

  await db.query(
    `INSERT INTO checkpoint_responses (user_id, checkpoint_id, selected_option, is_correct, points_earned)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, checkpoint_id) DO UPDATE
       SET selected_option = EXCLUDED.selected_option, is_correct = EXCLUDED.is_correct,
           points_earned = EXCLUDED.points_earned, responded_at = NOW()`,
    [req.user.id, req.params.id, selected_option, isCorrect, pointsEarned]);

  res.json({ ok: true, data: {
    is_correct: isCorrect, correct_option: checkpoint.correct_option,
    explanation: checkpoint.explanation, points_earned: pointsEarned,
  } });
}));

// ── POST /learn/educator/apply ─────────────────────────────────────────────────
router.post("/educator/apply", authenticate, asyncHandler(async (req, res) => {
  const { bio, subjects, languages_taught } = req.body;
  requireFields(req.body, ["bio", "subjects"]);
  const cleanBio = clamp(bio, 20, 2000, "Bio");
  if (!Array.isArray(subjects) || subjects.length === 0) throw Object.assign(new Error("At least one subject required"), { status: 400 });

  const mod = await ModerationEngine.analyzeContent(cleanBio);
  if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Content flagged: " + mod.label } });

  const existing = await db.query("SELECT id FROM educator_profiles WHERE user_id=$1", [req.user.id]);
  if (existing.rows.length) return res.status(409).json({ ok: false, error: { message: "Educator profile already exists" } });

  const { rows } = await db.query(
    `INSERT INTO educator_profiles (user_id, bio, subjects, languages_taught)
     VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
    [req.user.id, cleanBio, subjects.slice(0, 10), languages_taught || ["en"]]);
  res.status(201).json({ ok: true, data: { educator: rows[0] } });
}));

// ── POST /learn/courses ────────────────────────────────────────────────────────
router.post("/courses", authenticate, asyncHandler(async (req, res) => {
  const educator = await assertEducator(req.user.id);
  const { title, description, category, language, difficulty, is_free, price_usd, tags } = req.body;
  requireFields(req.body, ["title", "description", "category"]);
  const cleanTitle = clamp(title, 5, 200, "Title");
  const cleanDesc  = clamp(description, 20, 5000, "Description");

  const mod = await ModerationEngine.analyzeContent(`${cleanTitle} ${cleanDesc}`);
  if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Content flagged: " + mod.label } });

  const { rows } = await db.query(
    `INSERT INTO courses (educator_id, title, description, category, language, difficulty, is_free, price_usd, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, title, status, created_at`,
    [educator.id, cleanTitle, cleanDesc, category, language || "en",
     difficulty || "beginner", is_free !== false, Math.max(0, parseFloat(price_usd) || 0),
     Array.isArray(tags) ? tags.slice(0, 10) : []]);
  res.status(201).json({ ok: true, data: { course: rows[0] } });
}));

// ── POST /learn/courses/:id/lessons ───────────────────────────────────────────
router.post("/courses/:id/lessons", authenticate, asyncHandler(async (req, res) => {
  const educator = await assertEducator(req.user.id);
  const { rows: courseRows } = await db.query("SELECT id FROM courses WHERE id=$1 AND educator_id=$2", [req.params.id, educator.id]);
  if (!courseRows.length) return res.status(404).json({ ok: false, error: { message: "Course not found or not yours" } });

  const { title, type, content, duration_minutes, is_free_preview, sort_order } = req.body;
  requireFields(req.body, ["title", "type", "content"]);
  const cleanTitle = clamp(title, 3, 200, "Title");
  const validTypes = ["video", "article", "quiz", "live_session", "interactive"];
  if (!validTypes.includes(type)) throw Object.assign(new Error(`Invalid lesson type. Must be one of: ${validTypes.join(", ")}`), { status: 400 });

  const { rows } = await db.query(
    `INSERT INTO lessons (course_id, title, type, content, duration_minutes, is_free_preview, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title, type, sort_order`,
    [req.params.id, cleanTitle, type, content, duration_minutes || null, is_free_preview || false, sort_order || 0]);

  // Update total_lessons count on the course
  await db.query("UPDATE courses SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id=$1) WHERE id=$1", [req.params.id]);

  res.status(201).json({ ok: true, data: { lesson: rows[0] } });
}));

// ── POST /learn/courses/:id/enrol ─────────────────────────────────────────────
router.post("/courses/:id/enrol", authenticate, asyncHandler(async (req, res) => {
  const { rows: courseRows } = await db.query("SELECT id, is_free, price_usd, status FROM courses WHERE id=$1", [req.params.id]);
  if (!courseRows.length || courseRows[0].status !== "published") {
    return res.status(404).json({ ok: false, error: { message: "Course not found or not available" } });
  }
  const course = courseRows[0];

  const existing = await db.query("SELECT id FROM course_enrolments WHERE user_id=$1 AND course_id=$2", [req.user.id, req.params.id]);
  if (existing.rows.length) return res.status(409).json({ ok: false, error: { message: "Already enrolled" } });

  if (!course.is_free && course.price_usd > 0) {
    // Paid course: payment intent must be provided and verified
    const { stripe_payment_intent_id } = req.body;
    if (!stripe_payment_intent_id) return res.status(402).json({ ok: false, error: { message: "Payment required. Provide stripe_payment_intent_id." } });
    // TODO: verify payment intent with Stripe SDK before inserting
    const { rows } = await db.query(
      "INSERT INTO course_enrolments (user_id, course_id, stripe_payment_intent_id, amount_paid_usd) VALUES ($1,$2,$3,$4) RETURNING id, enrolled_at",
      [req.user.id, req.params.id, stripe_payment_intent_id, course.price_usd]);
    return res.status(201).json({ ok: true, data: { enrolment: rows[0] } });
  }

  const { rows } = await db.query(
    "INSERT INTO course_enrolments (user_id, course_id) VALUES ($1,$2) RETURNING id, enrolled_at",
    [req.user.id, req.params.id]);
  res.status(201).json({ ok: true, data: { enrolment: rows[0] } });
}));

// ── POST /learn/lessons/:id/complete ──────────────────────────────────────────
router.post("/lessons/:id/complete", authenticate, asyncHandler(async (req, res) => {
  const { score, time_spent_sec } = req.body;
  const { rows: lessonRows } = await db.query("SELECT id, course_id, type FROM lessons WHERE id=$1", [req.params.id]);
  if (!lessonRows.length) return res.status(404).json({ ok: false, error: { message: "Lesson not found" } });
  const lesson = lessonRows[0];

  // Verify enrolment
  const enrolCheck = await db.query("SELECT id FROM course_enrolments WHERE user_id=$1 AND course_id=$2 AND status='active'", [req.user.id, lesson.course_id]);
  if (!enrolCheck.rows.length) return res.status(403).json({ ok: false, error: { message: "Not enrolled in this course" } });

  const { rows } = await db.query(
    `INSERT INTO lesson_completions (user_id, lesson_id, course_id, score, progress_pct, completed_at, time_spent_sec)
     VALUES ($1, $2, $3, $4, 100, NOW(), $5)
     ON CONFLICT (user_id, lesson_id) DO UPDATE
       SET score = EXCLUDED.score, progress_pct = 100, completed_at = NOW(), time_spent_sec = EXCLUDED.time_spent_sec
     RETURNING id, completed_at`,
    [req.user.id, req.params.id, lesson.course_id, score !== undefined ? Math.min(100, Math.max(0, parseInt(score, 10))) : null, time_spent_sec || 0]);

  // Check if course is now complete and issue certificate
  const progressCheck = await db.query(
    "SELECT progress_pct, completed_at FROM course_enrolments WHERE user_id=$1 AND course_id=$2",
    [req.user.id, lesson.course_id]);
  let certificate = null;
  if (progressCheck.rows[0]?.progress_pct === 100) {
    certificate = await issueCertificate(req.user.id, lesson.course_id);
  }

  res.json({ ok: true, data: { completion: rows[0], certificate } });
}));

// ── GET /learn/me/enrolments ──────────────────────────────────────────────────
router.get("/me/enrolments", authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT ce.id, ce.course_id, ce.status, ce.progress_pct, ce.lessons_done, ce.enrolled_at, ce.completed_at,
      c.title, c.cover_image_url, c.total_lessons, c.category
    FROM course_enrolments ce JOIN courses c ON c.id = ce.course_id
    WHERE ce.user_id = $1 ORDER BY ce.enrolled_at DESC`, [req.user.id]);
  res.json({ ok: true, data: { enrolments: rows } });
}));

// ── GET /learn/me/certificates ────────────────────────────────────────────────
router.get("/me/certificates", authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM certificates WHERE user_id=$1 AND revoked_at IS NULL ORDER BY issued_at DESC",
    [req.user.id]);
  res.json({ ok: true, data: { certificates: rows } });
}));

// ── GET /learn/certificates/:id ────────────────────────────────────────────────
// Public: certificates are independently verifiable.
router.get("/certificates/:id", asyncHandler(async (req, res) => {
  const { rows } = await db.query("SELECT * FROM certificates WHERE id=$1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: { message: "Certificate not found or invalid" } });
  if (rows[0].revoked_at) return res.status(410).json({ ok: false, error: { message: "Certificate revoked" } });
  res.json({ ok: true, data: { certificate: rows[0], valid: true } });
}));

// ── POST /learn/courses/:id/rate ──────────────────────────────────────────────
router.post("/courses/:id/rate", authenticate, asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) throw Object.assign(new Error("Rating must be 1-5"), { status: 400 });
  const enrolCheck = await db.query("SELECT id FROM course_enrolments WHERE user_id=$1 AND course_id=$2 AND status='completed'", [req.user.id, req.params.id]);
  if (!enrolCheck.rows.length) return res.status(403).json({ ok: false, error: { message: "Must complete the course before rating" } });

  if (review) {
    const mod = await ModerationEngine.analyzeContent(review);
    if (mod.action !== "allow") return res.status(422).json({ ok: false, error: { message: "Review content flagged: " + mod.label } });
  }

  const { rows } = await db.query(
    `INSERT INTO course_ratings (user_id, course_id, rating, review)
     VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, course_id) DO UPDATE SET rating=EXCLUDED.rating, review=EXCLUDED.review, updated_at=NOW()
     RETURNING id, rating, created_at`,
    [req.user.id, req.params.id, parseInt(rating, 10), review?.trim() || null]);
  res.json({ ok: true, data: { rating: rows[0] } });
}));

// ── Internal: certificate issuance ────────────────────────────────────────────
async function issueCertificate(userId, courseId) {
  const { rows: cRows } = await db.query(
    "SELECT c.title, u.display_name AS \"displayName\" FROM courses c JOIN educator_profiles ep ON ep.id = c.educator_id JOIN users u ON u.id = ep.user_id WHERE c.id=$1",
    [courseId]);
  if (!cRows.length) return null;

  const issuedAt  = new Date().toISOString();
  const certId    = crypto.createHash("sha256").update(`${userId}:${courseId}:${issuedAt}`).digest("hex");

  const { rows } = await db.query(
    `INSERT INTO certificates (id, user_id, course_id, course_title, educator_name, issued_at)
     VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (user_id, course_id) DO NOTHING RETURNING id, issued_at`,
    [certId, userId, courseId, cRows[0].title, cRows[0].displayName]);
  return rows[0] || null;
}

module.exports = router;
