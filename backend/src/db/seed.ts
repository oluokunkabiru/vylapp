// Adds demo content on top of the personas already seeded by schema.sql
// (Aisha, Marcus, Jade, Remi, Tanvi, Leon, Sena) — vibes, Spaces, and a
// known login password, so the backend is immediately demoable against
// the vylapp-instagram.jsx frontend without any manual data entry.
import { Pool } from "pg";
import env from "../config/env";
import crypto from "../utils/crypto";

const { hashPassword } = crypto;

const DEMO_PASSWORD = "VylappDemo123!";

const USERS = {
  aisha: "00000000-0000-0000-0001-000000000001",
  marcus: "00000000-0000-0000-0001-000000000002",
  jade: "00000000-0000-0000-0001-000000000003",
  remi: "00000000-0000-0000-0001-000000000004",
  tanvi: "00000000-0000-0000-0001-000000000005",
  leon: "00000000-0000-0000-0001-000000000006",
  sena: "00000000-0000-0000-0001-000000000007",
};

async function seed() {
  console.log("[seed] ── starting demo data seed ──────────────────────────────");
  const pool = new Pool({ connectionString: env.databaseUrl, ssl: env.pgSsl ? { rejectUnauthorized: false } : false });

  // schema.sql inserts these 7 personas, but only the very first time it runs
  // (migrate.ts tracks it in schema_migrations and never re-applies it) — if
  // they were later removed (e.g. via clear-demo-data.ts, or a hand-pruned
  // production DB), every persona-scoped insert below would FK-violate. Bail
  // out cleanly instead of crashing partway through.
  const { rows: personaCount } = await pool.query(
    `SELECT COUNT(*) FROM users WHERE id::text LIKE '00000000-0000-0000-0001-%'`
  );
  if (parseInt(personaCount[0].count, 10) === 0) {
    console.log("[seed] demo personas not found (schema.sql only inserts them once, and they may have since been removed) — skipping demo data seed entirely");
    console.log("[seed] ── demo data seed complete (skipped) ─────────────────");
    await pool.end();
    return;
  }

  console.log("[seed] setting known demo password for all seed personas ...");
  const hash = hashPassword(DEMO_PASSWORD);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id::text LIKE '00000000-0000-0000-0001-%'`, [hash]);

  // Demo personas' vibes/spaces have no natural unique key to ON CONFLICT
  // against, so idempotency is a plain existence check instead — this script
  // runs on every deploy/container start, and without this guard it would
  // insert a fresh set of duplicate demo vibes/Spaces every single time.
  const { rows: personaVibeCount } = await pool.query(
    `SELECT COUNT(*) FROM vibes WHERE user_id::text LIKE '00000000-0000-0000-0001-%'`
  );
  if (parseInt(personaVibeCount[0].count, 10) > 0) {
    console.log("[seed] demo vibes already exist, skipping");
  } else {
    console.log("[seed] inserting demo vibes ...");
    const vibes = [
      { user: USERS.aisha, cat: "TECH_VIBES", content: "Just open-sourced our community governance toolkit, built for Web3 DAOs but it works for any group making decisions together. Three months of building with Tech Vibers kept me accountable.", tags: ["opensource", "daos"], badge: "GLOBAL IMPACT" },
      { user: USERS.remi, cat: "GLOBAL_CONNECT", content: "We just reached 10,000 farmers using our AI crop advisory tool across 5 African countries. This idea started as a Global Connect thread 18 months ago.", tags: ["agritech", "africa"], badge: null },
      { user: USERS.jade, cat: "CREATIVE_LEARN", content: "Dropping a 12-piece generative art collection tonight, every piece reacts to real-time climate data. Preview at 9PM in the Creative Learn Space.", tags: ["genart", "climateart"], badge: null, event: { title: "AI x Climate Art — Collector Preview", time: "Tonight, 9PM" } },
      { user: USERS.tanvi, cat: "HUMAN_POTENTIAL", content: "Hot take: the best learning system is the one your community holds you accountable to. None of the apps worked until I started sharing weekly reviews.", tags: ["learning", "accountability"], badge: null },
    ];
    for (const v of vibes) {
      await pool.query(
        `INSERT INTO vibes (user_id, content, category, tags, impact_badge, event_title, event_time, likes_count, reposts_count, replies_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [v.user, v.content, v.cat, v.tags, v.badge, v.event?.title || null, v.event?.time || null,
         Math.floor(400 + Math.random() * 1800), Math.floor(50 + Math.random() * 400), Math.floor(20 + Math.random() * 300)]
      );
    }
  }

  const { rows: personaSpaceCount } = await pool.query(
    `SELECT COUNT(*) FROM spaces WHERE host_id::text LIKE '00000000-0000-0000-0001-%'`
  );
  if (parseInt(personaSpaceCount[0].count, 10) > 0) {
    console.log("[seed] demo Spaces already exist, skipping");
  } else {
    console.log("[seed] inserting demo Spaces ...");
    const spaces = [
      { host: USERS.leon, title: "Building Your Second Brain in 2026", cat: "HUMAN_POTENTIAL", status: "live", listeners: 1840 },
      { host: USERS.aisha, title: "Web3 DAO Governance, Deep Vibe", cat: "TECH_VIBES", status: "live", listeners: 423 },
      { host: USERS.jade, title: "AI Art & Climate Data Preview", cat: "CREATIVE_LEARN", status: "scheduled", listeners: 0 },
      { host: USERS.remi, title: "African AgriTech: Scale & Impact", cat: "GLOBAL_CONNECT", status: "scheduled", listeners: 0 },
    ];
    for (const s of spaces) {
      await pool.query(
        `INSERT INTO spaces (host_id, title, category, status, listeners_count, peak_listeners, started_at, scheduled_for)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
        [s.host, s.title, s.cat, s.status, s.listeners,
         s.status === "live" ? new Date() : null,
         s.status === "scheduled" ? new Date(Date.now() + 3600000) : null]
      );
    }
  }

  console.log("[seed] inserting demo Learn courses ...");
  await seedLearn(pool);

  console.log("[seed] marking Jade as a creator with a subscription tier ...");
  await pool.query(`UPDATE users SET is_creator = TRUE WHERE id = $1`, [USERS.jade]);
  await pool.query(
    `INSERT INTO creator_profiles (user_id, categories) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.jade, ["creative", "human"]]
  );
  await pool.query(
    `INSERT INTO creator_subscription_tiers (creator_id, name, description, price_usd, perks)
     VALUES ($1, 'Studio Circle', 'Early access to drops + monthly critique session', 8, $2)
     ON CONFLICT DO NOTHING`,
    [USERS.jade, ["Early access", "Monthly critique", "Discord access"]]
  );

  console.log(`[seed] done. Demo login password for any seed user: ${DEMO_PASSWORD}`);
  console.log("[seed] e.g. POST /auth/login { emailOrHandle: 'aisha.k', password: '" + DEMO_PASSWORD + "' }");
  console.log("[seed] ── demo data seed complete ───────────────────────────────");
  await pool.end();
}

// Seeds two demo courses so the Learn catalog isn't empty on first load.
// Skipped entirely if any course already exists — safe to re-run.
async function seedLearn(pool: Pool) {
  const { rows: existing } = await pool.query("SELECT COUNT(*) FROM courses");
  if (parseInt(existing[0].count, 10) > 0) {
    console.log("[seed] courses already exist, skipping Learn seed");
    return;
  }

  async function makeEducator(userId: string, bio: string, subjects: string[], status: string) {
    const { rows } = await pool.query(
      `INSERT INTO educator_profiles (user_id, bio, subjects, languages_taught, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio
       RETURNING id`,
      [userId, bio, subjects, ["en"], status]
    );
    return rows[0].id;
  }

  async function makeCourse(educatorId: string, title: string, description: string, category: string, tags: string[]) {
    const { rows } = await pool.query(
      `INSERT INTO courses (educator_id, title, description, category, language, difficulty, is_free, tags, status, published_at, estimated_hours)
       VALUES ($1,$2,$3,$4,'en','beginner',TRUE,$5,'published',NOW(),1.5) RETURNING id`,
      [educatorId, title, description, category, tags]
    );
    return rows[0].id;
  }

  async function makeLesson(courseId: string, title: string, type: string, content: unknown, sortOrder: number, isFreePreview: boolean, durationMinutes: number) {
    const { rows } = await pool.query(
      `INSERT INTO lessons (course_id, title, type, content, sort_order, is_free_preview, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [courseId, title, type, JSON.stringify(content), sortOrder, isFreePreview, durationMinutes]
    );
    return rows[0].id;
  }

  async function makeCheckpoint(lessonId: string, question: string, options: unknown, correctOption: string, explanation: string, sortOrder: number) {
    await pool.query(
      `INSERT INTO knowledge_checkpoints (lesson_id, question, options, correct_option, explanation, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [lessonId, question, JSON.stringify(options), correctOption, explanation, sortOrder]
    );
  }

  // ── Course 1: Remi (AgriTech) — verified educator ──────────────────────────
  const remiEducator = await makeEducator(
    USERS.remi,
    "Building AI crop advisory tools for smallholder farmers across West Africa. 10,000+ farmers and counting.",
    ["agriculture", "agritech"], "verified"
  );
  const soilCourse = await makeCourse(
    remiEducator,
    "Soil Science Fundamentals for West African Farmers",
    "A practical introduction to soil health, testing, and crop rotation, built from five years of fieldwork with smallholder farmers across five African nations. No lab equipment required.",
    "GLOBAL_CONNECT", ["agritech", "africa", "soil"]
  );
  await makeLesson(soilCourse, "Why soil health determines your yield", "video",
    { video_url: "https://example.com/videos/soil-intro.mp4", duration_seconds: 480 }, 0, true, 8);
  await makeLesson(soilCourse, "Reading your soil without a lab", "article",
    { body_html: "<p>You can learn most of what you need about your soil with a spade, a jar, and water. This lesson walks through the jar test, texture-by-feel, and the signs healthy soil gives off before you ever plant.</p>", read_time_minutes: 6 }, 1, false, 6);
  const soilQuiz = await makeLesson(soilCourse, "Check your understanding", "quiz",
    { instructions: "Two quick questions on what you just read." }, 2, false, 4);
  await makeCheckpoint(soilQuiz, "What does the jar test primarily reveal?",
    [{ id: "a", text: "Soil pH" }, { id: "b", text: "Soil texture (sand/silt/clay ratio)" }, { id: "c", text: "Nitrogen content" }],
    "b", "The jar test separates particles by weight as they settle, showing your sand/silt/clay ratio.", 0);
  await makeCheckpoint(soilQuiz, "Which is a visible sign of healthy soil?",
    [{ id: "a", text: "Earthworms present" }, { id: "b", text: "Bright red color" }, { id: "c", text: "Completely dry surface" }],
    "a", "Earthworm activity is a strong indicator of good soil structure and organic matter.", 1);

  // ── Course 2: Tanvi (Human Potential) — community educator ─────────────────
  const tanviEducator = await makeEducator(
    USERS.tanvi,
    "I write and teach about the systems that actually make learning stick — accountability over willpower.",
    ["learning", "habits"], "community"
  );
  const habitsCourse = await makeCourse(
    tanviEducator,
    "Building Learning Habits That Actually Stick",
    "Most learning apps have single-digit completion rates because they rely on willpower alone. This short course teaches the accountability structures that actually get people to finish what they start.",
    "HUMAN_POTENTIAL", ["learning", "accountability"]
  );
  await makeLesson(habitsCourse, "Why willpower-based learning fails", "video",
    { video_url: "https://example.com/videos/willpower.mp4", duration_seconds: 360 }, 0, true, 6);
  await makeLesson(habitsCourse, "Designing your accountability loop", "article",
    { body_html: "<p>A weekly public check-in, even to an audience of three people, outperforms almost every app-based streak mechanic. This lesson walks through how to set one up.</p>", read_time_minutes: 5 }, 1, false, 5);
  const habitsQuiz = await makeLesson(habitsCourse, "Check your understanding", "quiz",
    { instructions: "One question on what you just read." }, 2, false, 3);
  await makeCheckpoint(habitsQuiz, "What outperforms app-based streaks, per this lesson?",
    [{ id: "a", text: "A longer streak counter" }, { id: "b", text: "A weekly public check-in" }, { id: "c", text: "More notifications" }],
    "b", "Social accountability, even to a small audience, is the mechanism that actually works.", 0);

  await pool.query("UPDATE courses SET total_lessons = 3");
}

seed().catch(err => { console.error("[seed] failed:", err); process.exit(1); });
